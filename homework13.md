# Homework 13: gRPC Payments Service (Orders -> Payments)

## Goal

Practice end-to-end gRPC integration in NestJS:

- define and use `.proto` contract (`proto3`)
- run a dedicated gRPC server (`payments-service`) as a separate entrypoint/process
- connect gRPC client in `orders-service`
- apply real timeout/deadline from env/config

## Contract

Proto file:

- `proto/payments/v1/payments.proto`

Package/service:

- `package payments.v1`
- `service Payments`

Methods:

- `Authorize(AuthorizeRequest) returns (AuthorizeResponse)`
- `GetPaymentStatus(GetPaymentStatusRequest) returns (GetPaymentStatusResponse)`
- `Capture`, `Refund` are present (basic/stub behavior)

Generated TS contract:

- `src/generated/payments/v1/payments.ts`

## Payments Service

Dedicated gRPC server entrypoint:

- `src/payment-service/main.ts`

Module and handlers:

- `src/payment-service/payments.module.ts`
- `src/payment-service/payments.grpc.controller.ts`
- `src/payment-service/payments.service.ts`

Behavior:

- `Authorize` stores/reuses payment and returns `paymentId + status`
- `GetPaymentStatus` reads status from DB by `paymentId`
- payment status mapping is implemented in `src/payment-service/status.mapper.ts`

Storage:

- PostgreSQL (`payments` table)
- idempotency is supported via `idempotency_key`
- unique constraint: `(order_id, idempotency_key)`

Migration:

- `src/database/migrations/1773075005406-update-payments-idempotency-key.ts`

## Orders Service (gRPC Client)

Client registration:

- `src/orders/orders.module.ts` via `ClientsModule.registerAsync(...)`
- token constant: `PAYMENTS_GRPC_CLIENT`

Client usage:

- `src/orders/orders.service.ts`
- `ClientGrpc` -> `PaymentsClient`
- `Payments.Authorize(...)` is called in `create(...)` flow after order commit

No direct imports from `src/payment-service/*` are used in Orders; communication is through proto-generated contract/client.

## Timeout / Resilience

Timeout env/config:

- env key: `PAYMENTS_RPC_TIMEOUT_MS`
- config key: `paymentsServiceConfig.paymentsGrpcTimeoutMs`

Applied on client call:

- `authorize(...).pipe(timeout(paymentsTimeoutMs))`
- `lastValueFrom(...)`

HTTP mapping:

- timeout -> `504 Gateway Timeout`
- transport/grpc availability issues -> `503 Service Unavailable`

## Run (Docker)

```bash
docker compose --env-file .env.development -f compose.yml -f compose.dev.yml down -v --remove-orphans
docker compose --env-file .env.development -f compose.yml -f compose.dev.yml up -d --build
docker compose --env-file .env.development -f compose.yml -f compose.dev.yml exec api npm run migration:run
```

Useful logs:

```bash
docker compose --env-file .env.development -f compose.yml -f compose.dev.yml logs -f api payments-service
```

## Happy Path Check

1. Call Orders endpoint (`POST /api/v1/orders`).
2. Orders creates order and calls `Payments.Authorize`.
3. Response includes:
   - `order`
   - `payment.paymentId`
   - `payment.status`

## Timeout Check

1. Set very small timeout in `.env.development`, for example:
   - `PAYMENTS_RPC_TIMEOUT_MS=1`
2. Recreate `api` container.
3. Call `POST /api/v1/orders`.
4. Expected result: `504 Gateway Timeout` with message like `Payments service timeout`.

