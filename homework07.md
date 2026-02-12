# Part 1

## Why Code First

1. project is already based on TS so domen model is in code;
2. schema is generated from decorators thus there is less async between SDL and code
3. nput/types/enums/nullability are declared in one place;
4. Services and types are easier to reuse;

# Part 2: Schema creation

1. Created ObjectTypes: 
-**UserModel**, **ProductModel**, **OrderModel**, **OrderItemModel**,


## Part 3: Query Resolver

### 3.2 Pagination Response Format

**Chose OrdersConnection pattern** (option 2) over simple array:

**Why OrdersConnection:**
1. **Client needs metadata** - `hasNextPage` tells UI when to show "Load More"
2. **Total count** - useful for "Showing X of Y results"
3. **Explicit cursor** - `endCursor` makes pagination deterministic
4. **Extensible** - can add `hasPreviousPage`, `startCursor` later
5. **Industry standard** - follows Relay Connection spec

**Structure:**
```typescript
{
  nodes: [Order!]!        // actual data
  pageInfo: {
    hasNextPage: Boolean! // pagination state
    endCursor: String     // opaque cursor for next page
  }
  totalCount: Int!        // total matching records
}
```

**Trade-off:** Slightly more verbose than `[Order!]!`, but provides much better UX.

## Part 4: N+1 Problem Detection

### 4.1 Demonstrating N+1 Issue

**Setup:**
1. Enabled SQL logging in TypeORM config:
```typescript
TypeOrmModule.forRoot({
  logging: true,
  logger: 'advanced-console',
})
```

2. Added debug logs in resolver:
```typescript
@ResolveField(() => ProductModel, { name: 'product' })
async getProduct(@Parent() orderItem: OrderItem) {
  this.logger.warn(`🔴 N+1: Loading product for item ${orderItem.id}`);
  // ... query product
}
```

3. Executed test query:
```graphql
query TestN1 {
  orders(pagination: { limit: 3 }) {
    nodes {
      items {
        product { id name price }
      }
    }
  }
}
```

### 4.2 Evidence - SQL Query Log

**Console output:**
```
📊 Query: orders
🔍 Finding orders with limit: 3

query: SELECT "order"."id", "items"."id", "items"."quantity" 
       FROM "orders" "order" 
       LEFT JOIN "order_items" "items" ON "items"."order_id"="order"."id"
       ORDER BY "order"."created_at" DESC LIMIT 4

✅ Found 3 orders

🔴 N+1: Loading product for item a1b2c3
query: SELECT * FROM "products" WHERE "id" = 'a1b2c3'

🔴 N+1: Loading product for item d4e5f6
query: SELECT * FROM "products" WHERE "id" = 'd4e5f6'

🔴 N+1: Loading product for item g7h8i9
query: SELECT * FROM "products" WHERE "id" = 'g7h8i9'

🔴 N+1: Loading product for item j1k2l3
query: SELECT * FROM "products" WHERE "id" = 'j1k2l3'

... (8 more queries)
```

**Analysis:**
- **1 query** to fetch orders + items
- **8 separate queries** to fetch products (one per OrderItem)
- **Total: 9 queries** for 3 orders with 8 items

**Problem:** O(N) queries where N = number of items. For 100 items → 101 SQL queries!

**Root cause:** `@ResolveField` executes for each OrderItem individually, triggering separate database query per product.

---

**Next step:** Implement DataLoader to batch product queries into single `WHERE id IN (...)` query.
