# Homework 12: RabbitMQ Order Processing with Outbox Pattern

## Goal

Build a reliable asynchronous order processing workflow:

- API accepts `POST /orders` quickly.
- Heavy processing is handled by a worker.
- Retries are controlled and limited.
- Failed messages after retry limit go to DLQ.
- Consumer is idempotent.
- Producer reliability is improved with Outbox Pattern.

## Tech Stack

- NestJS + TypeScript
- PostgreSQL
- RabbitMQ (`rabbitmq:3-management`)
- Docker Compose

## Run

```bash
npm run docker:dev
```

or

```bash
docker compose --env-file .env.development -f compose.yml -f compose.dev.yml up -d --build
```

Status:

```bash
npm run docker:status
```

Stop:

```bash
npm run docker:stop
```

Useful URLs:

- API: `http://localhost:8080`
- RabbitMQ UI: `http://localhost:15673` (`guest/guest`)

## RabbitMQ Topology

Topology is asserted in `RabbitmqService.assertInfrastructure()`.

- Exchange: `orders.exchange` (`direct`, durable)
- Queue: `orders.process` (durable)
- Queue: `orders.dlq` (durable)
- Binding: `orders.process` <- `orders.exchange` with routing key `orders.process`
- Binding: `orders.dlq` <- `orders.exchange` with routing key `orders.dlq`

## Message Contracts

### OrdersProcessMessage

```json
{
  "messageId": "uuid",
  "orderId": "uuid",
  "createdAt": "ISO date",
  "attempt": 1,
  "simulate": "alwaysFail"
}
```

- `simulate` is optional and used only for retry/DLQ demonstration.

### OrdersDlqMessage

```json
{
  "messageId": "uuid",
  "orderId": "uuid",
  "createdAt": "ISO date",
  "attempt": 3,
  "failedAt": "ISO date",
  "errorReason": "string"
}
```

## Producer Flow (Orders API + Outbox)

Endpoint: `POST /api/v1/orders`

`OrdersService.create()`:

1. Starts DB transaction.
2. Creates order with status `pending`.
3. Creates outbox event in `outbox_events` with status `pending`.
4. Commits transaction.
5. Returns HTTP response immediately.

Important: API does not publish directly to RabbitMQ inside request flow anymore. RabbitMQ publishing is delegated to Outbox Relay.

## Outbox Pattern

### outbox_events table

Columns:

- `id` uuid PK
- `aggregate_type` varchar
- `aggregate_id` uuid
- `event_type` varchar
- `payload` jsonb
- `status` enum: `pending | processing | sent | failed`
- `attempts` int
- `next_retry_at` timestamptz nullable
- `last_error` text nullable
- `sent_at` timestamptz nullable
- `created_at`, `updated_at`

### Outbox Relay

`OutboxRelayService` runs on interval:

1. Claims batch with transaction and `FOR UPDATE SKIP LOCKED`.
2. Publishes each event payload to RabbitMQ (`orders.exchange` / `orders.process`).
3. On success: marks event as `sent`, sets `sent_at`.
4. On failure: increments attempts, sets `failed`, calculates `next_retry_at`, stores `last_error`.

This removes the "DB commit succeeded but publish failed" gap in synchronous producer flow.

## Consumer Flow

`OrdersProcessorConsumer`:

- Uses manual ack (`noAck: false`).
- Processes inside transaction.
- Commits DB changes first, then acknowledges message.

Flow:

1. Receive message from `orders.process`.
2. Start DB transaction.
3. Idempotency insert into `processed_messages`.
4. If duplicate: commit + ack + stop.
5. If new: business processing (`orders.status = processed`, set `processed_at`).
6. Commit.
7. Ack.

## Retry + DLQ Strategy

Implemented strategy: **republish + ack**.

Config:

- `RABBITMQ_MAX_ATTEMPTS=3`
- `RABBITMQ_RETRY_DELAY_MS=5000`

Failure behavior:

- if `attempt < maxAttempts`: wait backoff, republish with `attempt + 1`, ack original.
- if `attempt >= maxAttempts`: publish to `orders.dlq`, ack original.

## Idempotency

Table: `processed_messages`

- `message_id` has unique constraint.

Algorithm in consumer transaction:

- `INSERT ... ON CONFLICT (message_id) DO NOTHING RETURNING id`
- if no returned row: duplicate delivery, commit + ack without side effects.
- if inserted: continue normal processing.

Safe with parallel workers because uniqueness is enforced by DB.

## Logging

Worker logs include:

- `messageId`
- `orderId`
- `attempt`
- `result`: `success | retry | dlq | duplicate`
- short error reason for `retry`/`dlq`

## Demonstration Checklist

### 1. Happy Path

1. Call `POST /api/v1/orders`.
2. Verify order transitions from `pending` to `processed`.
3. Verify `processed_messages` row is created.
4. Verify log line `result=success`.

### 2. Retry

1. Send message with `simulate: "alwaysFail"`.
2. Verify logs:
   - `result=retry ... attempt=1`
   - `result=retry ... attempt=2`

### 3. DLQ

1. After max attempts, verify:
   - log `result=dlq ... attempt=3`
   - message appears in `orders.dlq`.

### 4. Idempotency

1. Republish already successful `messageId` manually.
2. Verify log `result=duplicate`.
3. Verify no duplicate side effects and no extra `processed_messages` row for same `messageId`.

## Commands Used for Verification

API logs:

```bash
docker compose --env-file .env.development -f compose.yml -f compose.dev.yml logs api --tail=200
```

Outbox state:

```sql
SELECT status, attempts, sent_at, last_error
FROM outbox_events
ORDER BY created_at DESC
LIMIT 10;
```

## Result

All required acceptance criteria for Homework 12 are implemented:

- `orders.process` and `orders.dlq`
- asynchronous API + worker
- manual ack and transactional flow
- bounded retry + DLQ
- idempotent consumer
- documented topology and reproducible scenarios

Plus bonus:

- Outbox Pattern + relay for safer producer delivery.
