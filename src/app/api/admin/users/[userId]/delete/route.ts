import { NextRequest, NextResponse } from "next/server";
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
 * POST /api/admin/users/:userId/delete
 * Permanently delete a user account
 */
export const POST = withErrorHandler(async (request: NextRequest, context: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("users", "delete");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { userId } = await context.params;

  // Don't allow admin to delete themselves
  if (session && userId === session.user.id) {
    throw new ValidationError("Cannot delete your own account");
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
      throw new ForbiddenError("System users cannot be deleted");
    }
  }

  // Permanently delete user
  try {
    await userService.deleteUser(userId);
  } catch (err: unknown) {
    const deleteError = err as { message?: string };
    if (deleteError.message?.includes("not found")) {
      throw new NotFoundError("User");
    }
    throw err;
  }

  // Log activity
  await activityService.logDelete(session, "users", {
    type: "user",
    id: userId,
    name: existingUser.email,
  });

  return NextResponse.json({
    message: "User permanently deleted",
  });
});
