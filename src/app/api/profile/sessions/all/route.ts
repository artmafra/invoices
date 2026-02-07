import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { activityService } from "@/services/runtime/activity";
import { userSessionService } from "@/services/runtime/user-session";

/**
 * DELETE - Revoke all sessions except current
 */
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  // Rate limit sensitive session operations
  const ip = getClientIp(request);
  const rateLimitResponse = await withRateLimit("sensitiveAction", ip);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  // Revoke all sessions except current session (identified via JWT sessionId)
  const currentSessionId = session.sessionId;
  const count = await userSessionService.revokeAllUserSessions(session.user.id, currentSessionId);

  // Log activity
  await activityService.logAction(
    session,
    "revoke_all_own",
    "sessions",
    {
      type: "user-sessions",
      id: session.user.id,
      name: session.user.name ?? session.user.email ?? undefined,
    },
    { metadata: { revokedCount: count } },
  );

  return NextResponse.json({
    success: { code: "profile.sessions.revoked_all" },
    revokedCount: count,
  });
});
