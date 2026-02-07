import { permissionsTable, type Permission, type PermissionNew } from "@/schema/permissions.schema";
import { and, asc, eq } from "drizzle-orm";
import { generateUUID } from "@/lib/uuid";
import { db } from "@/db/postgres";
import type { BaseStorage } from "./types";

export interface PermissionGroup {
  resource: string;
  permissions: Permission[];
}

export class PermissionStorage implements BaseStorage<
  Permission,
  PermissionNew,
  Partial<PermissionNew>
> {
  /**
   * Find permission by ID
   */
  async findById(id: string): Promise<Permission | undefined> {
    const result = await db
      .select()
      .from(permissionsTable)
      .where(eq(permissionsTable.id, id))
      .limit(1);

    return result[0];
  }

  /**
   * Find permission by resource and action
   */
  async findByResourceAction(resource: string, action: string): Promise<Permission | undefined> {
    const result = await db
      .select()
      .from(permissionsTable)
      .where(and(eq(permissionsTable.resource, resource), eq(permissionsTable.action, action)))
      .limit(1);

    return result[0];
  }

  /**
   * Find all permissions
   */
  async findMany(): Promise<Permission[]> {
    return db
      .select()
      .from(permissionsTable)
      .orderBy(asc(permissionsTable.resource), asc(permissionsTable.action));
  }

  /**
   * Find permissions grouped by resource
   */
  async findGroupedByResource(): Promise<PermissionGroup[]> {
    const permissions = await this.findMany();

    const grouped = permissions.reduce(
      (acc, permission) => {
        if (!acc[permission.resource]) {
          acc[permission.resource] = [];
        }
        acc[permission.resource].push(permission);
        return acc;
      },
      {} as Record<string, Permission[]>,
    );

    return Object.entries(grouped)
      .map(([resource, permissions]) => ({
        resource,
        permissions,
      }))
      .sort((a, b) => a.resource.localeCompare(b.resource));
  }

  /**
   * Find permissions by resource
   */
  async findByResource(resource: string): Promise<Permission[]> {
    return db
      .select()
      .from(permissionsTable)
      .where(eq(permissionsTable.resource, resource))
      .orderBy(asc(permissionsTable.action));
  }

  /**
   * Create a new permission
   */
  async create(permissionData: PermissionNew): Promise<Permission> {
    const newPermission: PermissionNew = {
      ...permissionData,
      id: permissionData.id || generateUUID(),
    };

    const [createdPermission] = await db.insert(permissionsTable).values(newPermission).returning();

    return createdPermission;
  }

  /**
   * Create multiple permissions
   */
  async createMany(permissionsData: PermissionNew[]): Promise<Permission[]> {
    const newPermissions = permissionsData.map((p) => ({
      ...p,
      id: p.id || generateUUID(),
    }));

    const created = await db.insert(permissionsTable).values(newPermissions).returning();

    return created;
  }

  /**
   * Update permission by ID
   */
  async update(id: string, permissionData: Partial<PermissionNew>): Promise<Permission> {
    const [updatedPermission] = await db
      .update(permissionsTable)
      .set(permissionData)
      .where(eq(permissionsTable.id, id))
      .returning();

    if (!updatedPermission) {
      throw new Error(`Permission with ID ${id} not found`);
    }

    return updatedPermission;
  }

  /**
   * Delete permission by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(permissionsTable)
      .where(eq(permissionsTable.id, id))
      .returning({ id: permissionsTable.id });

    return result.length > 0;
  }

  /**
   * Delete all permissions (for resetting)
   */
  async deleteAll(): Promise<void> {
    await db.delete(permissionsTable);
  }

  /**
   * Upsert permission (create if not exists, update if exists)
   */
  async upsert(permissionData: PermissionNew): Promise<Permission> {
    const existing = await this.findByResourceAction(
      permissionData.resource,
      permissionData.action,
    );

    if (existing) {
      return this.update(existing.id, { description: permissionData.description });
    }

    return this.create(permissionData);
  }

  /**
   * Get all unique resources
   */
  async getResources(): Promise<string[]> {
    const result = await db
      .selectDistinct({ resource: permissionsTable.resource })
      .from(permissionsTable)
      .orderBy(asc(permissionsTable.resource));

    return result.map((r) => r.resource);
  }
}
