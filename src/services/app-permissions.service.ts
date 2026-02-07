import type { AppPermission } from "@/schema/app-permissions.schema";
import { APPS_REGISTRY, getAppById, type AppId } from "@/config/apps.registry";
import { ValidationError } from "@/lib/errors";
import { appPermissionsStorage } from "@/storage/runtime/app-permissions";

/**
 * Structured representation of a user's app permissions
 */
export interface AppPermissionsResult {
  /** All permissions as "appId.action" strings */
  permissions: string[];
  /** Unique app IDs user has any permission for */
  apps: string[];
  /** Permissions grouped by app */
  byApp: Record<string, string[]>;
}

/**
 * Service for managing per-user app permissions.
 * Controls granular permissions like notes.view, notes.create, tasks.edit, etc.
 */
export class AppPermissionsService {
  /**
   * Get all app permission entries for a user
   */
  async getUserAppPermissionEntries(userId: string): Promise<AppPermission[]> {
    return appPermissionsStorage.findByUserId(userId);
  }

  /**
   * Get all permissions for a user as strings (for session)
   */
  async getUserAppPermissions(userId: string): Promise<string[]> {
    return appPermissionsStorage.getUserPermissionStrings(userId);
  }

  /**
   * Get comprehensive permission result for a user
   */
  async getUserAppPermissionsResult(userId: string): Promise<AppPermissionsResult> {
    const entries = await appPermissionsStorage.findByUserId(userId);

    const permissions: string[] = [];
    const byApp: Record<string, string[]> = {};

    for (const entry of entries) {
      permissions.push(`${entry.appId}.${entry.action}`);
      if (!byApp[entry.appId]) {
        byApp[entry.appId] = [];
      }
      byApp[entry.appId].push(entry.action);
    }

    const apps = Object.keys(byApp);

    return { permissions, apps, byApp };
  }

  /**
   * Get all app IDs a user has any permission for
   */
  async getUserAppIds(userId: string): Promise<string[]> {
    return appPermissionsStorage.getUserAppIds(userId);
  }

  /**
   * Check if user has a specific app permission
   */
  async hasAppPermission(userId: string, appId: string, action: string): Promise<boolean> {
    return appPermissionsStorage.hasPermission(userId, appId, action);
  }

  /**
   * Check if user has access to an app (any permission for that app)
   */
  async hasAppAccess(userId: string, appId: string): Promise<boolean> {
    const actions = await appPermissionsStorage.getUserAppActions(userId, appId);
    return actions.length > 0;
  }

  /**
   * Set permissions for a user in a specific app
   * @param actorId The user performing the action, null for system operations
   * @param targetUserId The user whose permissions are being modified
   * @param appId The app to set permissions for
   * @param actions Array of actions to grant (e.g., ["view", "create", "edit"])
   * @throws {ValidationError} When app ID is invalid or actions are invalid for the app
   */
  async setAppPermissions(
    actorId: string | null,
    targetUserId: string,
    appId: string,
    actions: string[],
  ): Promise<void> {
    // Validate app exists
    const appDef = getAppById(appId);
    if (!appDef) {
      throw new ValidationError(`Invalid app ID: ${appId}`, "INVALID_APP_ID");
    }

    // Validate actions are defined in app's permission registry
    const validActions = appDef.permissions.map((p) => p.action);
    const invalidActions = actions.filter((a) => !validActions.includes(a));
    if (invalidActions.length > 0) {
      throw new ValidationError(
        `Invalid actions for app "${appId}": ${invalidActions.join(", ")}. ` +
          `Valid actions are: ${validActions.join(", ")}`,
        "INVALID_APP_ACTIONS",
      );
    }

    await appPermissionsStorage.setAppPermissions(targetUserId, appId, actions, actorId);
  }

  /**
   * Set all permissions for a user across all apps
   * @param actorId The user performing the action, null for system operations
   * @param targetUserId The user whose permissions are being modified
   * @param permissionsByApp Object mapping appId to array of actions
   * @throws {ValidationError} When app ID is invalid or actions are invalid for the app
   */
  async setAllPermissions(
    actorId: string | null,
    targetUserId: string,
    permissionsByApp: Record<string, string[]>,
  ): Promise<void> {
    const permissionsArray: { appId: string; actions: string[] }[] = [];

    for (const [appId, actions] of Object.entries(permissionsByApp)) {
      // Validate app exists
      const appDef = getAppById(appId);
      if (!appDef) {
        throw new ValidationError(`Invalid app ID: ${appId}`, "INVALID_APP_ID");
      }

      // Validate actions
      const validActions = appDef.permissions.map((p) => p.action);
      const invalidActions = actions.filter((a) => !validActions.includes(a));
      if (invalidActions.length > 0) {
        throw new ValidationError(
          `Invalid actions for app "${appId}": ${invalidActions.join(", ")}. ` +
            `Valid actions are: ${validActions.join(", ")}`,
          "INVALID_APP_ACTIONS",
        );
      }

      permissionsArray.push({ appId, actions });
    }

    await appPermissionsStorage.setAllPermissions(targetUserId, permissionsArray, actorId);
  }

  /**
   * Grant a single permission
   * @throws {ValidationError} When app ID or action is invalid
   */
  async grantPermission(
    actorId: string | null,
    targetUserId: string,
    appId: string,
    action: string,
  ): Promise<AppPermission> {
    // Validate app and action
    const appDef = getAppById(appId);
    if (!appDef) {
      throw new ValidationError(`Invalid app ID: ${appId}`, "INVALID_APP_ID");
    }

    const validActions = appDef.permissions.map((p) => p.action);
    if (!validActions.includes(action)) {
      throw new ValidationError(
        `Invalid action "${action}" for app "${appId}". ` +
          `Valid actions are: ${validActions.join(", ")}`,
        "INVALID_APP_ACTIONS",
      );
    }

    return appPermissionsStorage.grantPermission(targetUserId, appId, action, actorId);
  }

  /**
   * Revoke a single permission
   */
  async revokePermission(targetUserId: string, appId: string, action: string): Promise<void> {
    await appPermissionsStorage.revokePermission(targetUserId, appId, action);
  }

  /**
   * Revoke all permissions for an app
   */
  async revokeAppPermissions(targetUserId: string, appId: string): Promise<void> {
    await appPermissionsStorage.revokeAppPermissions(targetUserId, appId);
  }

  /**
   * Grant all permissions for all registered apps
   */
  async grantAllAppPermissions(actorId: string | null, targetUserId: string): Promise<void> {
    const permissionsByApp: Record<string, string[]> = {};

    for (const appDef of APPS_REGISTRY) {
      permissionsByApp[appDef.id] = appDef.permissions.map((p) => p.action);
    }

    await appPermissionsStorage.setAllPermissions(
      targetUserId,
      Object.entries(permissionsByApp).map(([appId, actions]) => ({
        appId,
        actions,
      })),
      actorId,
    );
  }

  /**
   * Grant all permissions for a specific app
   * @throws {ValidationError} When app ID is invalid
   */
  async grantAllPermissionsForApp(
    actorId: string | null,
    targetUserId: string,
    appId: AppId,
  ): Promise<void> {
    const appDef = getAppById(appId);
    if (!appDef) {
      throw new ValidationError(`Invalid app ID: ${appId}`, "INVALID_APP_ID");
    }

    const allActions = appDef.permissions.map((p) => p.action);
    await appPermissionsStorage.setAppPermissions(targetUserId, appId, allActions, actorId);
  }

  /**
   * Revoke all permissions for a user
   */
  async revokeAllAppPermissions(targetUserId: string): Promise<void> {
    await appPermissionsStorage.revokeAllPermissions(targetUserId);
  }

  /**
   * Get available permissions for an app (from registry)
   */
  getAppAvailablePermissions(appId: string): Array<{ action: string; description: string }> | null {
    const appDef = getAppById(appId);
    if (!appDef) {
      return null;
    }
    return appDef.permissions.map((p) => ({
      action: p.action,
      description: p.description,
    }));
  }

  /**
   * Get all available permissions for all apps (from registry)
   */
  getAllAvailablePermissions(): Record<string, Array<{ action: string; description: string }>> {
    const result: Record<string, Array<{ action: string; description: string }>> = {};
    for (const appDef of APPS_REGISTRY) {
      result[appDef.id] = appDef.permissions.map((p) => ({
        action: p.action,
        description: p.description,
      }));
    }
    return result;
  }
}
