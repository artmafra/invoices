import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { activityService } from "@/services/runtime/activity";
import { userSessionService } from "@/services/runtime/user-session";

type RouteParams = {
  params: Promise<{ sessionId: string }>;
};

/**
 * DELETE - Revoke a specific session
 */
export const DELETE = withErrorHandler(async (request: NextRequest, context: RouteParams) => {
  // Rate limit sensitive session operations
  const ip = getClientIp(request);
  const rateLimitResponse = await withRateLimit("sensitiveAction", ip);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  const { sessionId } = await context.params;

  // Verify the session belongs to the user
  const targetSession = await userSessionService.getSessionById(sessionId);

  if (!targetSession) {
    throw new NotFoundError("Session not found");
  }

  if (targetSession.userId !== session.user.id) {
    throw new ForbiddenError();
  }

  const sessionDeviceInfo = `${targetSession.browser ?? "Unknown"} on ${targetSession.os ?? "Unknown"}`;

  await userSessionService.revokeSession(sessionId, "User revoked");

  // Log activity
  await activityService.logAction(
    session,
    "revoke_own",
    "sessions",
    { type: "session", id: sessionId, name: sessionDeviceInfo },
    {
      metadata: {
        browser: targetSession.browser ?? "Unknown",
        os: targetSession.os ?? "Unknown",
      },
    },
  );

  return NextResponse.json({
    success: { code: "profile.sessions.revoked" },
    sessionId,
  });
});
