# HTTP Caching (ETag)

Conditional requests for GET endpoints using weak ETags.

## How it works

- Generate a cheap version seed (e.g., max(updated_at) + count).
- If `If-None-Match` matches, return 304 without fetching data.
- Responses include `Cache-Control: private, max-age=0, must-revalidate`.

## Helpers

- `handleConditionalRequest`
- `checkConditionalRequest`
- `jsonResponseWithETag`
- `generateWeakETag`
- `buildQueryParamsSeed`

## Example

```ts
return handleConditionalRequest(
  request,
  async () => {
    const version = await userService.getUsersVersion(filters);
    return `${version.maxUpdatedAt}:${version.count}:${querySeed}`;
  },
  async () => userService.getUsersPaginated(filters, options),
);
```

## Key file

- `src/lib/http/etag.ts`

---

## Database Query Caching (Version Cache)

### Overview

Version cache reduces database load by caching `getCollectionVersion()` results in Redis with a 10-second TTL. This eliminates redundant DB queries for ETag generation on every request.

### How It Works

1. API route calls `getCollectionVersion(filters)` for ETag generation
2. Storage layer checks Redis cache first
3. **Cache hit**: Return cached result (1-2ms, no DB connection)
4. **Cache miss**: Query DB, store in Redis, return result
5. ETags are generated from cached or DB version data
6. If ETag matches, return 304; otherwise fetch full data

### Performance Impact

**Before caching:**

- 100 req/s = 100 DB queries/s for version checks alone
- 10-20ms latency per version query
- Database connection pool pressure

**After caching (95% hit rate):**

- 100 req/s = 5 DB queries/s (only cache misses)
- 1-2ms latency for cached responses
- 95% reduction in DB load
- Scales to 10,000+ req/s without DB bottleneck

### Cache Keys

Format: `version:cache:{resource}:{hash}`

- `{resource}`: users, tasks, notes, settings, roles, games, task-lists
- `{hash}`: SHA-1 hash of normalized filters (16 chars) or "default" for no filters

Examples:

- `version:cache:users:default` (no filters)
- `version:cache:tasks:a4b2c3d4e5f6g7h8` (with specific filters)

### TTL Strategy

- **Default TTL**: 10 seconds
- **Configurable**: Update `VERSION_CACHE_TTL_SECONDS` in `src/lib/cache/version-cache.service.ts`
- **Trade-off**: Freshness vs performance
- **Acceptable staleness**: Version info used for ETags, not critical data

### Cache Invalidation

#### Automatic (TTL-based)

- Redis auto-expires keys after 10 seconds
- No explicit invalidation needed
- Eventual consistency: up to 10s stale

#### Manual (immediate)

- Call `versionCache.invalidate(resource)` after mutations
- Implemented in all storage layer create/update/delete methods
- Clears all filter variations for the resource using pattern matching
- Ensures immediate consistency for write operations

### Environment Configuration

**Enable/disable caching:**

- Set `ENABLE_VERSION_CACHE=false` in `.env` to disable (default: enabled)
- Works even if Redis is configured and available
- Falls back to direct database queries when disabled

**Redis requirement:**

- Requires Upstash Redis (configured in `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`)
- Gracefully degrades to DB queries if Redis unavailable
- Uses same Redis instance as rate limiting

### Integration with ETags

Cache works transparently with existing ETag system:

```typescript
// No changes needed to ETag generation - caching is automatic
handleConditionalRequest(
  request,
  async () => {
    const version = await service.getVersion(filters); // Now cached!
    return buildETagSeed(version, filters);
  },
  async () => service.getData(filters),
);
```

### Monitoring

Check server logs for cache performance:

```
[INFO] Version caching enabled with Redis { ttl: 10 }
[DEBUG] Version cache hit { cacheKey: "version:cache:users:a4b2c3d4", hit: true }
[DEBUG] Version cache miss { cacheKey: "version:cache:tasks:default", hit: false }
[DEBUG] Version cache invalidated { resource: "users", keysDeleted: 3 }
```

### Key File

- `src/lib/cache/version-cache.service.ts`
