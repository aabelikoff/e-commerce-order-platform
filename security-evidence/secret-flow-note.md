# Secret Flow Note

## Purpose

This note describes where secrets live, how they reach runtime, what must never be logged, and what the current vs target production secret-delivery model is.

---

## Secret Types Used by the Service

Main secret categories in the project:

- JWT signing secrets
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`
- database credentials
  - `DB_USER`
  - `DB_PASSWORD`
- object storage / S3 credentials
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
- infrastructure / integration secrets
  - RabbitMQ URL
  - future payment provider or webhook verification keys

---

## Current Secret Location

### Local development

Current local/dev secret delivery is environment-file based:

- `.env.development`
- optionally `.env.stage`
- `.env.production`

Those values are loaded through application config and docker compose env-file injection.

### CI/CD and deploy environments

For stage and production, the current deployment flow uses GitHub Environments and GitHub Actions secrets:

- `STAGE_ENV_FILE`
- `PRODUCTION_ENV_FILE`

Those secrets are written to runtime env files during deployment workflows and then passed into docker compose.

---

## How Secrets Reach Runtime

### Local / dev flow

1. developer provides local env file
2. docker compose starts containers with `--env-file`
3. Nest config reads values from environment variables
4. modules consume typed config in runtime

### Stage / production flow

1. deploy workflow reads GitHub Environment secret
2. workflow writes `.env.stage` or `.env.production`
3. docker compose uses that env file
4. application containers receive secrets as environment variables
5. app config resolves secrets from `process.env`

---

## What Must Never Be Logged

The following values must not appear in application logs, audit logs, CI logs, or error payloads:

- raw JWT access tokens
- raw JWT refresh tokens
- passwords
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- database passwords
- S3 / storage secret keys
- payment provider secrets
- full sensitive payment payloads

Safe logging rule:

- log metadata, not secret values
- log identifiers, not credentials
- log outcome and request correlation, not secret-bearing payloads

Examples:

- acceptable: `auth.login_failed`, `actorId`, `ip`, `requestId`
- unacceptable: bearer token, password, secret env content

---

## Current Safe Variant

The current acceptable baseline for this project is:

- secrets are supplied via environment variables
- repository code does not hardcode runtime secrets
- deploy secrets are injected from GitHub Environments
- environment separation exists for local, stage, and production
- secrets must be excluded from logs and debugging output

Important limitation:

- `.env` files are a delivery mechanism, not a full production secret-management strategy

---

## Target Production State

Target production secret handling should be:

- secrets stored outside the repository
- secrets delivered by deployment platform or secret manager
- secrets injected at runtime, not baked into source or image layers
- least-privilege distribution by environment
- clear rotation and revocation process

Acceptable production target options:

- GitHub Environment secrets + self-hosted deploy host secret injection
- cloud secret manager
- Kubernetes Secrets / external secret operator
- host-level encrypted secret store

---

## Rotation Strategy

### JWT signing secret / key

Current minimum:

- change env secret and redeploy service

Production target:

- key rotation procedure with overlap window
- support for phased token rollover where possible
- emergency revoke / forced re-login plan

### Database credentials

Current minimum:

- update DB credential
- update environment secret
- redeploy affected services

Production target:

- periodic credential rotation
- separate credentials per environment
- least-privilege DB account for application runtime

### Integration secrets

Examples:

- storage credentials
- future payment provider API key
- webhook verification secret

Current minimum:

- rotate in secret source
- redeploy services using the secret

Production target:

- dedicated owner per secret
- documented rotation frequency
- emergency rotation procedure after suspected leakage

---

## Backlog / TODO

- verify no secret-like values are emitted through legacy `console.log`
- add explicit secret-redaction policy for audit logs
- document secret ownership and rotation interval
- move toward production secret delivery that does not depend on plaintext env files on long-lived hosts

---

## Verification Pointers

Evidence to attach or validate:

- workflow snippets showing GitHub Environment secret injection
- config code showing env-based resolution
- sanitized logs proving secrets are not printed
- deployment notes for local / stage / production separation
