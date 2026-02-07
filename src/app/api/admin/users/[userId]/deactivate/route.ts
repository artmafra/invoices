import { NextRequest, NextResponse } from "next/server";
import { UserDTO } from "@/dtos/user.dto";
import { withErrorHandler } from "@/lib/api-handler";
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { roleService } from "@/services/runtime/role";
import { userService } from "@/services/runtime/user";

type RouteParams = {
  params: Promise<{ userId: string }>;
};

/**
 * POST /api/admin/users/:userId/deactivate
 * Soft delete (deactivate) a user account
 */
export const POST = withErrorHandler(async (request: NextRequest, context: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("users", "activate");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { userId } = await context.params;

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
