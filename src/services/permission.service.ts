// Import from types-only module to avoid circular dependency
import type { Permission, PermissionNew } from "@/schema/permissions.schema";
import type { RoleNew } from "@/schema/roles.schema";
import {
  RESOURCE_ACTIONS,
  type CoreAction,
  type CorePermissionString,
  type CoreResource,
} from "@/types/permissions/permissions";
import type { PermissionGroup } from "@/storage/permission.storage";
import { permissionStorage } from "@/storage/runtime/permission";
import { roleStorage } from "@/storage/runtime/role";
import { userStorage } from "@/storage/runtime/user";

/**
 * Core permission definition with typed resource and action
 */
interface CorePermissionDef {
  resource: CoreResource;
  action: CoreAction;
  description: string;
}

/**
 * Permission descriptions for each resource.action combination
 */
const PERMISSION_DESCRIPTIONS: Record<CorePermissionString, string> = {
  // Users
  "users.view": "View users list and details",
  "users.create": "Create new users",
  "users.edit": "Edit user details",
  "users.delete": "Delete users",
  "users.activate": "Activate/deactivate users",
  "users.app-permissions": "Manage user app permissions",

  // Roles
  "roles.view": "View roles and permissions",
  "roles.create": "Create new roles",
  "roles.edit": "Edit roles and assign permissions",
  "roles.delete": "Delete roles",

  // Settings
  "settings.view": "View system settings",
  "settings.edit": "Modify system settings",

  // Sessions
  "sessions.view": "View active user sessions",
  "sessions.revoke": "Revoke user sessions",

  // System
  "system.view": "View system status and logs",
  "system.setup": "Access system setup and configuration",
  "system.backup": "Manage backups and restore",

  // Activity
  "activity.view": "View activity",
  "activity.verify": "Verify activity log integrity",
};

/**
 * Generate CORE_PERMISSIONS array from RESOURCE_ACTIONS constant
 * This ensures type safety and single source of truth
 */
function generateCorePermissions(): CorePermissionDef[] {
  const permissions: CorePermissionDef[] = [];

  for (const [resource, actions] of Object.entries(RESOURCE_ACTIONS)) {
    for (const action of actions) {
      const key = `${resource}.${action}` as CorePermissionString;
      permissions.push({
        resource: resource as CoreResource,
        action: action as CoreAction,
        description: PERMISSION_DESCRIPTIONS[key],
      });
    }
  }

  return permissions;
}

/**
 * Core system permissions (non-module)
 * Module permissions (notes.*, tasks.*, etc.) are now handled via per-user app permissions
 */
export const CORE_PERMISSIONS: Omit<PermissionNew, "id">[] = generateCorePermissions();

/**
 * Get all permissions to seed (core only - module permissions are per-user)
 */
export function getAllPermissionsToSeed(): Omit<PermissionNew, "id">[] {
  // Only return core permissions - module permissions are managed per-user
  return [...CORE_PERMISSIONS];
}

/**
 * Default role configurations
 */
export function getDefaultRoles() {
  const allPermissions = getAllPermissionsToSeed();
  const allPermissionStrings = allPermissions.map((p) => `${p.resource}.${p.action}`);

  return {
    system: {
      name: "system",
      displayName: "System",
      description: "System administrator with full access.",
      isProtected: true,
      isSystem: true,
      permissions: allPermissionStrings,
    },
    admin: {
      name: "admin",
      displayName: "Admin",
      description: "Full system access with all permissions",
      isProtected: false,
      isSystem: false,
      permissions: allPermissionStrings,
    },
    user: {
      name: "user",
      displayName: "User",
      description: "Standard user with limited access",
      isProtected: false,
      isSystem: false,
      permissions: ["settings.view"],
    },
  };
}

export class PermissionService {
  /**
   * Get all permissions
   */
  async getAllPermissions(): Promise<Permission[]> {
    return permissionStorage.findMany();
  }

  /**
   * Get permissions grouped by resource
   */
  async getPermissionsGrouped(): Promise<PermissionGroup[]> {
    return permissionStorage.findGroupedByResource();
  }

  /**
   * Get permission by ID
   */
  async getPermissionById(id: string): Promise<Permission | null> {
    const permission = await permissionStorage.findById(id);
    return permission ?? null;
  }

  /**
   * Get permission by resource and action
   */
  async getPermissionByResourceAction(
    resource: string,
    action: string,
  ): Promise<Permission | null> {
    const permission = await permissionStorage.findByResourceAction(resource, action);
    return permission ?? null;
  }

  /**
   * Get permissions by resource
   */
  async getPermissionsByResource(resource: string): Promise<Permission[]> {
    return permissionStorage.findByResource(resource);
  }

  /**
   * Get all unique resources
   */
  async getResources(): Promise<string[]> {
    return permissionStorage.getResources();
  }

  /**
   * Check if user has a specific permission
   */
  async userHasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    // Get user's role
    const user = await userStorage.findById(userId);
    if (!user || !user.roleId) {
      return false;
    }

    // Check role's permissions
    return roleStorage.hasPermission(user.roleId, resource, action);
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await userStorage.findById(userId);
    if (!user || !user.roleId) {
      return [];
    }

    return roleStorage.getRolePermissions(user.roleId);
  }

  /**
   * Seed default permissions (core + module permissions)
   */
  async seedPermissions(): Promise<Permission[]> {
    const created: Permission[] = [];
    const allPermissions = getAllPermissionsToSeed();

    for (const permData of allPermissions) {
      const existing = await permissionStorage.findByResourceAction(
        permData.resource,
        permData.action,
      );
      if (!existing) {
        const permission = await permissionStorage.create(permData as PermissionNew);
        created.push(permission);
      }
    }

    return created;
  }

  /**
   * Seed default roles with permissions
   */
  async seedRoles(): Promise<void> {
    // First ensure permissions exist
    await this.seedPermissions();

    const defaultRoles = getDefaultRoles();

    for (const [, roleConfig] of Object.entries(defaultRoles)) {
      // Check if role exists
      let role = await roleStorage.findByName(roleConfig.name);

      if (!role) {
        // Create role
        role = await roleStorage.create({
          name: roleConfig.name,
          displayName: roleConfig.displayName,
          description: roleConfig.description,
          isProtected: roleConfig.isProtected,
          isSystem: roleConfig.isSystem,
        } as RoleNew);
      } else {
        // Update displayName if it doesn't match (for existing roles)
        if (role.displayName !== roleConfig.displayName) {
          await roleStorage.update(role.id, { displayName: roleConfig.displayName });
        }
      }

      // Set permissions
      const permissionIds: string[] = [];
      for (const permString of roleConfig.permissions) {
        const [resource, action] = permString.split(".");
        const permission = await permissionStorage.findByResourceAction(resource, action);
        if (permission) {
          permissionIds.push(permission.id);
        }
      }

      await roleStorage.setRolePermissions(role.id, permissionIds);
    }
  }

  /**
   * Get admin role
   */
  async getAdminRole() {
    return roleStorage.findByName("admin");
  }

  /**
   * Get user role (default)
   */
  async getUserRole() {
    return roleStorage.findByName("user");
  }
}
