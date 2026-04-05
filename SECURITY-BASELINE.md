# SECURITY-BASELINE

## Service Overview

This project is a modular NestJS backend for an e-commerce order platform.

Main exposed surfaces:

- REST API under `/api/v1/*`
- GraphQL endpoint under `/graphql`
- Swagger UI under `/api/docs`
- WebSocket realtime orders gateway
- internal gRPC payments service
- Kafka / RabbitMQ based async integration flows

Core business modules:

- `auth`
- `users`
- `products`
- `orders`
- `payments`
- `files`

The goal of this baseline is to document the current security posture, identify the highest-risk gaps, and turn security review findings into a concrete engineering backlog.

---

## Risky Surface Areas

| Surface area | Main risk | Existing control | Gap before hardening | Planned / required control |
| --- | --- | --- | --- | --- |
| `POST /api/v1/auth/login` | brute force, credential stuffing, auth probing | JWT auth exists after successful login | no dedicated throttling, no audit trail for failed login attempts | strict rate limit, audit event for login failures, generic auth failure response |
| `GET /api/v1/users` | unauthorized data access | JWT + roles/access guard | no abuse protection baseline, no explicit audit trail for sensitive reads | global throttling, security headers, optional audit for privileged access |
| `PATCH /api/v1/orders/:id/status` | privilege escalation, manual override abuse | admin role required | no dedicated throttling, no structured audit event | stricter throttling, audit log for manual status override |
| `POST /api/v1/orders/:orderId/pay` | payment abuse, replay, burst attempts | JWT + custom pay guard | no dedicated throttling, no explicit audit trail | stricter throttling, audit event for payment action |
| `/graphql` | schema abuse, over-querying, authenticated data exposure | JWT guard on order resolvers | no GraphQL-specific abuse controls documented | baseline throttling / edge controls, schema hardening backlog |
| `/api/docs` | reconnaissance | available documentation surface | no explicit production exposure policy documented | document environment exposure policy, optionally restrict in prod |
| WebSocket auth | token misuse, subscription abuse | JWT verification in gateway | no explicit abuse/rate-limit baseline documented | backlog: connection/message throttling and audit for suspicious events |
| secrets in config/runtime | credential leakage | env-based config, GitHub environment secrets in CI/CD | current state not formally documented as security policy | formal secret flow note, no-log policy, rotation strategy |
| transport / TLS | MITM, credential/token exposure | deployment flow exists | TLS termination posture not documented as a baseline | document edge TLS, HTTPS redirect expectation, internal traffic assumptions |

---

## Security Review by Category

## 1. Authentication / Session / JWT

### What already exists

- JWT access token authentication is implemented.
- `JwtStrategy` extracts bearer tokens from the `Authorization` header.
- login is handled through the auth module and signed JWTs.
- request validation uses Nest validation pipes with whitelist and forbidden extra fields.

### Risk that remained

- login endpoint is a high-risk brute-force surface.
- there is no documented login failure audit trail.
- refresh/session lifecycle strategy is not documented as a security control.
- there is no explicit secret rotation playbook for JWT signing material.

### What is added in this homework

- this baseline documents login as a first-class risky surface.
- JWT secret management and rotation become explicit backlog items instead of implicit assumptions.
- auth abuse protection is promoted to a required engineering task.

### Backlog / TODO

- add strict rate limiting for `POST /api/v1/auth/login`
- add structured audit events for `auth.login_failed`
- document or implement refresh-token / revoke strategy
- move toward secret rotation-friendly JWT key management for production

---

## 2. Access Control / Roles / Scopes

### What already exists

- role- and scope-based access control is present.
- custom decorators and `AccessGuard` enforce required roles/scopes.
- sensitive endpoints already use guards, for example:
  - orders read/write
  - users list restricted to admin/support
  - payment actions protected by dedicated guard logic

### Risk that remained

- access control exists, but privileged actions are not yet backed by audit logs.
- abuse of legitimate privileged access is harder to investigate without audit trail.
- some sensitive reads and writes rely on code-level guards only, without explicit security documentation.

### What is added in this homework

- privileged surfaces are now explicitly mapped in the baseline.
- risk-to-control mapping is documented for admin writes and payment actions.

### Backlog / TODO

- add audit logging for manual admin actions
- add evidence for deny paths and abuse protection
- review GraphQL mutations/queries for equivalent scope enforcement

---

## 3. Secrets Management

### What already exists

- the project uses environment-based configuration for auth, DB, Kafka, RabbitMQ, S3, and payments settings.
- local/dev/stage/prod environment separation already exists through different env files and deployment flow.
- GitHub Actions stage/prod deployments use GitHub environment secrets such as `STAGE_ENV_FILE` and `PRODUCTION_ENV_FILE`.

### Risk that remained

- `.env` is a delivery mechanism, not a complete secrets strategy.
- secret handling rules are not yet documented as security policy.
- some config defaults are developer-friendly and must not be treated as production-safe values.
- no formal rotation strategy is documented for JWT, DB, or integration credentials.

### What is added in this homework

- secrets management is explicitly included in the security baseline.
- current state vs target production state is now part of the security review.

### Backlog / TODO

- document current runtime secret flow in a dedicated note
- explicitly define no-log rules for secrets and tokens
- document rotation strategy for:
  - JWT signing secret / key
  - database credentials
  - payment or infrastructure integration secrets
- define production target state:
  - GitHub environment secrets for CI/CD
  - host/platform secret injection at deploy time
  - no secrets committed into repo or image layers

---

## 4. Transport Security / TLS

### What already exists

- the service has separate deployment manifests for stage and production.
- public and internal services are already separated conceptually in docker compose networks.
- stage/prod deployment flows are defined in CI/CD.

### Risk that remained

- TLS termination posture is not documented as a baseline.
- there is no explicit architecture note saying where HTTPS terminates.
- no formal statement exists for what traffic is public, internal, or trusted only by network placement.

### What is added in this homework

- transport security becomes an explicit security review category.
- intended TLS design is recognized as required documentation, not an optional future improvement.

### Backlog / TODO

- add a transport/TLS note that states:
  - where TLS terminates
  - whether HTTP to HTTPS redirect happens on the edge
  - which traffic is public vs internal
- document trusted proxy expectations and forwarded IP handling
- define production edge policy for Swagger / GraphQL exposure

---

## 5. Input Surface / Abuse Protection

### What already exists

- DTO validation is enabled globally with `whitelist`, `forbidNonWhitelisted`, and transformation.
- cursor pagination and typed filters reduce some malformed-input risk on list endpoints.
- guards already reduce exposure of many write endpoints.

### Risk that remained

- there is no application-level rate limiting baseline.
- all API traffic is currently treated roughly the same from an abuse-protection perspective.
- high-risk endpoints such as login, payment actions, and admin writes need stricter throttling than general reads.

### What is added in this homework

- abuse protection is now defined as a required baseline area.
- requirement is explicit: at least two throttling policies must exist.

### Backlog / TODO

- add a global throttling policy
- add stricter throttling for:
  - login
  - payment actions
  - admin status changes
- verify client IP behavior behind reverse proxy / edge
- optionally add GraphQL-specific query abuse controls

---

## 6. Logging / Auditability

### What already exists

- request logging with `requestId`, method, path, status code, and latency already exists.
- exception filters include `requestId` in error responses/logging path.
- the project already has structured-ish request logging and correlation capability.

### Risk that remained

- request logs are not the same as audit logs.
- there is no dedicated audit event schema for critical security-sensitive actions.
- privileged writes and suspicious auth/payment events are not yet captured as security audit trail.
- legacy `console.log` usage still exists in some places and should be reviewed for sensitive data exposure.

### What is added in this homework

- audit logging is now defined as a distinct baseline requirement.
- minimum audit event schema is identified:
  - `action`
  - `actorId`
  - `actorRole` / scopes
  - `targetType`
  - `targetId`
  - `outcome`
  - `timestamp`
  - `correlationId` / `requestId`

### Backlog / TODO

- implement audit logging service / sink
- add audit events at minimum for:
  - `auth.login_failed`
  - `order.status_override`
  - `payment action`
- ensure audit logs do not contain:
  - raw JWT
  - passwords
  - secrets
  - full sensitive payment payloads

---

## Current Secure-by-Default Rules

These rules already apply or should be treated as immediate policy:

- no secrets in source code
- no secrets in git
- no passwords or raw JWTs in logs
- validate and whitelist request DTOs
- enforce roles/scopes on privileged routes
- keep environment-specific config separated
- treat Swagger, GraphQL, and realtime endpoints as security-relevant surfaces

---

## Planned Changes in This Security Homework

The intended hardening scope for this homework is:

1. add `SECURITY-BASELINE.md`
2. add security headers baseline
3. add throttling in at least two modes:
   - global baseline
   - stricter risk-endpoint policy
4. add audit logging for at least three critical events
5. document secrets management flow and rotation strategy
6. document transport / TLS posture
7. provide evidence that:
   - headers are present
   - rate limiting triggers
   - audit logging works

---

## Evidence Mapping

Planned evidence files:

- `security-evidence/headers.txt`
- `security-evidence/rate-limit.txt`
- `security-evidence/audit-log-example.txt`
- `security-evidence/secret-flow-note.md`
- `security-evidence/tls-note.md`

This baseline should reference those files once the implementation and verification steps are completed.

---

## Residual Risk / Backlog Summary

The most important backlog items after this baseline review are:

- dedicated rate limiting for auth and critical write endpoints
- security headers baseline for API/Swagger/GraphQL exposure
- structured audit logging for privileged and suspicious actions
- documented production-grade secret rotation strategy
- documented TLS termination and proxy trust model
- review and cleanup of any legacy `console.log` usage on sensitive paths
- optional advanced controls:
  - anomaly detection
  - captcha / bot defense on login
  - GraphQL cost/depth limits
  - webhook verification for external payment flows

---

## Short Summary

Before hardening, the project already had solid foundations in auth, guards, typed config, and request logging, but it lacked a formal security baseline around abuse protection, security headers, auditability, and documented secrets/TLS posture.

This file turns those gaps into a concrete engineering plan and defines the minimum controls that must be added to establish a usable security baseline for the service.
