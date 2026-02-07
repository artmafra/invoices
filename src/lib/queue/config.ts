import { Redis, type RedisOptions } from "ioredis";
import { logger } from "@/lib/logger";

// Global singleton pattern for development mode
// Prevents Redis re-initialization during Next.js HMR (Hot Module Replacement)
// In development, Next.js can re-evaluate modules multiple times, which would
// create new Redis connections on each reload. This pattern caches the
// connection globally to maintain a single instance across HMR cycles.
declare global {
  var __redis: Redis | undefined;
}

/**
 * Redis connection for BullMQ
 * Uses REDIS_URL environment variable
 * Supports both redis:// and rediss:// (TLS) protocols
 */
export function createRedisConnection(): Redis {
  // In development, return cached instance if available
  if (process.env.NODE_ENV !== "production" && global.__redis) {
    return global.__redis;
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
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false, // Required for BullMQ
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      logger.warn({ attempt: times, delay }, "[BullMQ] Redis connection retry");
      return delay;
    },
  };

  const redis = new Redis(options);

  redis.on("error", (error) => {
    logger.error({ error }, "[BullMQ] Redis connection error");
  });

  redis.on("connect", () => {
    logger.info("[BullMQ] Redis connected");
  });

  // Cache in development mode
  if (process.env.NODE_ENV !== "production") {
    global.__redis = redis;
  }

  return redis;
}

/**
 * Default queue options for BullMQ
 */
export const DEFAULT_QUEUE_OPTIONS = {
  defaultJobOptions: {
    attempts: 5, // Max retry attempts
    backoff: {
      type: "exponential" as const,
      delay: 60000, // Start with 1 minute (1min → 2min → 4min → 8min → 16min)
    },
    removeOnComplete: {
      age: 2592000, // 30 days in seconds
      count: 1000, // Keep at most 1000 completed jobs
    },
    removeOnFail: {
      age: 7776000, // 90 days in seconds
    },
  },
};

/**
 * Get worker concurrency from environment variable
 * Defaults to 5 if not set
 */
export function getWorkerConcurrency(): number {
  const concurrency = process.env.QUEUE_CONCURRENCY
    ? parseInt(process.env.QUEUE_CONCURRENCY, 10)
    : 5;
  if (concurrency < 1) {
    logger.warn({ value: concurrency }, "[BullMQ] Invalid QUEUE_CONCURRENCY, using default of 5");
    return 5;
  }
  return concurrency;
}
