# Homework Report

## 1. Hot Scenario

- Scenario: `POST /api/v1/orders`
- Why this scenario: it is a checkout-like hot path that directly affects user-perceived latency and touches DB writes, stock updates, outbox, queue processing, and payments integration
- Environment: local dev containers
- API URL: `http://localhost:8080`
- Load profile: 20 sequential requests
- Authenticated user: `alice@example.com`
- Request shape: 4 products, quantity `1` each, new UUID `Idempotency-Key` for every request

## 2. Baseline

Baseline was captured before the optimization changes on the same scenario.

Baseline latency:

- p50: `29.74 ms`
- p95: `77.11 ms`
- p99: `88.82 ms`
- throughput: `26.8 req/s`
- error rate: `0%`

Baseline resource snapshot:

- `orders_created_total`: `1 -> 21`
- `orders_failed_total`: `0 -> 0`
- `process_cpu_seconds_total`: `87.340034 -> 88.053713`
- CPU delta: about `+0.714 s`
- CPU per request: about `35.7 ms/request`
- `process_resident_memory_bytes`: `193159168 -> 196915200`
- memory delta: about `+3.58 MB`
- `nodejs_eventloop_lag_seconds`: `0.011052959 -> 0.001584242`

Note:

- before the baseline run, one manual warm-up request was executed to verify the scenario, so the baseline counters already contained one successful order

## 3. Bottleneck Search

### Initial hypothesis

The first hypothesis was that the main problem was extra synchronous DB work inside `OrdersService.create()`:

- totals were recalculated after inserts
- the order was fetched again after commit
- the request path did more local work than necessary

This hypothesis was partially correct, but measurements showed it was not the dominant end-to-end bottleneck.

### Confirmed bottleneck

The real bottleneck was the synchronous external dependency in the request path:

- `POST /api/v1/orders` waited for `payments.authorize()` over gRPC before responding
- the request path was blocked by remote service latency
- variability of the payments service amplified `p95` and `p99`

### Why this conclusion is data-driven

- Baseline had a visible tail: `p95` and `p99` were much worse than `p50`
- A first optimization that removed local DB round-trips did not produce a meaningful e2e improvement
- After moving payment authorization out of the synchronous request path, the same scenario improved measurably
- Direct timing logs were added around `payments.authorize()` so the external dependency can now be observed explicitly through `durationMs` and timeout outcomes in runtime logs

This sequence is important because the bottleneck conclusion was based on measurement, not intuition.

## 4. Implemented Changes

### Change 1: performance optimization

Reduced unnecessary DB work in [src/orders/orders.service.ts](./src/orders/orders.service.ts):

- totals are computed in memory from already loaded product prices
- the order is created immediately with final money fields
- extra aggregate SQL queries were removed
- extra post-commit order reload was removed

Purpose:

- reduce local round-trips and synchronous work in the hot path

### Change 2: cost/runtime optimization

Moved payment authorization out of the synchronous HTTP request path into [src/orders/orders-processor.consumer.ts](./src/orders/orders-processor.consumer.ts):

- `POST /api/v1/orders` now creates the order and writes `order.process_requested` into the outbox
- the worker consumes the message asynchronously
- the worker calls `payments.authorize()` and uses existing retry / DLQ behavior

Purpose:

- reduce time that the API instance spends blocked on remote I/O
- improve runtime efficiency of the API tier

## 5. Before / After

The final comparison below uses:

- baseline before optimization
- final optimized version after moving payment authorization to async worker

| Metric | Before | After | Comment |
| --- | ---: | ---: | --- |
| p50 latency | `29.74 ms` | `20.58 ms` | improved by about `30.8%` |
| p95 latency | `77.11 ms` | `63.09 ms` | improved by about `18.2%` |
| p99 latency | `88.82 ms` | `74.46 ms` | improved by about `16.2%` |
| Throughput | `26.8 req/s` | `27.34 req/s` | moderate improvement |
| Error rate | `0%` | `0%` | no regression |
| CPU delta | `+0.714 s` | `+0.586 s` | lower CPU time during test run |
| CPU per request | `35.7 ms/request` | `29.3 ms/request` | lower runtime cost per successful request |
| Memory delta | `+3.58 MB` | `+13.10 MB` | increased memory during optimized run |
| Event loop lag snapshot | `11.05 ms -> 1.58 ms` | `0 ms -> 4.48 ms` | snapshot metric, useful but less stable than latency |
| Created orders | `+20` | `+20` | same business throughput |
| Failed orders | `0` | `0` | same correctness |

## 6. Trade-Offs

The main improvement was removing synchronous payment authorization from the HTTP request path. This made order creation faster and reduced tail latency because the API no longer waits for a remote payments dependency before responding. The trade-off is eventual consistency: `POST /api/v1/orders` now confirms order creation, but payment completion happens later in the worker. This improves runtime efficiency, but it changes the client contract because payment status is no longer available immediately in the same response. The system also becomes more operationally dependent on queue health, worker retries, and observability around asynchronous processing. In production, I would monitor queue backlog, retry count, DLQ volume, payment processing latency, and the ratio between created orders and successfully processed orders. I would also track order states over time to detect stuck orders. Economically, the new approach is better because the API tier spends less expensive request-time compute waiting on network-bound work and can serve more useful traffic with the same runtime budget.

## 7. Reproducibility

Load test flow used for both baseline and final measurement:

1. Authenticate as `alice@example.com`
2. Get `userId`
3. Use 4 products with available stock
4. Send 20 sequential `POST /api/v1/orders` requests
5. Capture `p50`, `p95`, `p99`, throughput, error rate, CPU, memory, and event loop lag from `/metrics`

Clean setup note:

- the payment seed now writes `idempotencyKey`, so the seed is compatible with the `payments.idempotency_key NOT NULL` migration
- timing logs around `payments.authorize()` can be used as direct runtime evidence for the external dependency cost

Saved evidence:

- [grafana-after-optimization.png](./performance-homework/grafana-after-optimization.png)
- [baseline-capture-before-optimization.txt](./performance-homework/baseline-capture-before-optimization.txt)
- [after-capture-optimized.txt](./performance-homework/after-capture-optimized.txt)
