# Homework 12: RabbitMQ Order Processing Queue

## Goal

Build a reliable async order processing workflow with RabbitMQ:

- API accepts orders quickly.
- Heavy processing is done by a worker.
- Retry with attempt limit is implemented.
- Messages that exceed retry limit go to DLQ.
- Worker is idempotent (no duplicate side effects).

## Stack

- NestJS + TypeScript
- PostgreSQL
- RabbitMQ (`rabbitmq:3-management`)
- Docker Compose

## Run

```bash
docker compose --env-file .env.development -f compose.yml -f compose.dev.yml up -d --build
OR
npm run docker:dev
```

Check status:

```bash
docker compose --env-file .env.development -f compose.yml -f compose.dev.yml ps
OR
npm run docker:status
```

Stop:

```bash
docker compose --env-file .env.development -f compose.yml -f compose.dev.yml down
OR
npm run docker:stop
```

URLs:

- API: `http://localhost:8080`
- RabbitMQ UI: `http://localhost:15673` (`guest/guest`)

## RabbitMQ Config

Environment variables:

- `RABBITMQ_URL`
- `RABBITMQ_PREFETCH`
- `RABBITMQ_MAX_ATTEMPTS`
- `RABBITMQ_RETRY_DELAY_MS`

## Topology

Topology is created programmatically in `RabbitmqService.assertInfrastructure()`.

- Exchange: `orders.exchange` (`direct`, durable)
- Queue: `orders.process` (durable)
- Queue: `orders.dlq` (durable)
- Binding: `orders.process` <- `orders.exchange` by routing key `orders.process`
- Binding: `orders.dlq` <- `orders.exchange` by routing key `orders.dlq`

How to verify in RabbitMQ UI:

1. Open `Exchanges` and check `orders.exchange`.
2. Open `Queues and Streams` and check `orders.process` and `orders.dlq`.
3. Open queue details and verify bindings.

## Producer (Orders API)

Endpoint: `POST http://localhost:8080/api/v1/orders` (local run)

Behavior:

1. Create order in DB with status `pending`.
2. After DB commit, publish message to `orders.exchange` with routing key `orders.process`.

Message format (`OrdersProcessMessage`):

```json
{
  "messageId": "uuid",
  "orderId": "uuid",
  "createdAt": "ISO datetime",
  "attempt": 1,
  "simulate": "alwaysFail"
}
```

`simulate` is optional and used only for retry/DLQ demo.

## Worker (Consumer)

Consumer: `OrdersProcessorConsumer`

Requirements implemented:

- Manual ack (`noAck: false`)
- Transactional DB processing
- Ack after processing decision

Processing flow:

1. Receive message from `orders.process`.
2. Start DB transaction.
3. Run idempotency check (`processed_messages`).
4. Run business update (`orders.status = processed`, set `processed_at`).
5. Commit transaction.
6. Ack message.

## Retry and DLQ

Implemented strategy: `republish + ack`.

Policy:

- `maxAttempts = 3`
- Delay between retries: exponential backoff based on `RABBITMQ_RETRY_DELAY_MS`
- After limit, publish to `orders.dlq`

Failure flow:

- If `attempt < maxAttempts`: republish to `orders.process` with `attempt + 1`, then ack original message.
- If `attempt >= maxAttempts`: publish to `orders.dlq`, then ack original message.

DLQ payload format (`OrdersDlqMessage`):

```json
{
  "messageId": "uuid",
  "orderId": "uuid",
  "createdAt": "ISO datetime",
  "attempt": 3,
  "failedAt": "ISO datetime",
  "errorReason": "string"
}
```

## Idempotency

Table: `processed_messages`

Columns:

- `id` (uuid, PK)
- `message_id` (uuid, UNIQUE)
- `order_id` (uuid, FK -> `orders.id`)
- `handler` (varchar)
- `processed_at` (timestamptz)

Algorithm:

1. In transaction run:
   `INSERT ... ON CONFLICT (message_id) DO NOTHING RETURNING id`
2. If no row is returned, message is duplicate delivery.
3. For duplicate message: commit + ack + return without repeating side effects.

Race safety is guaranteed by DB unique constraint on `message_id`.

## Logging

Worker logs include:

- `messageId`
- `orderId`
- `attempt`
- result: `success | retry | dlq | duplicate`
- short error reason for retry/dlq

## Demo Scenarios

### 1) Happy path

1. Send `POST  http://localhost:8080/api/v1/orders` (local run).
2. Verify:
   - initially `orders.status = pending`
   - then `orders.status = processed`, `processed_at` is not null
3. Verify row in `processed_messages`.
4. Verify worker log contains `result=success`.

### 2) Retry

1. Enable failure simulation (`simulate: "alwaysFail"`).
2. Create order.
3. Verify worker logs contain `result=retry` for attempts 1 and 2.

### 3) DLQ

1. After attempt 3 failure, message goes to `orders.dlq`.
2. In RabbitMQ UI, use `Get messages` on `orders.dlq`.
3. Verify payload contains `errorReason` and expected ids.
4. Verify worker log contains `result=dlq`.

### 4) Idempotency

1. Take a previously processed `messageId`.
2. Manually publish same message again to `orders.exchange` with routing key `orders.process`.
3. Verify worker log contains `result=duplicate`.
4. Verify `processed_messages` row count for that `messageId` remains `1`.

## Notes

- Producer currently logs publish errors after DB commit.
- For production-grade delivery guarantee, add Outbox Pattern.
