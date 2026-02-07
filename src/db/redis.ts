import Redis, { type RedisOptions } from "ioredis";
import { logger } from "@/lib/logger";

let redisClientInstance: Redis | undefined;

/**
 * Shared Redis client for rate limiting, login protection, session tokens, and caching.
 * Reuses the same connection configuration as BullMQ queues but without BullMQ-specific options.
 * Uses REDIS_URL environment variable.
 * Supports both redis:// and rediss:// (TLS) protocols.
 *
 * IMPORTANT: Lazy-loaded to avoid connecting during Next.js build time.
 * Connection is only established when first accessed at runtime.
 */
export function getRedisClient(): Redis {
  // Return cached instance if available
  if (redisClientInstance) {
    return redisClientInstance;
  }

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error("REDIS_URL environment variable is not configured");
  }

  // Parse Redis URL using WHATWG URL API to avoid deprecated url.parse()
  const url = new URL(redisUrl);

  // Extract connection options from URL
  const options: RedisOptions = {
    host: url.hostname,
    port: url.port ? parseInt(url.port, 10) : 6379,
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname ? parseInt(url.pathname.slice(1), 10) : 0,
    tls: url.protocol === "rediss:" ? {} : undefined,
    // Standard ioredis options (no BullMQ-specific settings)
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      logger.warn({ attempt: times, delay }, "[Redis] Connection retry");
      return delay;
    },
  };

  const redis = new Redis(options);

  redis.on("error", (error) => {
    logger.error({ error }, "[Redis] Connection error");
  });

  redis.on("connect", () => {
    logger.debug("[Redis] Client connected");
  });

  // Cache instance
  redisClientInstance = redis;

  return redis;
}

/**
 * Lazy-loaded Redis singleton instance.
 * Uses getter to avoid connecting during Next.js build time.
 * Connection is only established when first accessed at runtime.
 */
export const redis = new Proxy({} as Redis, {
  get(_, prop) {
    const client = getRedisClient();
    const value = client[prop as keyof Redis];
    return typeof value === "function" ? (value as (...args: any[]) => any).bind(client) : value;
  },
});
