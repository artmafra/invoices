import { createHash } from "crypto";
import { logger } from "@/lib/logger";
import { redis } from "@/db/redis";

/**
 * Configuration
 */
const VERSION_CACHE_TTL_SECONDS = 10;
const VERSION_CACHE_ENABLED = process.env.ENABLE_VERSION_CACHE;

export interface VersionInfo {
  maxUpdatedAt: Date | null;
  count: number;
}

export interface LockStatus {
  locked: boolean;
  remainingSeconds?: number;
}

/**
 * Redis-backed cache for database version queries.
 *
 * Reduces database load by caching getCollectionVersion() results with a short TTL.
 * Gracefully falls back to database queries if Redis is unavailable or caching is disabled.
 *
 * Enable/disable: Set ENABLE_VERSION_CACHE=true to enable (default: disabled)
 * TTL: Configured via VERSION_CACHE_TTL_SECONDS constant (default: 10 seconds)
 */
export class VersionCacheService {
  private readonly ttl: number;
  private readonly enabled: boolean;
  private hasLoggedInit = false;

  constructor(ttlSeconds: number = VERSION_CACHE_TTL_SECONDS) {
    this.ttl = ttlSeconds;
    this.enabled = VERSION_CACHE_ENABLED === "true" && !!process.env.REDIS_URL;
    // Defer logging until first use to avoid initializing during build
  }

  /**
   * Log initialization status once on first use
   * This prevents logging during Next.js build when workers load storage modules
   */
  private logInitOnce(): void {
    if (this.hasLoggedInit) return;
    this.hasLoggedInit = true;

    if (this.enabled) {
      logger.info({ ttl: this.ttl }, "[Cache] Version caching enabled");
    } else if (!process.env.REDIS_URL) {
      logger.warn("[Cache] Redis not configured - caching disabled");
    }
  }

  /**
   * Get version from cache or fetch from database.
   *
   * @param cacheKey - Unique cache key for this version query
   * @param fetchFn - Function that fetches version from database
   * @returns Version info (from cache or database)
   */
  async getOrFetch(cacheKey: string, fetchFn: () => Promise<VersionInfo>): Promise<VersionInfo> {
    this.logInitOnce();

    if (!this.enabled) {
      return fetchFn();
    }

    try {
      // Try cache first
      const cached = await redis.get(cacheKey);

      if (cached) {
        logger.debug({ cacheKey, hit: true }, "[Cache] Hit");

        // ioredis returns strings, manually parse JSON
        const data = JSON.parse(cached);

        // Reconstruct Date object (Redis stores ISO string)
        return {
          maxUpdatedAt: data.maxUpdatedAt ? new Date(data.maxUpdatedAt) : null,
          count: data.count,
        };
      }

      logger.debug({ cacheKey, hit: false }, "[Cache] Miss");
    } catch (error) {
      logger.warn({ error, cacheKey }, "[Cache] Read failed, falling back to DB");
    }

    // Fetch from database
    const version = await fetchFn();

    // Store in cache (fire and forget)
    this.setCache(cacheKey, version).catch((error) => {
      logger.warn({ error, cacheKey }, "[Cache] Write failed (non-blocking)");
    });

    return version;
  }

  /**
   * Build cache key with filter hashing.
   *
   * @param resource - Resource name (e.g., "users", "tasks")
   * @param filters - Filter object to hash
   * @returns Cache key string
   */
  buildCacheKey(resource: string, filters?: Record<string, any>): string {
    if (!filters || Object.keys(filters).length === 0) {
      return `version:cache:${resource}:default`;
    }

    const hash = this.hashFilters(filters);
    return `version:cache:${resource}:${hash}`;
  }

  /**
   * Hash filters for deterministic cache keys.
   */
  private hashFilters(filters: Record<string, any>): string {
    // Sort keys and filter out undefined/null
    const normalized = Object.entries(filters)
      .filter(([, v]) => v !== undefined && v !== null)
      .sort(([a], [b]) => a.localeCompare(b));

    const hash = createHash("sha1").update(JSON.stringify(normalized)).digest("hex");

    return hash.slice(0, 16); // First 16 chars for brevity
  }

  /**
   * Invalidate cache for a resource (called after mutations).
   *
   * Deletes all version cache keys matching the resource pattern.
   *
   * @param resource - Resource name to invalidate
   */
  async invalidate(resource: string): Promise<void> {
    this.logInitOnce();

    if (!this.enabled) return;

    try {
      // Delete keys by pattern
      const pattern = `version:cache:${resource}:*`;
      const keys = await redis.keys(pattern);

      if (keys.length > 0) {
        await redis.del(...keys);
        logger.debug({ resource, keysDeleted: keys.length }, "[Cache] Invalidated");
      }
    } catch (error) {
      logger.error({ error, resource }, "[Cache] Invalidation failed");
    }
  }

  /**
   * Store version in cache with TTL.
   */
  private async setCache(cacheKey: string, version: VersionInfo): Promise<void> {
    if (!this.enabled) return;

    await redis.setex(
      cacheKey,
      this.ttl,
      JSON.stringify({
        maxUpdatedAt: version.maxUpdatedAt?.toISOString() || null,
        count: version.count,
      }),
    );
  }
}

// Export singleton instance
export const versionCache = new VersionCacheService();
