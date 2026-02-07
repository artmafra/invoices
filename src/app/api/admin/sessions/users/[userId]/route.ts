import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { userService } from "@/services/runtime/user";
import { userSessionService } from "@/services/runtime/user-session";

type RouteParams = {
  params: Promise<{ userId: string }>;
};

/**
 * DELETE - Revoke all sessions for a specific user (admin)
 */
export const DELETE = withErrorHandler(async (request: NextRequest, context: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("sessions", "revoke");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { userId } = await context.params;

  // Get the target user's email for logging
  const targetUser = await userService.getUserById(userId);
  const targetUserName = targetUser?.name || targetUser?.email || userId;

  // Revoke all sessions for a specific user
  const count = await userSessionService.revokeAllUserSessions(userId);

  // Log activity
  await activityService.logAction(
    session,
    "revoke_all",
    "sessions",
    { type: "user-sessions", id: userId, name: targetUserName },
    { metadata: { revokedCount: count } },
  );

  return NextResponse.json({
    success: { code: "admin.sessions.revoked_all" },
    revokedCount: count,
  });
});
