# Baseline Metrics

## Scenario

- Hot scenario: `POST /api/v1/orders`
- Environment: local dev containers
- API URL: `http://localhost:8080`
- Load profile: 20 sequential requests
- Authenticated user: `alice@example.com`
- Order shape: 4 items per request
- Idempotency: new UUID `Idempotency-Key` for each request

## Note About Baseline Capture

Before the main baseline run, one manual successful `POST /api/v1/orders` request was executed to verify that the scenario worked correctly.

Because of that, the baseline counters below should be interpreted as:

- before load: warm application state with 1 successful order already created
- after load: state after 20 additional successful order-create requests

## Baseline Latency And Throughput

- p50 latency: `29.74 ms`
- p95 latency: `77.11 ms`
- p99 latency: `88.82 ms`
- throughput: `26.8 req/s`
- error rate: `0%`

## Raw Baseline Per-Request Results

| Request | Latency ms | Status | OK |
|---|---:|---:|---|
| 1 | 88.82 | 201 | true |
| 2 | 35.80 | 201 | true |
| 3 | 30.32 | 201 | true |
| 4 | 29.32 | 201 | true |
| 5 | 28.58 | 201 | true |
| 6 | 27.09 | 201 | true |
| 7 | 27.06 | 201 | true |
| 8 | 33.45 | 201 | true |
| 9 | 32.77 | 201 | true |
| 10 | 36.15 | 201 | true |
| 11 | 29.74 | 201 | true |
| 12 | 35.75 | 201 | true |
| 13 | 28.83 | 201 | true |
| 14 | 24.68 | 201 | true |
| 15 | 24.55 | 201 | true |
| 16 | 27.48 | 201 | true |
| 17 | 38.24 | 201 | true |
| 18 | 24.21 | 201 | true |
| 19 | 77.11 | 201 | true |
| 20 | 56.12 | 201 | true |

## Baseline Metrics Snapshot: Before Load

- `orders_created_total`: `1`
- `orders_failed_total`: `0`
- `process_cpu_seconds_total`: `87.340034`
- `process_resident_memory_bytes`: `193159168`
- `nodejs_eventloop_lag_seconds`: `0.011052959`

Human-readable view:

- resident memory: about `184.21 MB`
- event loop lag gauge snapshot: about `11.05 ms`

## Baseline Metrics Snapshot: After Load

- `orders_created_total`: `21`
- `orders_failed_total`: `0`
- `process_cpu_seconds_total`: `88.053713`
- `process_resident_memory_bytes`: `196915200`
- `nodejs_eventloop_lag_seconds`: `0.001584242`

Human-readable view:

- resident memory: about `187.79 MB`
- event loop lag gauge snapshot: about `1.58 ms`

## Baseline Derived Resource Deltas

- created orders delta: `+20`
- failed orders delta: `0`
- CPU delta: about `+0.714 s`
- memory delta: about `+3.58 MB`

## Validated After-Optimization Metrics

The same scenario was re-run after moving payment authorization out of the synchronous request path and into the async worker flow.

- p50 latency: `20.58 ms`
- p95 latency: `63.09 ms`
- p99 latency: `74.46 ms`
- throughput: `27.34 req/s`
- error rate: `0%`

## After-Optimization Snapshot

Before load:

- `orders_created_total`: `0`
- `orders_failed_total`: `0`
- `process_cpu_seconds_total`: `9.202138`
- `process_resident_memory_bytes`: `157065216`
- `nodejs_eventloop_lag_seconds`: `0`

After load:

- `orders_created_total`: `20`
- `orders_failed_total`: `0`
- `process_cpu_seconds_total`: `9.788024`
- `process_resident_memory_bytes`: `170168320`
- `nodejs_eventloop_lag_seconds`: `0.004481482`

Derived deltas for the optimized run:

- created orders delta: `+20`
- failed orders delta: `0`
- CPU delta: about `+0.586 s`
- memory delta: about `+13.10 MB`

## Baseline To Optimized Comparison

- p50: `29.74 -> 20.58 ms` (`-30.8%`)
- p95: `77.11 -> 63.09 ms` (`-18.2%`)
- p99: `88.82 -> 74.46 ms` (`-16.2%`)
- throughput: `26.8 -> 27.34 req/s` (`+2.0%`)
- error rate stayed at `0%`
