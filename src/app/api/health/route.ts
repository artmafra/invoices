import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { db } from "@/db/postgres";
import { getRedisClient } from "@/db/redis";

/**
 * Health check endpoint for monitoring and orchestrator probes
 *
 * Returns 200 if all services are operational, 503 if any service is down.
 * Results are cached for 10 seconds to avoid excessive database queries.
 *
 * Response format:
 * {
 *   status: "ok" | "degraded",
 *   timestamp: ISO8601,
 *   services: {
 *     database: "connected" | "error",
 *     redis: "connected" | "error"
 *   }
 * }
 */

// Cache health check results to avoid excessive queries
let cachedHealthResult: {
  status: "ok" | "degraded";
  timestamp: string;
  services: {
    database: "connected" | "error";
    redis: "connected" | "error";
  };
} | null = null;
let cacheExpiry = 0;

export async function GET() {
  // Return cached result if still valid
  const now = Date.now();
  if (cachedHealthResult && now < cacheExpiry) {
    return NextResponse.json(cachedHealthResult, {
      status: cachedHealthResult.status === "ok" ? 200 : 503,
      headers: {
        "Cache-Control": "public, max-age=10",
      },
    });
  }

  // Check database connectivity
  let databaseStatus: "connected" | "error" = "error";
  try {
    await db.execute(sql`SELECT 1`);
    databaseStatus = "connected";
  } catch (error) {
    logger.error({ error }, "[Health] Database check failed");
  }

  // Check Redis connectivity
  let redisStatus: "connected" | "error" = "error";
  try {
    const redis = getRedisClient();
    await redis.ping();
    redisStatus = "connected";
  } catch (error) {
    logger.error({ error }, "[Health] Redis check failed");
  }

  // Determine overall status
  const overallStatus =
    databaseStatus === "connected" && redisStatus === "connected"
      ? ("ok" as const)
      : ("degraded" as const);

  // Build response
  const result = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services: {
      database: databaseStatus,
      redis: redisStatus,
    },
  };

  // Cache result for 10 seconds
  cachedHealthResult = result;
  cacheExpiry = now + 10000;

  return NextResponse.json(result, {
    status: overallStatus === "ok" ? 200 : 503,
    headers: {
      "Cache-Control": "public, max-age=10",
    },
  });
}
