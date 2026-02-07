import { NextRequest, NextResponse } from "next/server";
import { UserDTO } from "@/dtos/user.dto";
import type { ActivityChange } from "@/types/common/activity.types";
import { withErrorHandler } from "@/lib/api-handler";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
import { validatePasswordServer } from "@/lib/password-policy.server";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { roleService } from "@/services/runtime/role";
import { userService } from "@/services/runtime/user";
import { userSessionService } from "@/services/runtime/user-session";
import { updateUserRequestSchema } from "@/validations/user.validations";

type RouteParams = {
  params: Promise<{ userId: string }>;
};

/**
 * PUT - Update user
 */
export const PUT = withErrorHandler(async (request: NextRequest, context: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("users", "edit");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { userId } = await context.params;

  // Check if user exists and if they have a system role
  const existingUser = await userService.getUserByIdWithRole(userId);
  if (!existingUser) {
    throw new NotFoundError("User");
  }

  // Check if user has a system role
  if (existingUser.roleId) {
    const userRole = await roleService.getRoleById(existingUser.roleId);
    if (userRole?.isSystem) {
      throw new ForbiddenError("System users cannot be modified");
    }
  }

  const body = await request.json();
  const validatedData = updateUserRequestSchema.parse(body);

  // Prevent assigning system role to users
  if (validatedData.roleId) {
    const targetRole = await roleService.getRoleById(validatedData.roleId);
    if (targetRole?.isSystem) {
      throw new ForbiddenError("Cannot assign system role to users through the UI");
    }
  }

  // Validate password against policy if provided
  if (validatedData.password && validatedData.password !== "") {
    const passwordValidation = await validatePasswordServer(validatedData.password);
    if (!passwordValidation.valid) {
      const firstError = passwordValidation.errors[0];
      throw new ValidationError(
        firstError?.key ?? "validation.passwordRequirements",
        firstError?.params,
      );
    }
  }

  // Remove empty password from validatedData to avoid updating it
  if (validatedData.password === "") {
    delete validatedData.password;
  }

  let updatedUser;
  try {
    updatedUser = await userService.updateUser(userId, validatedData);
  } catch (err: unknown) {
    const updateError = err as { message?: string; cause?: { code?: string } };
    if (updateError.message?.includes("not found")) {
      throw new NotFoundError("User");
    }
    // Check for unique constraint violation (duplicate email)
    if (updateError.cause?.code === "23505") {
      throw new ConflictError("Email address is already in use", "EMAIL_IN_USE");
    }
    throw err;
  }

  // Build changes array for activity logging
  const changes: ActivityChange[] = [];

  // Check each field that could be updated
  if (validatedData.name !== undefined && validatedData.name !== existingUser.name) {
    changes.push({ field: "name", from: existingUser.name, to: validatedData.name });
  }
  if (validatedData.email !== undefined && validatedData.email !== existingUser.email) {
    changes.push({ field: "email", from: existingUser.email, to: validatedData.email });
  }
  if (validatedData.roleId !== undefined && validatedData.roleId !== existingUser.roleId) {
    // Get role names for better logging
    const oldRole = existingUser.roleId ? await roleService.getRoleById(existingUser.roleId) : null;
    const newRole = validatedData.roleId
      ? await roleService.getRoleById(validatedData.roleId)
      : null;

    changes.push({
      field: "role",
      from: oldRole?.name || null,
      to: newRole?.name || null,
    });
  }
  // Log password change without showing the actual value
  if (validatedData.password) {
    changes.push({ field: "password", to: "(changed)" });
  }

  // Log activity only if something changed
  if (changes.length > 0) {
    await activityService.logUpdate(
      session,
      "users",
      { type: "user", id: userId, name: existingUser.name || existingUser.email },
      changes,
    );
  }

  // Revoke sessions if role changed to enforce new permissions immediately
  if (validatedData.roleId !== undefined && validatedData.roleId !== existingUser.roleId) {
    await userSessionService.revokeSessionsForRoleChange(
      userId,
      session!.user.sessionId, // Preserve admin's session
    );
  }

  // Transform to DTO to exclude password hash
  const updatedRole = updatedUser.roleId ? await roleService.getRoleById(updatedUser.roleId) : null;
  const userWithRole = {
    ...updatedUser,
    roleName: updatedRole?.name ?? null,
    isSystemRole: updatedRole?.isSystem ?? false,
  };
  const userResponse = UserDTO.toAdminDetailResponse(userWithRole);

  return NextResponse.json({ user: userResponse });
});

/**
 * DELETE - Soft delete (deactivate) user
 * @deprecated Use POST /api/admin/users/:userId/deactivate instead
 * Kept for backward compatibility
 */
export const DELETE = withErrorHandler(async (request: NextRequest, context: RouteParams) => {
  const { userId } = await context.params;
  const { authorized, error, status, session } = await requirePermission("users", "activate");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  // Don't allow admin to deactivate themselves
  if (session && userId === session.user.id) {
    throw new ValidationError("Cannot deactivate your own account");
  }

  // Check if user exists and if they have a system role
  const existingUser = await userService.getUserByIdWithRole(userId);
  if (!existingUser) {
    throw new NotFoundError("User");
  }

  // Check if user has a system role
  if (existingUser.roleId) {
    const userRole = await roleService.getRoleById(existingUser.roleId);
    if (userRole?.isSystem) {
      throw new ForbiddenError("System users cannot be deactivated");
    }
  }

  // Soft delete (deactivate) user
  let deactivatedUser;
  try {
    deactivatedUser = await userService.deactivateUser(userId);
  } catch (err: unknown) {
    const deactivateError = err as { message?: string };
    if (deactivateError.message?.includes("not found")) {
      throw new NotFoundError("User");
    }
    throw err;
  }

  // Log activity
  await activityService.logAction(session, "deactivate", "users", {
    type: "user",
    id: userId,
    name: existingUser.name || existingUser.email,
  });

  // Transform to DTO to exclude password hash
  const deactivatedRole = deactivatedUser.roleId
    ? await roleService.getRoleById(deactivatedUser.roleId)
    : null;
  const userWithRole = {
    ...deactivatedUser,
    roleName: deactivatedRole?.name ?? null,
    isSystemRole: deactivatedRole?.isSystem ?? false,
  };
  const userResponse = UserDTO.toAdminDetailResponse(userWithRole);

  return NextResponse.json({
    message: "User deactivated successfully",
    user: userResponse,
  });
});
