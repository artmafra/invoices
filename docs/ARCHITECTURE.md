# Architecture Guide

Layered architecture with clear separation between storage, services, and API/UI.

## Layers

- Schema: `src/schema` (Drizzle tables and enums)
- Storage: `src/storage` (data access, minimal logic)
- Cache: `src/lib/cache` (Redis caching for frequently-accessed queries)
- Services: `src/services` (business logic, return DTOs for client-facing methods)
- DTOs: `src/dtos` (transform entities to API responses with date serialization)
- API: `src/app/api` (route handlers)
- Hooks: `src/hooks` (React Query, client data access)
- UI: `src/components` and `src/app` pages

## Conventions

- Storage methods return raw entities; services use DTOs to shape them for API use.
- DTOs handle Date serialization and field selection; API routes return service responses directly.
- API routes validate input with Zod and use `withErrorHandler`.
- Permissions are enforced at the route layer.
- Cache layer is transparent to services (storage layer handles caching internally).

### Null vs Undefined Return Semantics

**Storage Layer:** Returns `T | undefined` (e.g., `findById(): Promise<T | undefined>`)
**Service Layer:** Returns `T | null` using `(await storage.findById(id)) ?? null`
**API Layer:** Handles `null` with `if (!entity)` checks

**Why:**

- Storage: primitive database result (undefined = not found)
- Service: standardized contract (null serializes to JSON, undefined doesn't)
- Use `?? null` not `|| null` to preserve falsy values (0, "", false)

**Example:**

```typescript
// Storage
async findById(id: string): Promise<User | undefined> {
  return (await db.select().from(usersTable).where(eq(usersTable.id, id)))[0];
}

// Service
async getUserById(id: string): Promise<User | null> {
  return (await userStorage.findById(id)) ?? null;
}

// API
const user = await userService.getUserById(userId);
if (!user) throw new NotFoundError("User not found");
```

## Cache Layer

**Purpose**: Reduce database load for frequently-accessed, slowly-changing data.

**Implementation**: `VersionCacheService` in `src/lib/cache/version-cache.service.ts`

**Usage**: Storage layer automatically caches `getCollectionVersion()` queries used for ETag generation.

**Benefits**:

- 95% reduction in DB queries for version checks
- 10-20ms → 1-2ms latency for cached responses
- Scales to 10,000+ req/s without DB load
- Graceful degradation if Redis unavailable

**Configuration**:

- Enable/disable: `ENABLE_VERSION_CACHE` environment variable (default: enabled)
- TTL: Configurable constant in version-cache.service.ts (default: 10 seconds)

See [HTTP-CACHING.md](./HTTP-CACHING.md) for details.

## Storage Layer Pagination

**Purpose**: Eliminate pagination logic duplication across storage classes.

**Implementation**: Generic `paginate()` helper in `src/storage/helpers/pagination.ts`

**Usage Pattern**:

```typescript
async findManyPaginated(
  filters: FilterOptions = {},
  options: PaginationOptions = {},
): Promise<PaginatedResult<Entity>> {
  // Build WHERE conditions
  const conditions = this.buildWhereConditions(filters);
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Build queries (separate count and data queries)
  let countQuery = db.select({ count: count() }).from(table);
  let dataQuery = db.select().from(table).orderBy(table.createdAt);

  if (whereClause) {
    countQuery = countQuery.where(whereClause) as typeof countQuery;
    dataQuery = dataQuery.where(whereClause) as typeof dataQuery;
  }

  // Use pagination helper
  return paginate<Entity>({
    dataQuery,
    countQuery,
    options,
    defaultLimit: 20, // Optional, defaults to 20
  });
}
```

**What the helper handles**:

- Offset calculation: `(page - 1) * limit`
- Total pages calculation: `Math.ceil(total / limit)`
- Dual query execution (count + data)
- Default pagination limit (20 items per page)

**What storage classes still handle**:

- WHERE conditions (domain-specific filtering)
- JOIN patterns (varies by entity complexity)
- ORDER BY logic (sorting strategies)
- Post-processing (e.g., decrypting settings, fetching related data)

**When to use `countQuery` parameter**:

- Default: Simple tables without JOINs can share the same WHERE clause
- Required: When count query needs JOINs (e.g., filtering by joined table fields)

**Example with JOINs**:

```typescript
// Count query needs JOIN if filtering by user fields
let countQuery = db
  .select({ count: count() })
  .from(activitiesTable)
  .leftJoin(usersTable, eq(activitiesTable.userId, usersTable.id));

let dataQuery = db
  .select({ ...activitiesTable, userName: usersTable.name })
  .from(activitiesTable)
  .leftJoin(usersTable, eq(activitiesTable.userId, usersTable.id));
```

**Benefits**:

- 30+ instances of pagination math removed
- Consistent pagination behavior across all storage classes
- Single source of truth for pagination logic
- Easy to extend (e.g., cursor-based pagination in the future)

## Key files

- `src/lib/api-handler.ts`
- `src/lib/permissions/*`
- `src/lib/cache/version-cache.service.ts`
- `src/validations/*`
- `src/types/*`
