# Part 1 — Transactional Order Creation

## 1. Idempotency (double-submit safe)

### Approach

Each order is created with an idempotencyKey (UUID v4), provided via HTTP header.
The key is stored in the orders table.

**A composite UNIQUE constraint is used:
UNIQUE (user_id, idempotency_key)**

Behavior

If a request with a new idempotency key is received → a new order is created.
If the same key is reused (retry, timeout, double submit) → the existing order is returned.
This guarantees that multiple identical POST requests result in only one order.

## 2. Transaction handling

All order creation steps are executed inside a single database transaction using QueryRunner.

Transactional steps

- Check if user exists

- Check for existing order by (user_id, idempotency_key)

- Lock product rows using pessimistic locking

- Validate stock

- Create order

- Create order items

- Update product stock

- Calculate order totals

- Updating order

- Commit transaction

try / catch / finally is used

rollbackTransaction() is executed on any error

release() is always called in finally

No partial writes are possible

## 3. Oversell protection (concurrency)

Chosen strategy: pessimistic locking

```
SELECT id, stock, price
FROM products
WHERE id = ANY($1::uuid[])
FOR NO KEY UPDATE;
```

### Why pessimistic locking:

- Clear and deterministic behavior
- Prevents concurrent transactions from modifying stock
- Simple to reason about for order creation flow

### Additionally, stock is updated atomically:

```
UPDATE products
SET stock = stock - $1
WHERE id = $2 AND stock >= $1
RETURNING id;
```

If no rows are updated → stock is insufficient.

## 4. Error handling

| Scenario                  | Behavior                             |
| ------------------------- | ------------------------------------ |
| Insufficient stock        | 409 Conflict                         |
| Duplicate idempotency key | 201 Return existing order            |
| Validation errors         | 400 Bad Request                      |
| Any unexpected error      | Rollback + 500 Internal Server Error |

#### PostgreSQL error code 23505 (unique_violation) is explicitly handled to safely return the existing order in race conditions.

# Part 2 — SQL Optimization

## 1. Selected “hot” query

Product list with:

- text search

- sorting

- pagination

```
SELECT *
FROM products p
WHERE p.name ILIKE '%phone%'
ORDER BY p.price ASC
LIMIT 20 OFFSET 0;
```

This query is typical for product search in e-commerce applications.

## 2. Execution plan BEFORE optimization

Seq Scan on products
Filter: name ILIKE '%phone%'
Rows Removed by Filter: 47493
Execution Time: 22.360 ms

### Problems

- Full table scan (Seq Scan)
- ILIKE '%text%' cannot use a btree index
  Performance degrades linearly with table size

## 3. Optimization strategy

To optimize substring search, PostgreSQL trigram indexing was used.

```
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

```
CREATE INDEX products_name_trgm_idx
ON products USING gin (name gin_trgm_ops);
```

Why

- pg_trgm supports fast substring search

- GIN index is optimal for trigram operations

- Enables efficient ILIKE '%text%' queries

## 4. Execution plan AFTER optimization

Bitmap Index Scan on products_name_trgm_idx
Bitmap Heap Scan on products
Execution Time: 3.311 ms

## Result:

- Index is used by the planner when rows amount have been increased to 50000. When there were 20 rows planner used Seq Scan

- Full table scan is avoided

- Query execution time improved by ~6.7× (22 ms → 3 ms)

## 5. Why the planner chose this plan

Trigram GIN index supports ILIKE '%phone%'

Bitmap scan is efficient when many rows match the condition

Heap pages are fetched in batches instead of random access

Recheck condition is expected for trigram indexes

## 6. Query plan logs

## before:

```bash
SELECT *
EXPLAIN (ANALYZE, BUFFERS)
FROM products p
WHERE p.name ILIKE '%phone%'
ORDER BY p.price ASC
LIMIT 20 OFFSET 0;
```

                                                        QUERY PLAN

---

Limit (cost=1346.28..1346.33 rows=20 width=71) (actual time=22.330..22.333 rows=20 loops=1)
Buffers: shared hit=654
-> Sort (cost=1346.28..1352.59 rows=2526 width=71) (actual time=22.328..22.329 rows=20 loops=1)
Sort Key: price
Sort Method: top-N heapsort Memory: 28kB
Buffers: shared hit=654
-> Seq Scan on products p (cost=0.00..1279.06 rows=2526 width=71) (actual time=0.022..22.086 rows=2512 loops=1)
Filter: ((name)::text ~~\* '%phone%'::text)
Rows Removed by Filter: 47493
Buffers: shared hit=654
Planning:
Buffers: shared hit=40 dirtied=1
Planning Time: 0.678 ms
Execution Time: 22.360 ms

### after:

```bash
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM products p
WHERE p.name ILIKE '%phone%'
ORDER BY p.price ASC
LIMIT 20 OFFSET 0;
```

                                                                    QUERY PLAN

---

Limit (cost=796.22..796.27 rows=20 width=71) (actual time=3.269..3.272 rows=20 loops=1)
Buffers: shared hit=643
-> Sort (cost=796.22..802.54 rows=2526 width=71) (actual time=3.268..3.270 rows=20 loops=1)
Sort Key: price
Sort Method: top-N heapsort Memory: 28kB
Buffers: shared hit=643
-> Bitmap Heap Scan on products p (cost=43.43..729.01 rows=2526 width=71) (actual time=0.580..2.889 rows=2512 loops=1)
Recheck Cond: ((name)::text ~~_ '%phone%'::text)
Heap Blocks: exact=633
Buffers: shared hit=643
-> Bitmap Index Scan on products_name_trgm_idx (cost=0.00..42.80 rows=2526 width=0) (actual time=0.522..0.522 rows=2512 loops=1)
Index Cond: ((name)::text ~~_ '%phone%'::text)
Buffers: shared hit=10
Planning:
Buffers: shared hit=38
Planning Time: 2.155 ms
Execution Time: 3.311 ms
