import { permissionsTable } from "@/schema/permissions.schema";
import { rolePermissionsTable } from "@/schema/role-permissions.schema";
import { rolesTable, type Role, type RoleNew } from "@/schema/roles.schema";
import { and, asc, count, desc, eq, ilike, inArray, max, or } from "drizzle-orm";
import { versionCache } from "@/lib/cache/version-cache.service";
import { generateUUID } from "@/lib/uuid";
import { db } from "@/db/postgres";
import { paginate } from "@/storage/helpers/pagination";
import type { BaseStorage, FilterOptions, PaginatedResult, PaginationOptions } from "./types";

export interface RoleWithPermissions extends Role {
  permissions: string[];
}

export class RoleStorage implements BaseStorage<Role, RoleNew, Partial<RoleNew>> {
  /**
   * Build WHERE conditions based on filters
   */
  private buildWhereConditions(filters: FilterOptions) {
    const conditions = [];

    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      // Search by displayName and description
      conditions.push(
        or(ilike(rolesTable.displayName, searchTerm), ilike(rolesTable.description, searchTerm)),
      );
    }

    return conditions;
  }

  /**
   * Get column for sorting
   */
  private getSortColumn(sortBy: string) {
    switch (sortBy) {
      case "name":
        return rolesTable.name;
      case "createdAt":
        return rolesTable.createdAt;
      case "updatedAt":
        return rolesTable.updatedAt;
      default:
        return rolesTable.createdAt;
    }
  }

  /**
   * Get collection version for ETag generation.
   * Returns max(updated_at) and count for the filtered set.
   *
   * Uses Redis caching with 10-second TTL to reduce database load.
   */
  async getCollectionVersion(
    filters: FilterOptions = {},
  ): Promise<{ maxUpdatedAt: Date | null; count: number }> {
    const cacheKey = versionCache.buildCacheKey("roles", filters);

    return versionCache.getOrFetch(cacheKey, async () => {
      const conditions = this.buildWhereConditions(filters);
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const query = db
        .select({
          maxUpdatedAt: max(rolesTable.updatedAt),
          count: count(rolesTable.id),
        })
        .from(rolesTable);

      const [result] = whereClause ? await query.where(whereClause) : await query;

      return {
        maxUpdatedAt: result?.maxUpdatedAt ? new Date(result.maxUpdatedAt) : null,
        count: result?.count ?? 0,
      };
    });
  }

  /**
   * Find role by ID
   */
  async findById(id: string): Promise<Role | undefined> {
    const result = await db.select().from(rolesTable).where(eq(rolesTable.id, id)).limit(1);

    return result[0];
  }

  /**
   * Find role by ID with permissions
   */
  async findByIdWithPermissions(id: string): Promise<RoleWithPermissions | undefined> {
    const role = await this.findById(id);
    if (!role) return undefined;

    const permissions = await this.getRolePermissions(id);
    return { ...role, permissions };
  }

  /**
   * Find role by name
   */
  async findByName(name: string): Promise<Role | undefined> {
    const result = await db.select().from(rolesTable).where(eq(rolesTable.name, name)).limit(1);

    return result[0];
  }

  /**
   * Find multiple roles with optional filtering
   */
  async findMany(filters: FilterOptions = {}): Promise<Role[]> {
    const conditions = this.buildWhereConditions(filters);

    let query = db.select().from(rolesTable);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    return query.orderBy(asc(rolesTable.name));
  }

  /**
   * Find roles that can be assigned to users (excludes system roles)
   */
  async findAssignable(): Promise<Role[]> {
    return db
      .select()
      .from(rolesTable)
      .where(eq(rolesTable.isSystem, false))
      .orderBy(asc(rolesTable.name));
  }

  /**
   * Find assignable roles with their permissions
   */
  async findAssignableWithPermissions(): Promise<RoleWithPermissions[]> {
    const roles = await this.findAssignable();

    const rolesWithPermissions = await Promise.all(
      roles.map(async (role) => {
        const permissions = await this.getRolePermissions(role.id);
        return { ...role, permissions };
      }),
    );

    return rolesWithPermissions;
  }

  /**
   * Find all roles with their permissions
   */
  async findManyWithPermissions(filters: FilterOptions = {}): Promise<RoleWithPermissions[]> {
    const roles = await this.findMany(filters);

    const rolesWithPermissions = await Promise.all(
      roles.map(async (role) => {
        const permissions = await this.getRolePermissions(role.id);
        return { ...role, permissions };
      }),
    );

    return rolesWithPermissions;
  }

  /**
   * Find roles with pagination
   */
  async findManyPaginated(
    filters: FilterOptions = {},
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<RoleWithPermissions>> {
    const conditions = this.buildWhereConditions(filters);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build queries
    let countQuery = db.select({ count: count() }).from(rolesTable);
    let dataQuery = db.select().from(rolesTable);

    if (whereClause) {
      countQuery = countQuery.where(whereClause) as typeof countQuery;
      dataQuery = dataQuery.where(whereClause) as typeof dataQuery;
    }

    // Apply sorting
    const sortBy = options.sortBy || "name";
    const sortOrder = options.sortOrder || "asc";
    const sortColumn = this.getSortColumn(sortBy);

    if (sortOrder === "asc") {
      dataQuery = dataQuery.orderBy(asc(sortColumn)) as typeof dataQuery;
    } else {
      dataQuery = dataQuery.orderBy(desc(sortColumn)) as typeof dataQuery;
    }

    // Use pagination helper
    const result = await paginate<Role>({
      dataQuery,
      countQuery,
      options,
      defaultLimit: 10,
    });

    // Fetch permissions for each role (post-processing)
    const data = await Promise.all(
      result.data.map(async (role) => {
        const permissions = await this.getRolePermissions(role.id);
        return { ...role, permissions };
      }),
    );

    return {
      ...result,
      data,
    };
  }

  /**
   * Create a new role
   */
  async create(roleData: RoleNew): Promise<Role> {
    const newRole: RoleNew = {
      ...roleData,
      id: roleData.id || generateUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [createdRole] = await db.insert(rolesTable).values(newRole).returning();

    // Invalidate version cache
    await versionCache.invalidate("roles");

    return createdRole;
  }

  /**
   * Update role by ID
   */
  async update(id: string, roleData: Partial<RoleNew>): Promise<Role> {
    const updateData = {
      ...roleData,
      updatedAt: new Date(),
    };

    const [updatedRole] = await db
      .update(rolesTable)
      .set(updateData)
      .where(eq(rolesTable.id, id))
      .returning();

    if (!updatedRole) {
      throw new Error(`Role with ID ${id} not found`);
    }

    // Invalidate version cache
    await versionCache.invalidate("roles");

    return updatedRole;
  }

  /**
   * Delete role by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(rolesTable)
      .where(eq(rolesTable.id, id))
      .returning({ id: rolesTable.id });

    const deleted = result.length > 0;

    if (deleted) {
      // Invalidate version cache
      await versionCache.invalidate("roles");
    }

    return deleted;
  }

  /**
   * Get permissions for a role (as permission strings like "users.view")
   */
  async getRolePermissions(roleId: string): Promise<string[]> {
    const result = await db
      .select({
        resource: permissionsTable.resource,
        action: permissionsTable.action,
      })
      .from(rolePermissionsTable)
      .innerJoin(permissionsTable, eq(rolePermissionsTable.permissionId, permissionsTable.id))
      .where(eq(rolePermissionsTable.roleId, roleId));

    return result.map((r) => `${r.resource}.${r.action}`);
  }

  /**
   * Get permission IDs for a role
   */
  async getRolePermissionIds(roleId: string): Promise<string[]> {
    const result = await db
      .select({ permissionId: rolePermissionsTable.permissionId })
      .from(rolePermissionsTable)
      .where(eq(rolePermissionsTable.roleId, roleId));

    return result.map((r) => r.permissionId);
  }

  /**
   * Set permissions for a role (replaces existing)
   */
  async setRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    // Delete existing permissions
    await db.delete(rolePermissionsTable).where(eq(rolePermissionsTable.roleId, roleId));

    // Insert new permissions
    if (permissionIds.length > 0) {
      const values = permissionIds.map((permissionId) => ({
        roleId,
        permissionId,
      }));
      await db.insert(rolePermissionsTable).values(values);
    }
  }

  /**
   * Add a permission to a role
   */
  async addPermission(roleId: string, permissionId: string): Promise<void> {
    await db.insert(rolePermissionsTable).values({ roleId, permissionId }).onConflictDoNothing();
  }

  /**
   * Remove a permission from a role
   */
  async removePermission(roleId: string, permissionId: string): Promise<void> {
    await db
      .delete(rolePermissionsTable)
      .where(
        and(
          eq(rolePermissionsTable.roleId, roleId),
          eq(rolePermissionsTable.permissionId, permissionId),
        ),
      );
  }

  /**
   * Count users for each role
   */
  async countUsersByRole(): Promise<Record<string, number>> {
    // Import here to avoid circular dependency
    const { usersTable } = await import("@/schema/users.schema");

    const results = await db
      .select({
        roleId: usersTable.roleId,
        count: count(),
      })
      .from(usersTable)
      .where(eq(usersTable.isActive, true))
      .groupBy(usersTable.roleId);

    return results.reduce(
      (acc, { roleId, count }) => {
        if (roleId) {
          acc[roleId] = count;
        }
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Check if role has specific permission
   */
  async hasPermission(roleId: string, resource: string, action: string): Promise<boolean> {
    const result = await db
      .select({ permissionId: rolePermissionsTable.permissionId })
      .from(rolePermissionsTable)
      .innerJoin(permissionsTable, eq(rolePermissionsTable.permissionId, permissionsTable.id))
      .where(
        and(
          eq(rolePermissionsTable.roleId, roleId),
          eq(permissionsTable.resource, resource),
          eq(permissionsTable.action, action),
        ),
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   * Get all roles that have a specific permission
   */
  async getRolesWithPermission(resource: string, action: string): Promise<Role[]> {
    const result = await db
      .select({ roleId: rolePermissionsTable.roleId })
      .from(rolePermissionsTable)
      .innerJoin(permissionsTable, eq(rolePermissionsTable.permissionId, permissionsTable.id))
      .where(and(eq(permissionsTable.resource, resource), eq(permissionsTable.action, action)));

    const roleIds = result.map((r) => r.roleId);

    if (roleIds.length === 0) return [];

    return db.select().from(rolesTable).where(inArray(rolesTable.id, roleIds));
  }
}
