# Homework 07 — GraphQL for Orders + DataLoader

## Part 1 — GraphQL Setup
### 1.1 Why Code-First Approach

**I chose code-first approach for the following reasons:**

- The project is already fully based on TypeScript, and the domain model exists in code.

- The GraphQL schema is generated directly from decorators, which eliminates desynchronization between SDL and implementation.

- Types, inputs, enums and nullability are declared in a single place.

- Service layer and models are easier to reuse without duplicating definitions.

- Refactoring is safer because schema changes are strongly typed.

***GraphQL endpoint is available at: /graphql***

***GraphQL Playground successfully executes smoke queries.***

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
```
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
```
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
```
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
```
TypeOrmModule.forRoot({
  logging: true,
  logger: 'advanced-console',
});
```
**Step 2 — Add Debug Logs in Resolver**
```
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
```
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
```
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