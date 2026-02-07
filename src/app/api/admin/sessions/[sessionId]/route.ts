import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { userService } from "@/services/runtime/user";
import { userSessionService } from "@/services/runtime/user-session";

type RouteParams = {
  params: Promise<{ sessionId: string }>;
};

/**
 * DELETE - Revoke a specific session (admin)
 */
export const DELETE = withErrorHandler(async (request: NextRequest, context: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("sessions", "revoke");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { sessionId } = await context.params;

  const targetSession = await userSessionService.getSessionById(sessionId);

  if (!targetSession) {
    throw new NotFoundError("Session");
  }

  // Get user info for logging
  const sessionUser = await userService.getUserById(targetSession.userId);
  const sessionUserName = sessionUser?.name || sessionUser?.email || targetSession.userId;
  const sessionDeviceInfo = `${targetSession.browser ?? "Unknown"} on ${targetSession.os ?? "Unknown"}`;

  await userSessionService.revokeSession(sessionId, "Admin revoked");

  // Log activity - session as target, user as related
  await activityService.logAction(
    session,
    "revoke",
    "sessions",
    { type: "session", id: sessionId, name: sessionDeviceInfo },
    {
      relatedTargets: [{ type: "user", id: targetSession.userId, name: sessionUserName }],
      metadata: {
        browser: targetSession.browser ?? "Unknown",
        os: targetSession.os ?? "Unknown",
      },
    },
  );

  return NextResponse.json({
    success: { code: "admin.sessions.revoked" },
    sessionId,
  });
});
