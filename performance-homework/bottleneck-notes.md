# Bottleneck Explanation

## What Was Measured

The measured hot path is `POST /api/v1/orders`, executed 20 times sequentially against the local dev environment.

This scenario is important because it represents a checkout-like order creation flow and touches several subsystems:

- PostgreSQL writes
- stock validation
- outbox publishing
- RabbitMQ
- Kafka
- payments gRPC integration

## Baseline Summary

- p50 latency: `29.74 ms`
- p95 latency: `77.11 ms`
- p99 latency: `88.82 ms`
- throughput: `26.8 req/s`
- error rate: `0%`

The baseline showed a noticeable tail: `p95` and `p99` were much worse than `p50`.

## Initial Hypothesis

The first hypothesis was that the main bottleneck was extra synchronous database work inside `OrdersService.create()`.

The request path originally:

1. created the order and order items
2. performed additional SQL work to calculate totals after inserts
3. reloaded the created order from the database after commit
4. waited synchronously for `payments.authorize()` over gRPC

The database round-trips were a reasonable optimization target, so they were removed first.

## What The First Iteration Showed

That first change did not produce a meaningful end-to-end improvement for the request latency.

This was useful because it ruled out local DB round-trips as the dominant bottleneck for the measured scenario.

In other words, the system was still paying most of its latency cost somewhere else in the critical path.

## Confirmed Bottleneck

The real bottleneck was the synchronous payment authorization call inside the HTTP request path.

More specifically:

- `POST /api/v1/orders` was blocked on `payments.authorize()`
- the API response waited for a remote gRPC dependency
- variability in the payments service directly affected request latency tail

## Why This Is Confirmed By Data

### Evidence From Code Path

Code inspection showed that the order creation endpoint blocked the HTTP response on work that was not strictly required to acknowledge order creation immediately:

- extra post-insert SQL work
- order reload after commit
- synchronous remote payment authorization

### Evidence From Follow-Up Measurements

After moving payment authorization out of the synchronous request path and into the async worker flow, the same scenario improved to:

- p50: `20.58 ms`
- p95: `63.09 ms`
- p99: `74.46 ms`
- throughput: `27.34 req/s`
- error rate: `0%`

Improvement versus baseline:

- p50 improved by about `30.8%`
- p95 improved by about `18.2%`
- p99 improved by about `16.2%`

This gives a much stronger signal than intuition alone: the synchronous external dependency was the main bottleneck affecting real request latency.

## Why It Matters Economically

This bottleneck is not only technical.

When the API worker waits on a remote service during order creation:

- fewer requests can be served by the same runtime
- tail latency becomes less predictable
- scaling pressure appears earlier
- the API tier spends compute time waiting on network-bound synchronous work

That increases runtime cost per successful order, even if the business flow still works.

## Safe Interpretation For The Homework

The validated optimization direction is:

- keep the request path focused on the minimum work required to create the order
- move remote or non-critical work out of the synchronous request path when possible
- use async processing for payment authorization to reduce request-time waiting

This directly improves both:

- performance efficiency
- runtime / cost efficiency
