# Homework 07 — GraphQL for Orders + DataLoader

## Part 1 — GraphQL Setup

### 1.1 Why Code-First Approach

**I chose code-first approach for the following reasons:**

- The project is already fully based on TypeScript, and the domain model exists in code.

- The GraphQL schema is generated directly from decorators, which eliminates desynchronization between SDL and implementation.

- Types, inputs, enums and nullability are declared in a single place.

- Service layer and models are easier to reuse without duplicating definitions.

- Refactoring is safer because schema changes are strongly typed.

**_GraphQL endpoint is available at: /graphql_**

**_GraphQL Playground successfully executes smoke queries._**

## Part 2 — Schema as a Contract

### 2.1 Domain Types

**The following GraphQL ObjectTypes were implemented:**

- UserModel

- ProductModel

- OrderModel

- OrderItemModel

**Relations:**

- Order.items: [OrderItem!]!

- OrderItem.product: Product!

- Order.status uses enum OrderStatus

Nullability is explicitly defined and matches the database constraints (no unnecessary nullable fields).

### 2.2 Input Types

**The following input types were created:**

**OrdersFilterInput**

status?: OrderStatus

dateFrom?: DateTime

dateTo?: DateTime

**PaginationCursorInput**

Cursor-based pagination:

limit: number

cursor?: string

This input is reusable for any cursor-based batch query in the project.

## Part 3 — Query Resolver

### 3.1 Query orders

Implemented query:

```bash
query Orders($filter: OrdersFilterInput, $pagination: PaginationCursorInput) {
  orders(filter: $filter, pagination: $pagination) {
    nodes {
      id
      status
      createdAt
      items {
        quantity
        product {
          id
          name
          price
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}
```

Example variables:

```bash
{
  "filter": {
    "status": "PENDING",
    "dateTo": "2026-02-23T18:02:02.835Z"
  },
  "pagination": {
    "limit": 2,
    "cursor": "eyJpZCI6Ijc0N2JiODcwLTNkNzYtNDcyNS1iNzQ2LTc5ODQ5MDFlYjM2OCIsImNyZWF0ZWRBdCI6IjIwMjYtMDItMTBUMTA6MTk6MzkuNjk5WiJ9"
  }
}
```

**Some other query examples**

```bash
query TestN2 {
  orders(pagination: { limit: 3 }) {
    nodes {
      id
      totalAmount
      user { id firstName lastName email __typename}
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount

  }
}

query TestN3 {
  orders(filter:{status:PENDING, dateTo: "2026-02-12"}) {
     __typename
    nodes {
      __typename
      id
      createdAt
      totalAmount
      user { id firstName lastName email __typename}
    }
    pageInfo {
      __typename
      hasNextPage
      endCursor
    }
    totalCount

  }
}

query Order {
  order(id: "199fa051-9cbb-4d8d-ba3d-9639eb8b97b2") {
    id
    status
    createdAt
    totalAmount
    items {
      id
      product{price name}
    }
  }
}
```

**Architecture Notes**

Resolver is thin — it delegates all business logic to OrdersService.

Filtering and pagination are handled inside the service layer.

No business logic is duplicated in the GraphQL layer.

### 3.2 Pagination Format

I chose the OrdersConnection pattern.

Why OrdersConnection:

- Client requires pagination metadata (hasNextPage).

- totalCount is needed for UI (e.g., "Showing X of Y").

- Explicit endCursor makes pagination deterministic.

- Easily extensible (can add hasPreviousPage, startCursor).

- Follows industry-standard Relay-style pagination pattern.

Structure:

```bash
{
  nodes: [Order!]!;
  pageInfo: {
    hasNextPage: Boolean!;
    endCursor: String;
  };
  totalCount: Int!;
}
```

## Part 4 — N+1 Problem and DataLoader

### 4.1 Detecting the N+1 Problem

**Step 1 — Enable SQL Logging**

TypeORM logging was enabled:

```bash
TypeOrmModule.forRoot({
  logging: true,
  logger: 'advanced-console',
});
```

**Step 2 — Add Debug Logs in Resolver**

```bash
@ResolveField(() => ProductModel, { name: 'product' })
async getProduct(@Parent() orderItem: OrderItem) {
  this.logger.warn(`🔴 N+1: Loading product for item ${orderItem.id}`);
  return this.productRepo.findOne({
    where: { id: orderItem.productId },
  });
}
```

**Step 3 — Execute GraphQL Query**

Executed:

```bash
orders {
  nodes {
    items {
      product {
        id
        name
      }
    }
  }
}
```

**Observed SQL Logs (Proof of N+1)**

- For multiple orders and items, the following pattern appeared:

- One query per order to load order_items

- One separate query per item to load products

Example logs:

```bash
SELECT ... FROM "order_items" WHERE order_id = $1;

Resolver logs:

🔴 N+1: Loading product for item 2f4be1c9...
🔴 N+1: Loading product for item aa68a865...
🔴 N+1: Loading product for item b4aeb94b...

Followed by multiple individual product queries:

SELECT ... FROM "products" WHERE id = $1 LIMIT 1;
SELECT ... FROM "products" WHERE id = $1 LIMIT 1;
SELECT ... FROM "products" WHERE id = $1 LIMIT 1;
```

Even when the same product ID was requested multiple times, separate queries were executed.

**Conclusion**

For:

N orders

M items per order

The system performed:

1 query for orders

N queries for order_items

N × M queries for products

This clearly demonstrates the N+1 problem in the OrderItem → Product resolution.

### 4.2 Implementing DataLoader (Product by productId)

To fix N+1 for OrderItem → Product, I implemented DataLoader for products:

**Requirements covered:**

- Batching within one GraphQL request — multiple .load(productId) calls are combined into one SQL query.

- Per-request caching — DataLoader default cache prevents duplicate DB reads for the same productId during a single request.

- Correct keys → results mapping — results are mapped back to requested ids in the same order.

**How it works (high-level):**

- Loaders are created per GraphQL request and stored in GraphQLContext.loaders.

- Resolvers use loaders instead of direct repository queries:

@ResolveField(() => ProductModel, { name: 'product' })
async product(@Parent() item: OrderItemModel, @Context() ctx: GraphQLContext) {
return ctx.loaders.productByIdLoader.load(item.productId);
}

### 4.3 Proof that N+1 is gone (Before / After)

**Before DataLoader:**

Each OrderItem.product resolution executed its own query:

N queries to load order_items (one per order)

N × M queries to load products (one per item)

Example pattern:

```bash
SELECT ... FROM "products" "Product" WHERE (("Product"."id" = $1)) LIMIT 1;
SELECT ... FROM "products" "Product" WHERE (("Product"."id" = $1)) LIMIT 1;
SELECT ... FROM "products" "Product" WHERE (("Product"."id" = $1)) LIMIT 1;
```

**After DataLoader:**

Products are fetched using a single batched query:

```bash
SELECT "Product"."id" AS "Product_id", ...
FROM "products" "Product"
WHERE (("Product"."id" IN ($1, $2, $3, $4)))
-- PARAMETERS: [
-- "a54c6748-c071-4ea6-9de4-e1940652a6f9",
-- "4e8c73ae-dc32-48c3-ba1e-05ba2392c141",
-- "e32468cf-525b-44c9-8e3a-57dbfdb904d3",
-- "4f326ea3-0e65-4bba-abd0-ff26686c22c3"
-- ]
```

What changed:

Instead of many SELECT ... WHERE id = $1 LIMIT 1 calls, DataLoader aggregates productIds and executes one query:

WHERE id IN (...)

The number of product queries dropped from N × M to ~1 per request (or a few, if the request is very large).

Result:
N+1 in OrderItem → Product resolution was eliminated by batching and per-request caching via DataLoader.

### Part 5 — Error handling

Invalid filter / pagination

-Input arguments are validated via GraphQL input types + class-validator.
-Invalid values (e.g. negative limit, invalid enum, wrong DateTime) result in a GraphQL validation error (BAD_USER_INPUT).

Nothing found

If no orders match the filter, API returns:

```bash
{
  "data": {
    "orders": {
      "nodes": [],
      "pageInfo": {
        "hasNextPage": false,
        "endCursor": null
      },
      "totalCount": 0
    }
  }
}
```

No exceptions are thrown.

Internal DB/service errors

**Unexpected errors (DB failures, runtime errors) are:**

- logged on the server (with stacktrace)
- returned to the client as a normal GraphQL error with a short message (no “something went wrong”).
