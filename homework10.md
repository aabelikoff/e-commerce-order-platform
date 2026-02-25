# E-commerce Order Platform (Dockerized)

## What Was Added

- `Dockerfile` (multi-stage targets: `dev`, `build`, `prod`, `prod-distroless`)
- `compose.yml` (prod-like local stack)
- `compose.dev.yml` (dev override: hot reload + bind mount)
- `.dockerignore`
- `.env.example`
- Docker-based `migrate` / `seed` one-off job services
- `tsconfig.json` `watchOptions` for Docker Desktop file watching (Windows)

## Docker Targets

- `dev`: Nest dev runtime with watchers
- `build`: compiles TS to `dist`
- `prod`: minimal runtime on `node:20-slim`, non-root (`USER node`)
- `prod-distroless`: minimal distroless runtime, non-root (`:nonroot`)

## Prod-like Local Run (`compose.yml`)

Services:
- `api` (NestJS backend, `prod-distroless`)
- `postgres` (official `postgres:16`)
- `migrate` (one-off migrations job)
- `seed` (one-off seed job)

Notes:
- `postgres` is only on private `internal` network and has no published ports
- `api` is on `internal` + `public`
- `api` is published on `127.0.0.1:8080 -> 3001`

### Commands

1. Start DB

```bash
docker compose --env-file .env.production -f compose.yml up -d postgres
```

2. Run migrations

```bash
docker compose --env-file .env.production -f compose.yml run --rm migrate
```

3. Run seed

```bash
docker compose --env-file .env.production -f compose.yml run --rm seed
```

4. Start API

```bash
docker compose --env-file .env.production -f compose.yml up -d api
```

5. Check API

```bash
curl http://127.0.0.1:8080
curl http://127.0.0.1:8080/api/docs
curl http://127.0.0.1:8080/graphql
```

Shortcut (if DB is already initialized and migrations are not needed in this run):

```bash
docker compose --env-file .env.production -f compose.yml up --build
```

## Dev Run (`compose.dev.yml`)

`compose.dev.yml` is an override for `compose.yml`:
- switches `api` to Docker target `dev`
- runs `npm run start:dev`
- uses bind mount for project source
- keeps `node_modules` in container volume (`/app/node_modules`)
- adds MinIO + MinIO init for local file flow

### Command

```bash
docker compose --env-file .env.development -f compose.yml -f compose.dev.yml up --build
```

### Hot Reload Check

1. Start dev stack with the command above
2. Edit any file in `src/` (for example `src/payments/payments.service.ts`)
3. Verify API logs show recompilation/restart

## One-off Jobs

Run explicitly:

```bash
docker compose --env-file .env.production -f compose.yml run --rm migrate
docker compose --env-file .env.production -f compose.yml run --rm seed
```

These jobs use the `build` target (not `prod-distroless`) because migrations/seed require CLI/dev tooling (`typeorm-ts-node-commonjs`, `ts-node`).

## Image Build / Optimization Checks

### Build all targets

```bash
docker build --target dev -t ecommerse-api:dev .
docker build --target build -t ecommerse-api:build .
docker build --target prod -t ecommerse-api:prod .
docker build --target prod-distroless -t ecommerse-api:distroless .
```

### Compare image sizes

```bash
# run command
docker image ls | findstr ecommerse-api

# outcome
ecommerse-api  distroless  c3fbdb32d93b  42 seconds ago       447MB
ecommerse-api  prod        1da1fb6d4256  57 seconds ago       565MB
ecommerse-api  build       c11224d5c754  About a minute ago   917MB
ecommerse-api  dev         561f81e79269  About a minute ago   914MB
```

Expected pattern:
- `dev` / `build` are largest (devDependencies + sources)
- `prod` is smaller
- `prod-distroless` is smallest runtime

### Inspect layers

```bash
docker history ecommerse-api:prod
docker history ecommerse-api:distroless
```

What it shows:
- image layers and their sizes
- largest runtime layer is production `node_modules`
- `dist` layer is much smaller than dependencies
- `prod-distroless` runtime is smaller and has no shell/package manager

Short conclusion:
- `prod-distroless` is smaller because runtime contains only distroless Node base + production `node_modules` + `dist`
- it is safer because it runs non-root and has no shell/package manager in runtime image

## Non-root Verification

### `prod`

```bash
docker run --rm --entrypoint id ecommerse-api:prod

# outcome
uid=1000(node) gid=1000(node) groups=1000(node)
```

User is not root.

### `prod-distroless`

`id` utility is unavailable in distroless images. Non-root is guaranteed by base image:
- `gcr.io/distroless/nodejs20-debian12:nonroot`

## Environment Files

- `.env.example` - template only (no real secrets)
- `.env.production` - used for prod-like local compose runs
- `.env.development` - used for dev compose override

Important:
- inside containers DB host must be `postgres` (service name), not `localhost`
- in dev with MinIO, API endpoint should be `http://minio:9000`

## Verification Results (Summary)

- `compose.yml` prod-like stack runs (`api` + `postgres`)
- `postgres` is healthy and not exposed via `ports`
- `migrate` and `seed` run as one-off containers and exit successfully
- `api` is reachable on `127.0.0.1:8080`
- `compose.dev.yml` hot reload works with bind mount + polling watch options (Docker Desktop / Windows)
