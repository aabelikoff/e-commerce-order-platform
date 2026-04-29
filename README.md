## Description

This project is a backend application built with NestJS.  
The main goal of the project is to demonstrate a clean, well-structured, and scalable backend architecture that follows modern industry best practices.

# Table of Contents

- [Architectural Vision](#architectural-vision)
- [Overall Architecture](#overall-architecture)
- [Project Structure](#project-structure)
- [Requirements](#requirements)
- [Project Setup](#project-setup)
- [Environment Variables](#environment-variables)
- [Local Docker Quick Start](#local-docker-quick-start)
- [Compile and Run the Project](#compile-and-run-the-project)
- [Cursor Pagination](#cursor-pagination)
- [Security Baseline](#security-baseline)
- [Health and Metrics](#health-and-metrics)
- [Monitoring](#monitoring)
- [Tracing](#tracing)
- [Run Tests](#run-tests)
- [CI/CD](#cicd)
- [Deployment](#deployment)
- [Deployed Stage](#deployed-stage)
- [Docker / Containers](#docker--containers)
- [(RabbitMQ + Outbox)](#rabbitmq--outbox)
- [gRPC Payments Service](#grpc-payments-service)
- [Kafka Event Streams](#kafka-event-streams)
- [Stay in Touch](#stay-in-touch)
- [License](#license)

## Architectural Vision

The architecture is designed with a focus on:

- modularity
- clear separation of responsibilities
- centralized and typed configuration
- maintainability and future scalability

---

## Overall Architecture

The application follows a modular architecture.

Each major business domain is implemented as an isolated module:

- `users`
- `products`
- `orders`
- `payments`
- `auth`
- `notifications`
- `reportings`

This design allows each domain to evolve independently while maintaining clear boundaries between different areas of responsibility.

---

## Project Structure

```text
src/
 |- auth/
 |- common/
 |- config/
 |- database/
 |- files/
 |- generated/
 |- graphql/
 |- health/
 |- kafka/
 |- metrics/
 |- notifications/
 |- orders/
 |- outbox/
 |- payment-service/
 |- payments/
 |- products/
 |- rabbitmq/
 |- realtime/
 |- reportings/
 |- users/
 |- app.module.ts
 `- main.ts

proto/
 `- payments/v1/payments.proto

test/
 |- app.e2e-spec.ts
 |- auth.e2e-spec.ts
 |- orders.e2e-spec.ts
 `- realtime-orders.gateway.e2e-spec.ts
```

### Structure explanation

### Domain modules

Each domain module encapsulates its own business logic and typically contains controllers, services, DTOs, and entities.  
This follows the Single Responsibility Principle and improves readability and maintainability.

---

Core domain modules: `users`, `products`, `orders`, `payments`

Platform/support modules: `auth`, `files`, `realtime`, `rabbitmq`, `outbox`, `kafka`, `health`, `metrics`, `notifications`, `reportings`

Dedicated gRPC microservice module: `payment-service` (separate entrypoint for Payments gRPC server)

Configuration layer: the `config` directory contains centralized and strongly typed application configuration.

Persistence layer: `database` contains TypeORM entities, migrations, seeders, and data-source configuration.

GraphQL layer: `graphql` contains resolvers, models, loaders, and GraphQL-specific services.

Shared layer: `common` contains reusable filters, guards, interceptors, decorators, DTOs, pagination helpers, audit helpers, and problem-detail types.

---

## Architecture Overview

The application is organized around one main NestJS API plus a dedicated gRPC payments service.

Primary runtime flow:

1. client sends HTTP request to the API
2. request passes validation, authentication, and access control
3. domain service executes business logic
4. state is stored in PostgreSQL
5. follow-up async work is persisted to the outbox table
6. outbox relay publishes events to RabbitMQ and Kafka
7. payment orchestration delegates to the internal gRPC `payments-service`
8. health, metrics, logs, and traces expose runtime observability

Main runtime components:

- `api` - main NestJS HTTP backend
- `payments-service` - separate NestJS gRPC service
- `postgres` - primary relational database
- `rabbitmq` - async queue transport
- `kafka` - event stream transport
- `minio` - S3-compatible object storage
- `grafana` / `prometheus` / `loki` / `promtail` - observability stack

Architecture sketch:

```text
Client
  -> NestJS API
     -> PostgreSQL
     -> Outbox table
     -> RabbitMQ
     -> Kafka
     -> gRPC payments-service
     -> MinIO

Observability:
  API / payments-service -> logs -> Promtail -> Loki -> Grafana
  API -> /metrics -> Prometheus -> Grafana
```

---

## Requirements

- Node.js v24.13.0 for local development and CI, matching `.nvmrc`
- npm
- optional: use project Node version via `.nvmrc`

```bash
nvm use
```

Docker images currently use Node 20 based runtime images (`node:20-slim` and `gcr.io/distroless/nodejs20-debian12`) through the multi-stage `Dockerfile`.

## Project Setup

```bash
npm install
```

## Environment Variables

Use `.env.example` as a template for local environment files:

- `.env.production` for prod-like Docker compose run
- `.env.development` for dev Docker compose run

Important:

- inside Docker containers DB host must be `postgres` (service name), not `localhost`
- in dev with MinIO, S3 endpoint should be `http://minio:9000`

Example (`.env.example`):

```env
# Application Port
PORT=3001

SEED_ENABLED=false
NODE_ENV=development
# allowed values: development | stage | production

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=db-user
DB_PASSWORD=db-password
DB_NAME=db-name

# Auth Configuration
JWT_ACCESS_SECRET=jwt_access_secret
JWT_REFRESH_SECRET=jwt_refresh_secret
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

# Throttling Configuration
THROTTLE_DEFAULT_TTL_MS=60000
THROTTLE_DEFAULT_LIMIT=100
THROTTLE_AUTH_TTL_MS=60000
THROTTLE_AUTH_LIMIT=5
THROTTLE_PAYMENTS_TTL_MS=60000
THROTTLE_PAYMENTS_LIMIT=5
THROTTLE_ADMIN_WRITES_TTL_MS=60000
THROTTLE_ADMIN_WRITES_LIMIT=10

# Bucket Configuration
AWS_REGION=eu-central-1
AWS_S3_BUCKET=ecommerce-files-private
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_S3_ENDPOINT=http://localhost:9000
AWS_S3_FORCE_PATH_STYLE=true
AWS_CLOUDFRONT_URL=
FILES_PRESIGN_EXPIRES_IN_SEC=900

# RabbitMQ & Outbox Configuration
RABBITMQ_URL=amqp://guest:guest@localhost:5673
RABBITMQ_PREFETCH=1
RABBITMQ_MAX_ATTEMPTS=3
RABBITMQ_RETRY_DELAY_MS=5000
OUTBOX_RELAY_INTERVAL_MS=1000
OUTBOX_RELAY_BATCH_SIZE=50

# Kafka Configuration
KAFKA_ENABLED=true
KAFKA_BROKERS=localhost:9094
KAFKA_CLIENT_ID=ecommerce-order-api
KAFKA_TOPIC_PARTITIONS=3
KAFKA_TOPIC_ORDERS_EVENTS=orders.events
KAFKA_ORDERS_ANALYTICS_GROUP_ID=orders-analytics
KAFKA_ORDERS_CRM_GROUP_ID=orders-crm
KAFKA_TOPIC_PAYMENTS_EVENTS=payments.events
KAFKA_PAYMENTS_ANALYTICS_GROUP_ID=payments-analytics
KAFKA_PAYMENTS_AUDIT_GROUP_ID=payments-audit

# Payments gRPC Configuration
PAYMENTS_GRPC_URL=localhost:5021
PAYMENTS_GRPC_BIND_URL=0.0.0.0:5021
PAYMENTS_RPC_TIMEOUT_MS=2500

# Tracing Configuration
OTEL_ENABLED=false
OTEL_DIAGNOSTICS_ENABLED=false
OTEL_SERVICE_NAME=ecommerce-service
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
```

## Local Docker Quick Start


1. Create local env files from the template:

```bash
cp .env.example .env.development
cp .env.example .env.production
```

2. Start the local stack:

```bash
npm run docker:dev
```

3. Verify containers:

```bash
npm run docker:dev:status
```

4. Open the main local endpoints:

- API docs: `http://localhost:8080/api/docs`
- Health: `http://localhost:8080/health`
- GraphQL: `http://localhost:8080/graphql`
- RabbitMQ UI: `http://localhost:15673`
- MinIO console: `http://localhost:9001`
- Kafka UI: `http://localhost:18080`

5. Follow API logs if needed:

```bash
npm run docker:dev:logs
```

Recommended local demo flow:

1. `POST /api/v1/auth/login`
2. `GET /api/v1/auth/me`
3. `PATCH /api/v1/auth/me`
4. `POST /api/v1/orders` with `Authorization: Bearer <token>` and `Idempotency-Key: <unique-key>`
5. `GET /api/v1/orders`
6. `POST /api/v1/orders/:orderId/pay`
7. `GET /api/v1/orders/:id`

## Compile and Run the Project

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

## Cursor Pagination

The project uses cursor-based pagination for list endpoints where stable forward-only navigation is needed.

Current REST endpoints with cursor pagination:

- `GET /api/v1/orders`
- `GET /api/v1/users`
- `GET /api/v1/products`

Request format:

- `limit` - number of records to return
- `cursor` - opaque cursor from the previous response

Example:

```http
GET /api/v1/users?limit=10
GET /api/v1/users?limit=10&cursor=eyJpZCI6Ii4uLiIsImNyZWF0ZWRBdCI6Ii4uLiJ9
```

Response format:

```json
{
  "data": {
    "items": [],
    "pagination": {
      "hasNext": true,
      "nextCursor": "opaque-cursor"
    }
  }
}
```

Notes:

- cursors are opaque and must be treated as a black box by clients
- pagination is forward-only and uses `createdAt DESC, id DESC` as a stable ordering
- clients should pass back `pagination.nextCursor` to request the next page
- when `hasNext` is `false`, the client has reached the end of the collection
- invalid or malformed cursors return `400 Bad Request`

## Security Baseline

The project includes a minimal application security baseline focused on the highest-risk surfaces:

- auth / access control
- secrets handling
- transport / TLS posture
- abuse protection with rate limiting
- security headers
- auditability backlog

Implemented hardening in code:

- `helmet` is enabled in [src/main.ts](./src/main.ts) as the HTTP security headers baseline
- `@nestjs/throttler` is enabled globally through a custom app throttler guard
- risk endpoints use stricter throttling than ordinary API traffic
- throttling settings are configured via typed env-driven config, not hardcoded directly in module bootstrap
- named throttling policies are selected through custom decorators instead of repeating numeric limits in controllers
- structured audit logging is implemented for selected security-sensitive events

Current throttling environment variables:

- `THROTTLE_DEFAULT_TTL_MS`
- `THROTTLE_DEFAULT_LIMIT`
- `THROTTLE_AUTH_TTL_MS`
- `THROTTLE_AUTH_LIMIT`
- `THROTTLE_PAYMENTS_TTL_MS`
- `THROTTLE_PAYMENTS_LIMIT`
- `THROTTLE_ADMIN_WRITES_TTL_MS`
- `THROTTLE_ADMIN_WRITES_LIMIT`

Current route coverage:

- global baseline policy for ordinary API traffic
- stricter policy for `POST /api/v1/auth/login` via `@AuthThrottle()`
- stricter policy for `POST /api/v1/orders/:orderId/pay` via `@PaymentsThrottle()`
- stricter policy for `PATCH /api/v1/orders/:id/status` via `@AdminWritesThrottle()`

Current audit event coverage:

- `auth.login_failed`
- `payment.capture_requested`
- `order.status_override`

Implementation details:

- policy values live in `throttling` config and are resolved from environment variables
- the global guard applies the `default` policy to ordinary routes
- handlers can opt into named policies semantically through custom decorators:
  - `@AuthThrottle()`
  - `@PaymentsThrottle()`
  - `@AdminWritesThrottle()`

Documentation:

- [SECURITY-BASELINE.md](./SECURITY-BASELINE.md)
- [security-evidence/audit-log-example.txt](./security-evidence/audit-log-example.txt)
- [security-evidence/secret-flow-note.md](./security-evidence/secret-flow-note.md)
- [security-evidence/tls-note.md](./security-evidence/tls-note.md)

## Health and Metrics

Service endpoints:

- `GET /health`
- `GET /ready`
- `GET /metrics`

Notes:

- `/health` returns a simple liveness response
- `/ready` verifies database access and TCP connectivity to the payments gRPC service
- `/metrics` returns Prometheus text format with HTTP and business metrics

## Monitoring

Prometheus and Grafana can be used on top of `/metrics` to visualize request rate, latency, business counters, and default Node.js process metrics.

The local monitoring stack also includes Loki + Promtail for container log collection.

Local monitoring:

- `npm run monitoring:up`
- `Prometheus`: `http://localhost:9090`
- `Loki`: `http://localhost:3100`
- `Grafana`: `http://localhost:3000`
- Grafana default credentials: `admin / admin`

Local log collection notes:

- Promtail tails Docker container logs for `api` and `payments-service`
- Grafana Explore can query Loki logs for request logs and audit logs
- current reliable audit search pattern is raw JSON search, for example:
  - `{compose_service="api"} |= "\"logType\":\"audit\""`
  - `{compose_service="api"} |= "\"action\":\"auth.login_failed\""`
  - `{compose_service="api"} |= "\"action\":\"payment.capture_requested\""`
  - `{compose_service="api"} |= "\"action\":\"order.status_override\""`

Stage and production monitoring:

- `npm run monitoring:stage:up`
- `npm run monitoring:prod:up`
- stage Prometheus scrapes internal target `api:3001`
- prod Prometheus scrapes internal target `api:3001`

Monitoring and logging evidence:

- request/audit log example: [security-evidence/audit-log-example.txt](./security-evidence/audit-log-example.txt)
- monitoring compose for stage: [deploy/compose.monitoring.stage.yml](./deploy/compose.monitoring.stage.yml)
- local metrics endpoint: `http://localhost:8080/metrics`
- local Grafana: `http://localhost:3000`
- local Prometheus: `http://localhost:9090`
- stage metrics endpoint: `http://167.235.66.16:8082/metrics`
- stage Grafana: `http://167.235.66.16:3002`
- stage Prometheus: `http://167.235.66.16:9091`

- prepared screenshot set is stored in [`evidence/screenshots`](./evidence/screenshots):
  - `01-stage-health.png`
  - `02-stage-swagger.png`
  - `03-stage-metrics.png`
  - `04-grafana-loki-audit-logs.png`
  - `05-prometheus-up-stage.png`
  - `06-github-actions-pipeline.png`

## Tracing

Jaeger can be used to inspect distributed traces for the API and payments service.

Local tracing:

- `npm run tracing:up`
- `Jaeger`: `http://localhost:16686`
- `npm run tracing:logs`

In development Docker compose, traces are exported over OTLP HTTP to Jaeger for:

- `ecommerce-order-api`
- `ecommerce-payments-service`

Stage and production tracing can also be enabled through environment variables without code changes:

- `OTEL_ENABLED=true`
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=<collector-or-jaeger-otlp-http-endpoint>`
- `OTEL_DIAGNOSTICS_ENABLED=false`

In `stage` and `production`, tracing is disabled by default and can be turned on when a collector endpoint is available.

## Run Tests

```bash
# unit tests
npm run test

# CI unit/integration suite
npm run test:unit:ci

# e2e tests
npm run test:e2e

# CI full suite (unit/integration + e2e)
npm run test:ci

# test coverage
npm run test:cov
```

Current automated coverage includes:

- unit tests for core services and controllers
- integration tests for `orders + outbox` and `payments + publisher`
- e2e tests for `auth`, `orders`, and realtime subscriptions

## CI/CD

This project includes a GitHub Actions based CI/CD pipeline with separate flows for pull requests, stage deployment, and production deployment.

### PR validation

Workflow:

- [`.github/workflows/pr-checks.yml`](./.github/workflows/pr-checks.yml)

Purpose:

- run lint checks
- run CI-focused automated tests
- validate Docker build on every pull request

This workflow helps prevent broken code from being merged into long-lived branches.

### Build and Stage flow

Workflow:

- [`.github/workflows/build-and-stage.yml`](./.github/workflows/build-and-stage.yml)

Trigger:

- push to `develop`

What it does:

1. checks out the repository
2. builds a production Docker image from [`Dockerfile`](./Dockerfile)
3. pushes the image to GitHub Container Registry (`ghcr.io`)
4. creates a release manifest with commit, image, and digest
5. uploads deploy artifacts for downstream jobs
6. deploys the exact same built image to the `stage` environment
7. runs a smoke check against `http://127.0.0.1:8082/api/docs`

Important properties:

- the image is built once and reused later
- stage deploy uses an immutable image reference with digest
- deploy is executed on a `self-hosted` runner
- stage configuration is injected from `STAGE_ENV_FILE`

Stage compose file:

- [`deploy/compose.stage.yml`](./deploy/compose.stage.yml)

### Production flow

Workflow:

- [`.github/workflows/deploy-prod.yml`](./.github/workflows/deploy-prod.yml)

Trigger:

- push to `main`

What it does:

1. finds the latest successful `Build and Stage` run from `develop`
2. downloads the release manifest and production deploy files from that successful staged release
3. resolves image metadata from the manifest
4. waits for manual approval in GitHub `production` environment
5. pulls the exact same immutable image by digest
6. deploys the production stack
7. runs a smoke check against `http://127.0.0.1:8081/api/docs`

Important properties:

- production does not rebuild the image
- production promotes the same artifact that already passed stage
- approval is enforced through GitHub Environment protection rules
- production configuration is injected from `PRODUCTION_ENV_FILE`

Production compose file:

- [`deploy/compose.prod.yml`](./deploy/compose.prod.yml)

### Environments and secrets

Configured GitHub Environments:

- `stage`
- `production`

Expected secrets:

- `STAGE_ENV_FILE`
- `PRODUCTION_ENV_FILE`

### Deployment target

Both deploy workflows run on a `self-hosted` GitHub Actions runner.

This is required because the deployment target must keep running after the workflow job finishes. GitHub-hosted runners are ephemeral, so they are suitable for build/test jobs but not for a persistent stage or production runtime.

Pipeline evidence:

- pull request verification workflow: [`.github/workflows/pr-checks.yml`](./.github/workflows/pr-checks.yml)
- build + stage deployment workflow: [`.github/workflows/build-and-stage.yml`](./.github/workflows/build-and-stage.yml)
- production promotion workflow: [`.github/workflows/deploy-prod.yml`](./.github/workflows/deploy-prod.yml)
- a passing GitHub Actions run can be used as the final pipeline proof artifact

## Deployment

Project deployment details are environment-specific.

## Deployed Stage

The project is deployed to an external stage environment and can be used for demo checks.

Public stage endpoints:

- `Health`: `http://167.235.66.16:8082/health`
- `Swagger`: `http://167.235.66.16:8082/api/docs`
- `Metrics`: `http://167.235.66.16:8082/metrics`
- `Grafana`: `http://167.235.66.16:3002`
- `Prometheus`: `http://167.235.66.16:9091`

Notes:

- the stage stack is deployed on an external VPS with Docker Compose
- the API is available on port `8082`
- the stage monitoring stack is exposed separately through Grafana and Prometheus
- this stage instance is intended for external verification and demo of the main business flow

## Docker / Containers

This project includes a Docker-based workflow for both prod-like local runs and dev hot reload.

### Docker Files

- `Dockerfile` (multi-stage targets: `dev`, `build`, `prod`, `prod-distroless`)
- `compose.yml` (prod-like local stack)
- `compose.dev.yml` (dev override with hot reload + bind mount)
- `.dockerignore`
- `payments-service` runs as a separate container/process in both prod-like and dev compose

### Prod-like Run (`compose.yml`)

Services:

- `api` (NestJS backend, `prod-distroless`)
- `payments-service` (NestJS gRPC server, `prod-distroless`)
- `postgres` (official `postgres:16`)
- `rabbitmq` (official `rabbitmq:3-management`)
- `migrate` (one-off migrations job)
- `seed` (one-off seed job)
- `kafka` + `kafka-init` (topic bootstrap for `orders.events`, `payments.events`)

Notes:

- `postgres` is attached to the `internal` and `public` compose networks and is published locally as `5445 -> 5432`
- `api` is published as `127.0.0.1:8080 -> 3001`
- `payments-service` is published as `127.0.0.1:5021 -> 5021`
- `rabbitmq` is published as `5673 -> 5672` and `15673 -> 15672`
- `kafka` is published as `9094 -> 9094`

Run step-by-step:

```bash
docker compose --env-file .env.production -f compose.yml up -d postgres
docker compose --env-file .env.production -f compose.yml run --rm migrate
docker compose --env-file .env.production -f compose.yml run --rm seed
docker compose --env-file .env.production -f compose.yml up -d api
```

Quick start (if DB is already initialized and migrations are not needed):

```bash
docker compose --env-file .env.production -f compose.yml up --build
```

Check API:

```bash
curl http://127.0.0.1:8080
curl http://127.0.0.1:8080/api/docs
curl http://127.0.0.1:8080/graphql
```

Check Payments gRPC port:

```bash
nc -z 127.0.0.1 5021
```

### Dev Run (`compose.dev.yml`)

`compose.dev.yml` overrides `compose.yml` and:

- keeps `migrate` and `seed` aligned with `.env.development`
- switches `api` to Docker target `dev`
- switches `payments-service` to Docker target `dev`
- runs `npm run start:dev`
- runs `npm run start:payments:dev`
- uses bind mount for source code
- keeps `/app/node_modules` in a container volume (so bind mount does not break dependencies)
- adds MinIO + `minio-init` for local file-flow development
- adds `kafka-init` to auto-create required topics
- makes `api` and `payments-service` wait for the one-off `migrate` job to complete successfully before startup

Run dev stack:

```bash
docker compose --env-file .env.development -f compose.yml -f compose.dev.yml up --build
```

Or use npm scripts:

```bash
npm run docker:dev
npm run docker:dev:status
npm run docker:dev:logs
```

If the stack was already running before compose changes or before a new migration was added, recreate it:

```bash
docker compose --env-file .env.development -f compose.yml -f compose.dev.yml down
docker compose --env-file .env.development -f compose.yml -f compose.dev.yml up -d --build
```

Hot reload check:

1. Start the dev stack
2. Edit any file in `src/` (for example `src/payments/payments.service.ts`)
3. Verify `api` logs show recompilation / restart

### One-off Jobs

```bash
docker compose --env-file .env.production -f compose.yml run --rm migrate
docker compose --env-file .env.production -f compose.yml run --rm seed
```

`migrate` and `seed` use the `build` target (not `prod-distroless`) because they require CLI/dev tooling (`typeorm-ts-node-commonjs`, `ts-node`).

In the dev stack these services still exist as one-off jobs, but `api` and `payments-service` now explicitly wait for `migrate` to finish first, which avoids startup races around schema-dependent features such as the outbox relay.

### Docker Scripts (Dev Stack)

The project includes helper scripts in `package.json` for the dev compose stack:

```bash
npm run docker:dev      # up -d --build (compose.yml + compose.dev.yml)
npm run docker:dev:status   # show containers status
npm run docker:dev:logs     # follow api logs
npm run docker:dev:stop     # stop containers (keep containers and data)
npm run docker:dev:start    # start previously stopped containers
npm run docker:dev:down     # stop and remove containers/networks
npm run docker:dev:restart  # full restart (down + up -d --build)
```

### Docker Image Builds / Optimization Proof

Build targets:

```bash
docker build --target dev -t ecommerse-api:dev .
docker build --target build -t ecommerse-api:build .
docker build --target prod -t ecommerse-api:prod .
docker build --target prod-distroless -t ecommerse-api:distroless .
```

### Compose Notes

- Use `--env-file .env.production` / `--env-file .env.development` in compose commands so `${...}` values are substituted correctly.
- The prod-like local compose file publishes Postgres on `5445`, RabbitMQ on `5673` / `15673`, Kafka on `9094`, API on `8080`, and the payments gRPC service on `5021`.
- For local verification, prefer the `compose.dev.yml` flow described in `Local Docker Quick Start`.

## RabbitMQ + Outbox

Quick local run:

```bash
npm run docker:dev
npm run docker:dev:status
```

RabbitMQ management UI:

- `http://localhost:15673` (`guest/guest`)

Useful logs command:

```bash
docker compose --env-file .env.development -f compose.yml -f compose.dev.yml logs api --tail=200
```

Implemented in this area:

- RabbitMQ topology (`orders.exchange`, `orders.process`, `orders.dlq`)
- Orders worker with manual ack
- Retry with limit and DLQ
- Idempotent processing via `processed_messages`
- Outbox Pattern (`outbox_events` + relay)

## gRPC Payments Service

Implemented in this area:

- dedicated `payments-service` with separate NestJS entrypoint (`src/payment-service/main.ts`)
- `.proto` contract at `proto/payments/v1/payments.proto`
- async orders worker gRPC call to `Payments.Authorize`
- `payments` module gRPC call to `Payments.Capture` for explicit pay requests
- timeout on Orders / Payments -> Payments gRPC calls from env/config (`PAYMENTS_RPC_TIMEOUT_MS`)
- order creation stores the order and enqueues payment authorization through the outbox/worker flow instead of waiting for the remote payments dependency in the HTTP request path

### gRPC Quick Check

Run stack:

```bash
npm run docker:dev
npm run docker:dev:status
```

Run migrations inside API container:

```bash
docker compose --env-file .env.development -f compose.yml -f compose.dev.yml exec api npm run migration:run
```

Postman collection for E2E check:

- `postman/rest_payments_grpc_collection.custom.json`

What this collection verifies:

- login + auth context (`/api/v1/auth/login`, `/api/v1/auth/me`)
- order creation (`POST /api/v1/orders`) with `Idempotency-Key` and async payment authorization queued through outbox/worker processing
- order payment (`POST /api/v1/orders/:orderId/pay`) with gRPC `Payments.Capture`
- repeat payment call idempotency (same paid payment is returned)
- `paidAt` is set after capture

Audit logging Postman collection:

- `postman/rest_audit_logging_collection.custom.json`

What this collection verifies:

- failed login produces `auth.login_failed`
- Bob payment flow triggers `payment.capture_requested`
- admin manual status change triggers `order.status_override`
- tokens and target order IDs are stored in collection variables automatically for sequential runs

Timeout check:

1. Set `PAYMENTS_RPC_TIMEOUT_MS=1` in `.env.development`.
2. Recreate `api` container.
3. Call `POST /api/v1/orders` with a valid `Idempotency-Key`.
4. Expected result: order creation still returns from the API path, while the async worker logs the payment authorization timeout and applies the existing retry / DLQ behavior.

## Kafka Event Streams

Kafka is used in this project as an event-streaming layer for domain events.

Current domain streams:

- `orders` domain:
  - topic: `KAFKA_TOPIC_ORDERS_EVENTS`
  - key strategy: `orderId` (preserves per-order ordering)
  - consumers: `OrdersAnalyticsConsumer`, `OrdersCrmConsumer`

- `payments` domain:
  - topic: `KAFKA_TOPIC_PAYMENTS_EVENTS`
  - key strategy: `orderId`
  - producer: `PaymentsEventsPublisher`
  - consumers: `PaymentsAnalyticsConsumer`, `PaymentsAuditConsumer`

Runtime behavior:

- Kafka settings (topics, brokers, group IDs) are configured through typed `kafka` config and environment variables.
- `orders` flow publishes `order.process_requested` through Outbox Relay for worker processing and order lifecycle events for stream consumers.
- `payments` flow publishes payment lifecycle events from the payments service.
- Consumer implementations are lightweight and currently focused on stream validation/processing logs.

This setup keeps operational processing in RabbitMQ and uses Kafka for domain event streaming across modules.

## Stay in Touch

- Author - [Oleksii Bielikov](https://www.linkedin.com/in/oleksii-bielikov/)

## License

This repository is currently private and marked as `UNLICENSED` in `package.json`.
