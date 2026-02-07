import { RoleDTO } from "@/dtos/role.dto";
import type { Role, RoleNew } from "@/schema/roles.schema";
import type { PaginatedRolesResponse } from "@/types/common/roles.types";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { slugify } from "@/lib/utils";
import type { RoleWithPermissions } from "@/storage/role.storage";
import { permissionStorage } from "@/storage/runtime/permission";
import { roleStorage } from "@/storage/runtime/role";
import { userStorage } from "@/storage/runtime/user";
import type { FilterOptions, PaginationOptions } from "@/storage/types";

export class RoleService {
  /**
   * Get role by ID
   */
  async getRoleById(id: string): Promise<Role | null> {
    const role = await roleStorage.findById(id);
    return role ?? null;
  }

  /**
   * Get role by ID with permissions
   */
  async getRoleByIdWithPermissions(id: string): Promise<RoleWithPermissions | null> {
    const role = await roleStorage.findByIdWithPermissions(id);
    return role ?? null;
  }

  /**
   * Get role by name
   */
  async getRoleByName(name: string): Promise<Role | null> {
    const role = await roleStorage.findByName(name);
    return role ?? null;
  }

  /**
   * Get all roles
   */
  async getAllRoles(): Promise<Role[]> {
    return roleStorage.findMany();
  }

  /**
   * Get all roles with permissions
   * @param filters - Optional filters including search
   */
  async getAllRolesWithPermissions(filters?: FilterOptions): Promise<RoleWithPermissions[]> {
    return roleStorage.findManyWithPermissions(filters);
  }

  /**
   * Get roles that can be assigned to users (excludes system roles)
   */
  async getAssignableRoles(): Promise<Role[]> {
    return roleStorage.findAssignable();
  }

  /**
   * Get assignable roles with permissions
   */
  async getAssignableRolesWithPermissions(): Promise<RoleWithPermissions[]> {
    return roleStorage.findAssignableWithPermissions();
  }

  /**
   * Get paginated roles with filters (returns DTO for API)
   * @param userCounts Optional map of roleId -> user count (will fetch if not provided)
   */
  async getRoles(
    filters?: FilterOptions,
    options?: PaginationOptions,
    userCounts?: Record<string, number>,
  ): Promise<PaginatedRolesResponse> {
    const result = await roleStorage.findManyPaginated(filters, options);
    const counts = userCounts ?? (await this.getUserCountsByRole());
    return RoleDTO.toPaginatedResponse(result, counts);
  }

  /**
   * Get collection version for ETag generation.
   */
  async getCollectionVersion(filters?: FilterOptions) {
    return roleStorage.getCollectionVersion(filters);
  }

  /**
   * Create a new role
   * @param roleData - Role data with displayName (name is auto-generated)
   * @param permissionIds - Optional permission IDs to assign
   * @throws {ValidationError} When display name contains invalid characters or name already exists
   */
  async createRole(
    roleData: Omit<RoleNew, "id" | "name" | "createdAt" | "updatedAt"> & { displayName: string },
    permissionIds?: string[],
  ): Promise<RoleWithPermissions> {
    // Auto-generate slug from displayName
    const name = slugify(roleData.displayName);

    if (!name) {
      throw new ValidationError(
        "Display name must contain valid characters",
        "INVALID_DISPLAY_NAME",
      );
    }

    // Check if role name already exists
    const existing = await roleStorage.findByName(name);
    if (existing) {
      throw new ValidationError(
        `Role name '${roleData.displayName}' is already in use (generated key: '${name}')`,
        "ROLE_NAME_EXISTS",
      );
    }

    const role = await roleStorage.create({
      ...roleData,
      name,
    } as RoleNew);

    // Set permissions if provided
    if (permissionIds && permissionIds.length > 0) {
      await roleStorage.setRolePermissions(role.id, permissionIds);
    }

    const permissions = await roleStorage.getRolePermissions(role.id);
    return { ...role, permissions };
  }

  /**
   * Update role
   * Note: name is immutable after creation - only displayName, description, and permissions can be changed
   * @throws {NotFoundError} When role does not exist
   * @throws {ForbiddenError} When trying to modify protected role settings or permissions
   */
  async updateRole(
    id: string,
    roleData: Partial<Omit<RoleNew, "id" | "name" | "createdAt" | "updatedAt">>,
    permissionIds?: string[],
  ): Promise<RoleWithPermissions> {
    const existingRole = await roleStorage.findById(id);
    if (!existingRole) {
      throw new NotFoundError("Role", "ROLE_NOT_FOUND");
    }

    // Check if role is protected and trying to change isProtected status
    if (existingRole.isProtected && roleData.isProtected === false) {
      throw new ForbiddenError("Cannot unprotect a protected role", "PROTECTED_ROLE_MODIFICATION");
    }

    const updatedRole = await roleStorage.update(id, roleData);

    // Update permissions if provided
    if (permissionIds !== undefined) {
      // For protected roles, ensure critical permissions are maintained
      if (existingRole.isProtected) {
        const criticalPermissions = await this.getCriticalPermissionIds();
        const missingCritical = criticalPermissions.filter((p) => !permissionIds.includes(p));
        if (missingCritical.length > 0) {
          throw new ForbiddenError(
            "Cannot remove critical permissions from protected role",
            "PROTECTED_ROLE_PERMISSIONS",
          );
        }
      }
      await roleStorage.setRolePermissions(id, permissionIds);
    }

    const permissions = await roleStorage.getRolePermissions(id);
    return { ...updatedRole, permissions };
  }

  /**
   * Delete role
   * @throws {NotFoundError} When role does not exist
   * @throws {ForbiddenError} When trying to delete a protected role
   * @throws {ConflictError} When role has assigned users
   */
  async deleteRole(id: string): Promise<boolean> {
    const role = await roleStorage.findById(id);
    if (!role) {
      throw new NotFoundError("Role", "ROLE_NOT_FOUND");
    }

    if (role.isProtected) {
      throw new ForbiddenError("Cannot delete a protected role", "PROTECTED_ROLE_DELETION");
    }

    // Check if any users have this role
    const userCounts = await roleStorage.countUsersByRole();
    if (userCounts[id] > 0) {
      throw new ConflictError(
        `Cannot delete role with ${userCounts[id]} assigned user(s). Reassign users first.`,
        "ROLE_IN_USE",
      );
    }

    return roleStorage.delete(id);
  }

  /**
   * Get permissions for a role
   */
  async getRolePermissions(roleId: string): Promise<string[]> {
    return roleStorage.getRolePermissions(roleId);
  }

  /**
   * Set permissions for a role
   * @throws {NotFoundError} When role does not exist
   * @throws {ForbiddenError} When trying to remove critical permissions from protected role
   */
  async setRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    const role = await roleStorage.findById(roleId);
    if (!role) {
      throw new NotFoundError("Role", "ROLE_NOT_FOUND");
    }

    // For protected roles, ensure critical permissions are maintained
    if (role.isProtected) {
      const criticalPermissions = await this.getCriticalPermissionIds();
      const missingCritical = criticalPermissions.filter((p) => !permissionIds.includes(p));
      if (missingCritical.length > 0) {
        throw new ForbiddenError(
          "Cannot remove critical permissions from protected role",
          "PROTECTED_ROLE_PERMISSIONS",
        );
      }
    }

    return roleStorage.setRolePermissions(roleId, permissionIds);
  }

  /**
   * Get critical permission IDs (roles.view, roles.edit)
   */
  async getCriticalPermissionIds(): Promise<string[]> {
    const rolesView = await permissionStorage.findByResourceAction("roles", "view");
    const rolesEdit = await permissionStorage.findByResourceAction("roles", "edit");

    const ids: string[] = [];
    if (rolesView) ids.push(rolesView.id);
    if (rolesEdit) ids.push(rolesEdit.id);
    return ids;
  }

  /**
   * Check if role has permission
   */
  async roleHasPermission(roleId: string, resource: string, action: string): Promise<boolean> {
    return roleStorage.hasPermission(roleId, resource, action);
  }

  /**
   * Get user counts per role
   */
  async getUserCountsByRole(): Promise<Record<string, number>> {
    return roleStorage.countUsersByRole();
  }

  /**
   * Validate self-demotion
   * Returns error message if demotion would lock out user, null otherwise
   */
  async validateSelfDemotion(
    userId: string,
    currentRoleId: string,
    newRoleId: string,
  ): Promise<string | null> {
    // If role not changing, no issue
    if (currentRoleId === newRoleId) {
      return null;
    }

    // Check if current role has roles.edit permission
    const currentHasRolesEdit = await roleStorage.hasPermission(currentRoleId, "roles", "edit");
    if (!currentHasRolesEdit) {
      return null; // Not currently managing roles, no self-demotion issue
    }

    // Check if new role has roles.edit permission
    const newHasRolesEdit = await roleStorage.hasPermission(newRoleId, "roles", "edit");
    if (newHasRolesEdit) {
      return null; // New role still has roles.edit, no issue
    }

    // Would lose roles.edit permission - check if there are other users with roles.edit
    const rolesWithEdit = await roleStorage.getRolesWithPermission("roles", "edit");
    const roleIdsWithEdit = rolesWithEdit.map((r) => r.id);

    // Get all users with roles that have roles.edit permission
    const users = await userStorage.findMany({ isActive: true });
    const usersWithRolesEdit = users.filter(
      (u) => u.roleId && roleIdsWithEdit.includes(u.roleId) && u.id !== userId,
    );

    if (usersWithRolesEdit.length === 0) {
      return "Cannot demote yourself - you are the only user with role management permissions";
    }

    return null;
  }
}
