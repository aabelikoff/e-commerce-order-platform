# TLS / Transport Security Note

## Purpose

This note describes the intended transport security posture of the service:

- where TLS terminates
- which traffic is public
- which traffic is internal
- what is trusted only because of network placement

---

## Public and Internal Surfaces

### Public-facing surfaces

These surfaces should be considered public or edge-exposed:

- REST API
- Swagger UI
- GraphQL endpoint
- any browser-accessed stage / production hostnames

### Internal-only surfaces

These surfaces should be treated as internal:

- Postgres
- RabbitMQ
- Kafka broker internal listener
- internal service-to-service Docker network traffic
- internal compose networks used by stage / production stacks

### Trusted by network placement

Some traffic is trusted only because it is restricted to internal networks and deploy topology:

- app to database
- app to RabbitMQ
- app to Kafka
- app to internal payments service

This is weaker than end-to-end mutual TLS and should be documented as a current constraint, not as a perfect security model.

---

## Current Intended TLS Design

### TLS termination

The intended production model is:

- TLS terminates at the edge reverse proxy / ingress / load balancer
- the application container itself serves HTTP behind that trusted edge

This means:

- client -> edge is HTTPS
- edge -> app may remain HTTP inside a controlled internal network

### Redirect policy

Intended policy:

- public HTTP should redirect to HTTPS at the edge
- the application should assume secure transport is enforced by reverse proxy / ingress configuration

### Local development

Current local development runs over plain HTTP on localhost for convenience.

This is acceptable only for local development and must not be treated as production transport posture.

---

## Current Stage / Production Assumptions

Stage and production deployment use separate docker compose stacks and environment-specific configuration.

Transport assumptions:

- public entry is expected to be protected by HTTPS at the external edge
- internal traffic relies on isolated Docker networks and host/network placement
- app-level trust in forwarded client metadata must only exist when traffic comes through a trusted proxy

---

## Reverse Proxy / Trusted Proxy Posture

If the service is placed behind reverse proxy or ingress:

- client IP should come from trusted forwarded headers only when proxy trust is explicitly configured
- rate limiting must use the real client IP, not just container or proxy IP
- HTTP -> HTTPS redirect should be handled by the edge

Backlog:

- document or configure explicit trusted proxy behavior in Nest/Express
- verify security controls that depend on client IP

---

## TLS Posture by Traffic Class

### Public traffic

- must use HTTPS
- should be redirected from HTTP to HTTPS at the edge
- includes auth flows and any bearer-token protected API traffic

### Internal service traffic

- currently trusted mainly through private network placement
- should not be publicly routable
- future hardening may include service-to-service TLS where platform permits

### Admin / operational access

- should only happen over HTTPS through trusted access paths
- Swagger or other operational surfaces should be restricted by environment policy where needed

---

## Minimum Secure Baseline

The minimum acceptable transport baseline for this service is:

- HTTPS enforced at the public edge
- no plaintext public auth traffic in stage/production
- internal services not exposed beyond required host ports
- proxy/client-IP trust configured intentionally, not implicitly
- transport design documented so rate limiting and auth assumptions are correct

---

## Target Production State

Target production transport model:

1. edge reverse proxy or ingress terminates TLS
2. valid certificates are managed at the edge
3. HTTP is redirected to HTTPS
4. internal services remain on private network paths
5. forwarded headers are trusted only from known proxy layers

Optional future improvements:

- mTLS for internal service-to-service traffic
- restricted Swagger exposure in production
- WAF / edge abuse controls

---

## Verification Pointers

Evidence to attach or collect:

- reverse proxy / ingress config
- deployment manifest showing intended public port exposure
- response samples proving security headers are present
- documentation showing which traffic classes are public vs internal
