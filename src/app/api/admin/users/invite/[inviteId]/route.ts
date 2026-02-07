import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { inviteService } from "@/services/runtime/invite";

type RouteParams = {
  params: Promise<{ inviteId: string }>;
};

/**
 * DELETE - Cancel a pending invitation
 */
export const DELETE = withErrorHandler(async (request: NextRequest, context: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("users", "create");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { inviteId } = await context.params;

  await inviteService.cancelInvite(inviteId);

  // Log activity
  await activityService.logAction(session, "invite_cancel", "users", {
    type: "invitation",
    id: inviteId,
    name: "Invitation",
  });

  return NextResponse.json({ message: "Invitation cancelled successfully" });
});

/**
 * PUT - Resend a pending invitation
 */
export const PUT = withErrorHandler(async (request: NextRequest, context: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("users", "create");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { inviteId } = await context.params;

  await inviteService.resendInvite(inviteId, session!.user.id);

  // Log activity
  await activityService.logAction(session, "invite_resend", "users", {
    type: "invitation",
    id: inviteId,
    name: "Invitation",
  });

  return NextResponse.json({ message: "Invitation resent successfully" });
});
