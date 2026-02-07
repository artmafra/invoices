import { NextRequest, NextResponse } from "next/server";
import type { ActivityChange } from "@/types/common/activity.types";
import { withErrorHandler } from "@/lib/api-handler";
import {
  ConflictError,
  ForbiddenError,
  fromZodError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { permissionService } from "@/services/runtime/permission";
import { roleService } from "@/services/runtime/role";
import { userSessionService } from "@/services/runtime/user-session";
import { updateRoleSchema } from "@/validations/role.validations";

type RouteParams = {
  params: Promise<{ roleId: string }>;
};

/**
 * PUT - Update role
 */
export const PUT = withErrorHandler(async (request: NextRequest, context: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("roles", "edit");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { roleId } = await context.params;

  // Check if role is a system role
  const existingRole = await roleService.getRoleByIdWithPermissions(roleId);
  if (!existingRole) {
    throw new NotFoundError("Role");
  }

  if (existingRole.isSystem) {
    throw new ForbiddenError("System roles cannot be modified");
  }

  const body = await request.json();
  const parseResult = updateRoleSchema.safeParse(body);
  if (!parseResult.success) {
    throw fromZodError(parseResult.error);
  }
  const validatedData = parseResult.data;

  // Get all permissions for name lookups
  const allPermissions = await permissionService.getAllPermissions();
  const permissionIdToName = (id: string) => {
    const perm = allPermissions.find((p) => p.id === id);
    return perm ? `${perm.resource}.${perm.action}` : id;
  };

  // Check for self-demotion if updating permissions
  if (validatedData.permissionIds !== undefined && session?.user?.roleId === roleId) {
    const currentPermissions = session.user.permissions || [];

    // Convert permission IDs to permission strings
    const newPermissions = validatedData.permissionIds
      .map((id) => permissionIdToName(id))
      .filter((p) => !p.includes("-")); // Filter out ones that are still IDs (not found)

    // Check if losing roles.edit permission
    if (currentPermissions.includes("roles.edit") && !newPermissions.includes("roles.edit")) {
      throw new ValidationError("Cannot remove your own role editing permissions");
    }
  }

  let role;
  try {
    role = await roleService.updateRole(
      roleId,
      {
        displayName: validatedData.displayName,
        description: validatedData.description,
      },
      validatedData.permissionIds,
    );
  } catch (err: unknown) {
    const updateError = err as Error;
    if (updateError.message?.includes("not found")) {
      throw new NotFoundError("Role");
    }
    if (updateError.message?.includes("already exists")) {
      throw new ConflictError(updateError.message, "ROLE_NAME_EXISTS");
    }
    if (updateError.message?.includes("protected") || updateError.message?.includes("critical")) {
      throw new ValidationError(updateError.message);
    }
    throw err;
  }

  // Build changes array for activity logging
  const changes: ActivityChange[] = [];

  if (
    validatedData.displayName !== undefined &&
    validatedData.displayName !== existingRole.displayName
  ) {
    changes.push({
      field: "displayName",
      from: existingRole.displayName,
      to: validatedData.displayName,
    });
  }
  if (
    validatedData.description !== undefined &&
    validatedData.description !== existingRole.description
  ) {
    changes.push({
      field: "description",
      from: existingRole.description,
      to: validatedData.description,
    });
  }
  if (validatedData.permissionIds !== undefined) {
    // Get old permission names (permissions is already string[] like "users.view")
    const oldPermissionNames = existingRole.permissions;
    const newPermissionNames = validatedData.permissionIds.map((id) => permissionIdToName(id));

    // Calculate added and removed permissions
    const added = newPermissionNames.filter((p) => !oldPermissionNames.includes(p));
    const removed = oldPermissionNames.filter((p) => !newPermissionNames.includes(p));

    if (added.length > 0 || removed.length > 0) {
      changes.push({
        field: "permissions",
        added: added.length > 0 ? added : undefined,
        removed: removed.length > 0 ? removed : undefined,
      });
    }
  }

  // Log activity only if something changed
  if (changes.length > 0) {
    await activityService.logUpdate(
      session,
      "roles",
      { type: "role", id: roleId, name: existingRole.displayName },
      changes,
    );
  }

  // Revoke sessions for all users with this role if permissions changed
  const permissionsChanged = changes.some((c) => c.field === "permissions");
  if (permissionsChanged) {
    await userSessionService.revokeSessionsForRolePermissionsUpdate(
      roleId,
      session!.user.sessionId, // Preserve admin's session
    );
  }

  return NextResponse.json({ role });
});

/**
 * DELETE - Delete role
 */
export const DELETE = withErrorHandler(async (request: NextRequest, context: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("roles", "delete");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { roleId } = await context.params;

  // Check if role is a system role
  const existingRole = await roleService.getRoleById(roleId);
  if (!existingRole) {
    throw new NotFoundError("Role");
  }

  if (existingRole.isSystem) {
    throw new ForbiddenError("System roles cannot be deleted");
  }

  // Prevent deleting your own role
  if (session?.user?.roleId === roleId) {
    throw new ValidationError("Cannot delete your own role");
  }

  try {
    await roleService.deleteRole(roleId);
  } catch (err: unknown) {
    const deleteError = err as Error;
    if (deleteError.message?.includes("not found")) {
      throw new NotFoundError("Role");
    }
    if (deleteError.message?.includes("protected")) {
      throw new ValidationError(deleteError.message);
    }
    if (deleteError.message?.includes("assigned user")) {
      throw new ValidationError(deleteError.message);
    }
    throw err;
  }

  // Log activity
  await activityService.logDelete(session, "roles", {
    type: "role",
    id: roleId,
    name: existingRole.displayName,
  });

  return NextResponse.json({ message: "Role deleted successfully" });
});
