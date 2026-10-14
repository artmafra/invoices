import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { requireStepUpAuth } from "@/lib/step-up-auth";
import { activityService } from "@/services/runtime/activity";
import { roleService } from "@/services/runtime/role";
import { userService } from "@/services/runtime/user";
import { userSessionService } from "@/services/runtime/user-session";
import { userIdParamSchema } from "@/validations/user.validations";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

/**
 * POST - Start impersonating a user
 * Only system users can impersonate other users.
 * The impersonation is stored on the current session; the client then refetches the session.
 */
export const POST = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const session = await auth();

  if (!session?.user) {
    throw new UnauthorizedError();
  }

  // Only system users can impersonate
  if (session.user.role !== "system") {
    throw new ForbiddenError("Only system administrators can impersonate users");
  }

  // SECURITY: Require step-up authentication for impersonation
  requireStepUpAuth(session);

  const { userId } = userIdParamSchema.parse(await params);

  // Prevent impersonating yourself
  if (userId === session.user.id) {
    throw new ValidationError("Cannot impersonate yourself", "CANNOT_IMPERSONATE_SELF");
  }

  // Prevent impersonating while already impersonating
  if (session.user.impersonatedBy) {
    throw new ValidationError(
      "Cannot start new impersonation while already impersonating. Exit current impersonation first.",
      "ALREADY_IMPERSONATING",
    );
  }

  // Get target user
  const targetUser = await userService.getUserById(userId);

  if (!targetUser) {
    throw new NotFoundError("User", "USER_NOT_FOUND");
  }

  // Check if target is a system user
  if (targetUser.roleId) {
    const targetRole = await roleService.getRoleById(targetUser.roleId);
    if (targetRole?.isSystem) {
      throw new ForbiddenError("Cannot impersonate system users", "CANNOT_IMPERSONATE_SYSTEM");
    }
  }

  // Check if user is active
  if (!targetUser.isActive) {
    throw new ValidationError("Cannot impersonate inactive users", "USER_INACTIVE");
  }

  if (!session.sessionId) {
    throw new UnauthorizedError();
  }

  // Log impersonation start
  await activityService.logAction(session, "impersonate.start", "user", {
    type: "user",
    id: targetUser.id,
    name: targetUser.name,
  });

  // The session row owner stays the admin; the session resolves to the target user
  await userSessionService.setImpersonatedUser(session.sessionId, targetUser.id);

  return NextResponse.json({
    success: true,
    impersonatedUser: { id: targetUser.id, name: targetUser.name },
  });
});

/**
 * DELETE - End impersonation and restore original user session
 */
export const DELETE = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const session = await auth();

  if (!session?.user) {
    throw new UnauthorizedError();
  }

  // Check if currently impersonating
  if (!session.user.impersonatedBy) {
    throw new ValidationError("Not currently impersonating anyone");
  }

  const { userId } = userIdParamSchema.parse(await params);
  const originalAdminId = session.user.impersonatedBy.id;

  // Validate the userId matches the current impersonated user (optional safety check)
  if (userId !== session.user.id) {
    throw new ValidationError("User ID mismatch");
  }

  // Get original admin user data
  const originalUser = await userService.getUserById(originalAdminId);

  if (!originalUser || !session.sessionId) {
    throw new NotFoundError("Original user", "USER_NOT_FOUND");
  }

  // Log impersonation end (log as original admin, not the impersonated user)
  await activityService.logAction(
    { user: { id: originalAdminId, name: session.user.impersonatedBy.name } },
    "impersonate.end",
    "user",
    {
      type: "user",
      id: session.user.id,
      name: session.user.name ?? undefined,
    },
  );

  await userSessionService.setImpersonatedUser(session.sessionId, null);

  return NextResponse.json({ success: true });
});
