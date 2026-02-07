import {
  appPermissionsTable,
  type AppPermission,
  type AppPermissionNew,
} from "@/schema/app-permissions.schema";
import { and, eq, inArray } from "drizzle-orm";
import { generateUUID } from "@/lib/uuid";
import { db } from "@/db/postgres";

/**
 * Storage for per-user app permissions.
 * Handles granular permissions like notes.view, notes.create, tasks.edit, etc.
 */
export class AppPermissionsStorage {
  /**
   * Find all permission entries for a user
   */
  async findByUserId(userId: string): Promise<AppPermission[]> {
    return db.select().from(appPermissionsTable).where(eq(appPermissionsTable.userId, userId));
  }

  /**
   * Find all permission entries for a user in a specific app
   */
  async findByUserAndApp(userId: string, appId: string): Promise<AppPermission[]> {
    return db
      .select()
      .from(appPermissionsTable)
      .where(and(eq(appPermissionsTable.userId, userId), eq(appPermissionsTable.appId, appId)));
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(userId: string, appId: string, action: string): Promise<boolean> {
    const result = await db
      .select()
      .from(appPermissionsTable)
      .where(
        and(
          eq(appPermissionsTable.userId, userId),
          eq(appPermissionsTable.appId, appId),
          eq(appPermissionsTable.action, action),
        ),
      )
      .limit(1);
    return result.length > 0;
  }

  /**
   * Get all permissions for a user as "appId.action" strings
   */
  async getUserPermissionStrings(userId: string): Promise<string[]> {
    const entries = await this.findByUserId(userId);
    return entries.map((e) => `${e.appId}.${e.action}`);
  }

  /**
   * Get all unique app IDs a user has any permission for (determines app access)
   */
  async getUserAppIds(userId: string): Promise<string[]> {
    const entries = await this.findByUserId(userId);
    const appIds = new Set(entries.map((e) => e.appId));
    return Array.from(appIds);
  }

  /**
   * Get actions a user has for a specific app
   */
  async getUserAppActions(userId: string, appId: string): Promise<string[]> {
    const entries = await this.findByUserAndApp(userId, appId);
    return entries.map((e) => e.action);
  }

  /**
   * Grant a single permission to a user
   */
  async grantPermission(
    userId: string,
    appId: string,
    action: string,
    grantedBy: string | null,
  ): Promise<AppPermission> {
    // Check if already exists
    const existing = await db
      .select()
      .from(appPermissionsTable)
      .where(
        and(
          eq(appPermissionsTable.userId, userId),
          eq(appPermissionsTable.appId, appId),
          eq(appPermissionsTable.action, action),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const [entry] = await db
      .insert(appPermissionsTable)
      .values({
        id: generateUUID(),
        userId,
        appId,
        action,
        grantedBy,
      })
      .returning();

    return entry;
  }

  /**
   * Revoke a single permission from a user
   */
  async revokePermission(userId: string, appId: string, action: string): Promise<void> {
    await db
      .delete(appPermissionsTable)
      .where(
        and(
          eq(appPermissionsTable.userId, userId),
          eq(appPermissionsTable.appId, appId),
          eq(appPermissionsTable.action, action),
        ),
      );
  }

  /**
   * Set permissions for a user in a specific app (replaces existing)
   */
  async setAppPermissions(
    userId: string,
    appId: string,
    actions: string[],
    grantedBy: string | null,
  ): Promise<void> {
    // Get current permissions for this app
    const current = await this.findByUserAndApp(userId, appId);
    const currentActions = current.map((c) => c.action);

    // Determine what to add and remove
    const toAdd = actions.filter((a) => !currentActions.includes(a));
    const toRemove = currentActions.filter((a) => !actions.includes(a));

    // Remove revoked permissions
    if (toRemove.length > 0) {
      await db
        .delete(appPermissionsTable)
        .where(
          and(
            eq(appPermissionsTable.userId, userId),
            eq(appPermissionsTable.appId, appId),
            inArray(appPermissionsTable.action, toRemove),
          ),
        );
    }

    // Add new permissions
    if (toAdd.length > 0) {
      const newEntries: AppPermissionNew[] = toAdd.map((action) => ({
        id: generateUUID(),
        userId,
        appId,
        action,
        grantedBy,
      }));
      await db.insert(appPermissionsTable).values(newEntries);
    }
  }

  /**
   * Set all permissions for a user across all apps (replaces everything)
   * @param permissions Array of {appId, actions[]} objects
   */
  async setAllPermissions(
    userId: string,
    permissions: { appId: string; actions: string[] }[],
    grantedBy: string | null,
  ): Promise<void> {
    // Delete all existing permissions for this user
    await db.delete(appPermissionsTable).where(eq(appPermissionsTable.userId, userId));

    // Insert all new permissions
    const newEntries: AppPermissionNew[] = [];
    for (const { appId, actions } of permissions) {
      for (const action of actions) {
        newEntries.push({
          id: generateUUID(),
          userId,
          appId,
          action,
          grantedBy,
        });
      }
    }

    if (newEntries.length > 0) {
      await db.insert(appPermissionsTable).values(newEntries);
    }
  }

  /**
   * Revoke all permissions for a user in a specific app
   */
  async revokeAppPermissions(userId: string, appId: string): Promise<void> {
    await db
      .delete(appPermissionsTable)
      .where(and(eq(appPermissionsTable.userId, userId), eq(appPermissionsTable.appId, appId)));
  }

  /**
   * Revoke all permissions for a user
   */
  async revokeAllPermissions(userId: string): Promise<void> {
    await db.delete(appPermissionsTable).where(eq(appPermissionsTable.userId, userId));
  }
}
