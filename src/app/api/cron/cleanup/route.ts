import { NextRequest, NextResponse } from "next/server";
import { activityService } from "@/services/runtime/activity";
import { loginHistoryService } from "@/services/runtime/login-history";
import { queueJobService } from "@/services/runtime/queue-job";
import { tokenService } from "@/services/runtime/token";
import { userSessionService } from "@/services/runtime/user-session";

/**
 * Cron endpoint for database cleanup tasks
 *
 * This endpoint handles periodic cleanup of expired/old data:
 * - Login history: 90 days retention
 * - Activities: 90 days retention
 * - Expired sessions: Cleanup revoked/expired sessions
 * - Expired tokens: Cleanup expired verification tokens
 * - Queue jobs: 30 days for completed, 90 days for failed
 *
 * Security: Protected by CRON_SECRET environment variable
 *
 * Usage:
 * - Set CRON_SECRET environment variable
 * - Configure your cron service (Vercel, Railway, etc.) to call this endpoint
 *
 * Example Vercel cron config (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup",
 *     "schedule": "0 3 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // If CRON_SECRET is not configured, deny all requests
  if (!cronSecret) {
    console.error("CRON_SECRET environment variable is not configured");
    return NextResponse.json({ error: "Cron not configured" }, { status: 500 });
  }

  // Verify the secret matches
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn("Unauthorized cron cleanup attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, number | string> = {};

  try {
    // Cleanup login history (90 days retention)
    const deletedLoginHistory = await loginHistoryService.deleteOlderThan(90);
    results.loginHistory = deletedLoginHistory;

    // Cleanup activities (90 days retention)
    const deletedActivities = await activityService.deleteOlderThan(90);
    results.activities = deletedActivities;

    // Cleanup expired/revoked sessions
    const deletedSessions = await userSessionService.cleanupExpiredSessions();
    results.sessions = deletedSessions;

    // Cleanup expired tokens
    const deletedTokens = await tokenService.cleanupExpiredTokens();
    results.tokens = deletedTokens;

    // Cleanup completed queue jobs (30 days retention)
    const deletedCompletedJobs = await queueJobService.deleteCompletedOlderThan(30);
    results.queueJobsCompleted = deletedCompletedJobs;

    // Cleanup failed queue jobs (90 days retention)
    const deletedFailedJobs = await queueJobService.deleteFailedOlderThan(90);
    results.queueJobsFailed = deletedFailedJobs;

    console.log("Cleanup completed:", results);

    return NextResponse.json({
      success: true,
      deleted: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cleanup cron error:", error);
    return NextResponse.json(
      {
        error: "Cleanup failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
