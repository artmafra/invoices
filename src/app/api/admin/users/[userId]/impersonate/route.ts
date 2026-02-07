import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { auth, generateSessionUpdateToken } from "@/lib/auth";
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { activityService } from "@/services/runtime/activity";
import { appPermissionsService } from "@/services/runtime/app-permissions";
import { permissionService } from "@/services/runtime/permission";
import { roleService } from "@/services/runtime/role";
import { userService } from "@/services/runtime/user";
import { userIdParamSchema } from "@/validations/user.validations";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

/**
 * POST - Start impersonating a user
 * Only system users can impersonate other users.
 * Returns user data for client to update session via update()
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
    throw new NotFoundError("User");
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

  // Get target user's role and permissions
  let roleName = "user";
  let rolePermissions: string[] = [];
  if (targetUser.roleId) {
    const role = await roleService.getRoleById(targetUser.roleId);
    if (role) {
      roleName = role.name;
    }
    rolePermissions = await permissionService.getUserPermissions(targetUser.id);
  }

  // Get target user's app permissions and merge
  const appPermissionsResult = await appPermissionsService.getUserAppPermissionsResult(
    targetUser.id,
  );
  const permissions = [...rolePermissions, ...appPermissionsResult.permissions];
  const apps = appPermissionsResult.apps;

  // Log impersonation start
  await activityService.logAction(session, "impersonate.start", "user", {
    type: "user",
    id: targetUser.id,
    name: targetUser.name || targetUser.email,
  });

  // Build impersonated user data
  const impersonatedUser = {
    id: targetUser.id,
    name: targetUser.name,
    email: targetUser.email,
    image: targetUser.image,
    role: roleName,
    roleId: targetUser.roleId,
    isSystemRole: false, // Target user is validated to not be a system user
    permissions,
    apps,
  };

  // Generate secure token for session update
  // This prevents clients from forging impersonation requests
  const impersonateToken = await generateSessionUpdateToken({
    type: "impersonate",
    userId: session.user.id,
    targetUserId: targetUser.id,
    payload: impersonatedUser,
  });

  // Return data needed to update the session
  return NextResponse.json({
    success: true,
    impersonatedUser,
    impersonateToken, // Client must pass this to session.update()
    originalUser: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      role: session.user.role,
      roleId: session.user.roleId,
      isSystemRole: session.user.isSystemRole,
      permissions: session.user.permissions,
      apps: session.user.apps,
    },
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

  if (!originalUser) {
    throw new NotFoundError("Original user");
  }

  // Get original user's role and permissions
  let roleName = "user";
  let rolePermissions: string[] = [];
  let isSystemRole = false;
  if (originalUser.roleId) {
    const role = await roleService.getRoleById(originalUser.roleId);
    if (role) {
      roleName = role.name;
      isSystemRole = role.isSystem;
    }
    rolePermissions = await permissionService.getUserPermissions(originalUser.id);
  }

  // Get original user's app permissions and merge
  const appPermissionsResult = await appPermissionsService.getUserAppPermissionsResult(
    originalUser.id,
  );
  const permissions = [...rolePermissions, ...appPermissionsResult.permissions];
  const apps = appPermissionsResult.apps;

  // Log impersonation end (log as original admin, not the impersonated user)
  await activityService.logAction(
    { user: { id: originalAdminId, name: session.user.impersonatedBy.name } },
    "impersonate.end",
    "user",
    {
      type: "user",
      id: session.user.id,
      name: (session.user.name || session.user.email) ?? undefined,
    },
  );

  // Build original user data
  const originalUserData = {
    id: originalUser.id,
    name: originalUser.name,
    email: originalUser.email,
    image: originalUser.image,
    role: roleName,
    roleId: originalUser.roleId,
    isSystemRole,
    permissions,
    apps,
  };

  // Generate secure token for session update
  // The token is created for the original admin (who initiated impersonation)
  const endImpersonationToken = await generateSessionUpdateToken({
    type: "end-impersonation",
    userId: originalAdminId,
    payload: originalUserData,
  });

  // Return data needed to restore the session
  return NextResponse.json({
    success: true,
    originalUser: originalUserData,
    endImpersonationToken, // Client must pass this to session.update()
  });
});
