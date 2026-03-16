# Homework 13: gRPC Payments Extraction (Orders -> Payments)

## Goal

Implemented and verified:

- `.proto` contract (`proto3`) for Payments
- dedicated NestJS gRPC server as separate process/entrypoint (`payments-service`)
- gRPC client integration in Orders service
- client timeout/deadline from env (`PAYMENTS_RPC_TIMEOUT_MS`)
- one end-to-end happy path: `Orders -> Payments.Authorize -> paymentId/status`

## 1) Contract

Proto:

- `proto/payments/v1/payments.proto`

Contains:

- `service Payments`
- `Authorize`
- `GetPaymentStatus`
- `Capture`
- `Refund`

Main request/response fields:

- `AuthorizeRequest`: `orderId`, `userId`, `total.amount`, `total.currency`, `idempotencyKey`
- `AuthorizeResponse`: `paymentId`, `status`
- `GetPaymentStatusRequest`: `paymentId`
- `GetPaymentStatusResponse`: `paymentId`, `status`, `orderId`

Generated types/client:

- `src/generated/payments/v1/payments.ts`

## 2) payments-service (gRPC server)

Entrypoint:

- `src/payment-service/main.ts`

Module/controller/service:

- `src/payment-service/payments.module.ts`
- `src/payment-service/payments.grpc.controller.ts`
- `src/payment-service/payments.service.ts`

Implemented behavior:

- `Authorize`: creates or reuses payment by `(orderId, idempotencyKey)`
- `GetPaymentStatus`: reads real status from DB
- `Capture`: updates status to captured (`PAID` in DB mapping) and sets `paidAt`
- `Refund`: basic status transition logic

Status mapping:

- `src/payment-service/status.mapper.ts`

Persistence:

- PostgreSQL table `payments`
- uniqueness: `UQ_payments_order_id_idempotency_key`

Migration:

- `src/database/migrations/1773075005406-update-payments-idempotency-key.ts`

## 3) orders-service (gRPC client)

Client setup:

- `src/orders/orders.module.ts` (`ClientsModule.registerAsync`)
- token: `PAYMENTS_GRPC_CLIENT`
- contract connection via `proto/payments/v1/payments.proto`

Usage in flow:

- `src/orders/orders.service.ts`
- in `create(...)`: call `Payments.Authorize`
- timeout applied with `lastValueFrom(...pipe(timeout(paymentsTimeoutMs)))`

Important boundary:

- Orders does not import implementation code from `src/payment-service/*`
- integration is done only through proto-generated contract/client

## 4) Timeout / resilience

Config:

- env: `PAYMENTS_RPC_TIMEOUT_MS`
- typed config: `paymentsServiceConfig.paymentsGrpcTimeoutMs`

Error mapping in Orders:

- timeout -> `504 Gateway Timeout` (`Payments service timeout`)
- gRPC transport/unavailable -> `503 Service Unavailable`

## 5) Extra payment flow in API (`POST /api/v1/orders/:orderId/pay`)

Files:

- `src/payments/payments.controller.ts`
- `src/payments/payments.service.ts`

Behavior:

- finds authorized payment for order (or authorizes if missing)
- captures payment through gRPC
- repeat call is idempotent for already paid order

## 6) How to run locally

```bash
npm run docker:dev
docker compose --env-file .env.development -f compose.yml -f compose.dev.yml exec api npm run migration:run
```

Useful logs:

```bash
docker compose --env-file .env.development -f compose.yml -f compose.dev.yml logs -f api payments-service
```

## 7) Happy path verification

Postman collection:

- `postman/rest_payments_grpc_collection.custom.json`

Collection checks:

1. login (`/api/v1/auth/login`)
2. resolve current user (`/api/v1/auth/me`)
3. create order (`POST /api/v1/orders`) -> includes payment authorization result
4. pay order (`POST /api/v1/orders/:orderId/pay`) -> capture success (`status=PAID`, `paidAt != null`)
5. repeat pay call -> idempotent behavior

## 8) Timeout verification

1. Set in `.env.development`: `PAYMENTS_RPC_TIMEOUT_MS=1`
2. Recreate `api` container
3. Call `POST /api/v1/orders`
4. Expected: `504` response (`Payments service timeout`)
