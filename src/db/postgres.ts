import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { logger } from "@/lib/logger";

/**
 * Connection pool configuration
 *
 * Prevents connection exhaustion in serverless environments where multiple
 * instances spawn concurrently. Without explicit limits, each instance uses
 * the postgres-js default (~10 connections), which quickly exhausts typical
 * PostgreSQL max_connections (100).
 *
 * Recommended pool sizes by deployment type:
 * - Serverless (Vercel/Netlify): 3-5 connections per instance
 * - Containers (Railway/Render): 5-10 connections per instance
 * - Dedicated servers: 10-20 connections per instance
 *
 * For production scale (100+ concurrent instances), use an external connection
 * pooler like PgBouncer, Supabase Pooler, or Neon. See /docs/DEPLOYMENT.md.
 *
 * Connection behavior:
 * - Startup: Application verifies database connectivity in instrumentation.ts
 *   and exits with code 1 if connection fails (fail-fast for orchestrator restarts)
 * - Runtime: postgres-js automatically reconnects within `connect_timeout` for
 *   transient failures. Persistent connection loss will crash queries and trigger
 *   global error boundary showing "Database Unavailable" message to users.
 * - No graceful degradation: Database is critical infrastructure; running without
 *   it creates security risks and inconsistent state.
 */
const poolConfig = {
  // Maximum connections per instance (default: 5 for serverless safety)
  max: process.env.DATABASE_POOL_SIZE ? parseInt(process.env.DATABASE_POOL_SIZE, 10) : undefined,

  // Close idle connections after N seconds (default: 20s)
  idle_timeout: process.env.DATABASE_IDLE_TIMEOUT
    ? parseInt(process.env.DATABASE_IDLE_TIMEOUT, 10)
    : undefined,

  // Connection attempt timeout (default: 10s)
  connect_timeout: process.env.DATABASE_CONNECT_TIMEOUT
    ? parseInt(process.env.DATABASE_CONNECT_TIMEOUT, 10)
    : undefined,
};

// Singleton instance holder for lazy initialization
let dbInstance: ReturnType<typeof drizzle> | undefined;

/**
 * Lazy-loaded database client singleton.
 * Connection is only established when first accessed at runtime.
 * Prevents connection attempts during Next.js build phase.
 */
export function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  // Log pool configuration at debug level for troubleshooting
  if (process.env.LOG_LEVEL === "debug") {
    logger.debug(
      {
        poolSize: poolConfig.max,
        idleTimeout: poolConfig.idle_timeout,
        connectTimeout: poolConfig.connect_timeout,
        nodeEnv: process.env.NODE_ENV,
      },
      "Database connection pool initialized",
    );
  }

  // Create the drizzle database instance with connection pooling
  const client = postgres(process.env.DATABASE_URL, poolConfig);
  dbInstance = drizzle(client);
  return dbInstance;
}

/**
 * Database client proxy for transparent lazy loading.
 * Uses getter to avoid connecting during Next.js build time.
 * Connection is only established when first accessed at runtime.
 */
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    const client = getDb();
    const value = client[prop as keyof typeof client];
    return typeof value === "function" ? (value as (...args: any[]) => any).bind(client) : value;
  },
});
