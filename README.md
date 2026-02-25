## Description

This project is a training backend application built with NestJS.  
The main goal of the project is to demonstrate a clean, well-structured, and scalable backend architecture that follows modern industry best practices.

# Table of Contents

- [Architectural Vision](#architectural-vision)
- [Overall Architecture](#overall-architecture)
- [Project Structure](#project-structure)
- [Requirements](#requirements)
- [Project Setup](#project-setup)
- [Environment Variables](#environment-variables)
- [Compile and Run the Project](#compile-and-run-the-project)
- [Run Tests](#run-tests)
- [Deployment](#deployment)
- [Docker / Containers](#docker--containers)
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
- `profiles`
- `notifications`
- `reportings`

This design allows each domain to evolve independently while maintaining clear boundaries between different areas of responsibility.

---

## Project Structure

```text
src/
 |- auth/
 |- users/
 |- orders/
 |- payments/
 |- products/
 |- profiles/
 |- notifications/
 |- reportings/
 |- config/
 |- app.module.ts
 `- main.ts

test/
 `- app.e2e-spec.ts
```

### Structure explanation

### Domain modules

Each domain module encapsulates its own business logic and typically contains controllers, services, DTOs, and entities.  
This follows the Single Responsibility Principle and improves readability and maintainability.

---

Core domain modules: `users`, `products`, `orders`, `payments`

Isolated modules: `auth`, `profiles`, `notifications`, `reportings`

Configuration layer: the `config` directory contains centralized and strongly typed application configuration.

---

## Requirements

- Node.js v22.14.0
- npm
- optional: use project Node version via `.nvmrc`

```bash
nvm use
```

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
JWT_REFRESH_TTl=30d

# Bucket Configuration
AWS_REGION=eu-central-1
AWS_S3_BUCKET=ecommerce-files-private
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_S3_ENDPOINT=http://localhost:9000
AWS_S3_FORCE_PATH_STYLE=true
AWS_CLOUDFRONT_URL=
FILES_PRESIGN_EXPIRES_IN_SEC=900
```

## Compile and Run the Project

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

## Run Tests

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

## Deployment

Project deployment details are environment-specific.

## Docker / Containers

This project includes a Docker-based workflow for both prod-like local runs and dev hot reload.

### Docker Files

- `Dockerfile` (multi-stage targets: `dev`, `build`, `prod`, `prod-distroless`)
- `compose.yml` (prod-like local stack)
- `compose.dev.yml` (dev override with hot reload + bind mount)
- `.dockerignore`

### Prod-like Run (`compose.yml`)

Services:
- `api` (NestJS backend, `prod-distroless`)
- `postgres` (official `postgres:16`)
- `migrate` (one-off migrations job)
- `seed` (one-off seed job)

Notes:
- `postgres` is only on private `internal` network and is not exposed
- `api` is published as `127.0.0.1:8080 -> 3001`

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

### Dev Run (`compose.dev.yml`)

`compose.dev.yml` overrides `compose.yml` and:
- switches `api` to Docker target `dev`
- runs `npm run start:dev`
- uses bind mount for source code
- keeps `/app/node_modules` in a container volume (so bind mount does not break dependencies)
- adds MinIO + `minio-init` for local file-flow development

Run dev stack:

```bash
docker compose --env-file .env.development -f compose.yml -f compose.dev.yml up --build
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
- `postgres` is intentionally not published to host (`no ports:` in `compose.yml`).

## Stay in Touch

- Author - [Oleksii Bielikov](https://www.linkedin.com/in/oleksii-bielikov/)

## License

MIT licensed.
