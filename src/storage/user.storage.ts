import { rolesTable } from "@/schema/roles.schema";
import { usersTable, type User, type UserNew } from "@/schema/users.schema";
import { and, asc, count, desc, eq, ilike, max, or } from "drizzle-orm";
import { versionCache } from "@/lib/cache/version-cache.service";
import { decryptSecret, encryptSecret, isEncrypted } from "@/lib/security";
import { generateUUID } from "@/lib/uuid";
import { db } from "@/db/postgres";
import { paginate } from "@/storage/helpers/pagination";
import type { BaseStorage, FilterOptions, PaginatedResult, PaginationOptions } from "./types";

// Extended user type with role name (excludes password for security)
export interface UserWithRole extends Omit<User, "password"> {
  roleName: string | null;
  isSystemRole: boolean;
  lastLoginAt: Date | null;
}

export class UserStorage implements BaseStorage<User, UserNew, Partial<UserNew>> {
  /**
   * Build WHERE conditions based on filters
   */
  private buildWhereConditions(filters: FilterOptions, includeRoleSearch = false) {
    const conditions = [];

    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      const searchConditions = [
        ilike(usersTable.name, searchTerm),
        ilike(usersTable.email, searchTerm),
      ];

      // Include role search when joining with roles table
      if (includeRoleSearch) {
        searchConditions.push(ilike(rolesTable.displayName, searchTerm));
      }

      conditions.push(or(...searchConditions));
    }

    if (filters.isActive !== undefined) {
      conditions.push(eq(usersTable.isActive, filters.isActive));
    }

    if (filters.roleId !== undefined && filters.roleId !== null) {
      conditions.push(eq(usersTable.roleId, filters.roleId as string));
    }

    return conditions;
  }

  /**
   * Get column for sorting
   */
  private getSortColumn(sortBy: string) {
    switch (sortBy) {
      case "name":
        return usersTable.name;
      case "email":
        return usersTable.email;
      case "createdAt":
        return usersTable.createdAt;
      case "updatedAt":
        return usersTable.updatedAt;
      default:
        return usersTable.createdAt;
    }
  }

  /**
   * Get collection version for ETag generation.
   * Returns max(updated_at) and count for the filtered set.
   * This is a cheap query that avoids fetching all user data.
   *
   * Uses Redis caching with 10-second TTL to reduce database load.
   */
  async getCollectionVersion(
    filters: FilterOptions = {},
  ): Promise<{ maxUpdatedAt: Date | null; count: number }> {
    const cacheKey = versionCache.buildCacheKey("users", filters);

    return versionCache.getOrFetch(cacheKey, async () => {
      const conditions = this.buildWhereConditions(filters);
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const query = db
        .select({
          maxUpdatedAt: max(usersTable.updatedAt),
          count: count(usersTable.id),
        })
        .from(usersTable);

      const [result] = whereClause ? await query.where(whereClause) : await query;

      return {
        maxUpdatedAt: result?.maxUpdatedAt ? new Date(result.maxUpdatedAt) : null,
        count: result?.count ?? 0,
      };
    });
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | undefined> {
    const result = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);

    return result[0];
  }

  /**
   * Find user by ID with role name
   */
  async findByIdWithRole(id: string): Promise<UserWithRole | undefined> {
    const result = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        emailVerified: usersTable.emailVerified,
        image: usersTable.image,
        phone: usersTable.phone,
        isActive: usersTable.isActive,
        locale: usersTable.locale,
        roleId: usersTable.roleId,
        twoFactorEnabled: usersTable.twoFactorEnabled,
        emailTwoFactorEnabled: usersTable.emailTwoFactorEnabled,
        totpTwoFactorEnabled: usersTable.totpTwoFactorEnabled,
        twoFactorSecret: usersTable.twoFactorSecret,
        twoFactorBackupCodes: usersTable.twoFactorBackupCodes,
        preferredTwoFactorMethod: usersTable.preferredTwoFactorMethod,
        lastLoginAt: usersTable.lastLoginAt,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt,
        roleName: rolesTable.displayName,
        isSystemRole: rolesTable.isSystem,
      })
      .from(usersTable)
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(usersTable.id, id))
      .limit(1);

    // Handle null isSystem from left join
    return result[0] ? { ...result[0], isSystemRole: result[0].isSystemRole ?? false } : undefined;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

    return result[0];
  }

  /**
   * Find all users with a specific role ID
   */
  async findByRoleId(roleId: string): Promise<User[]> {
    return db.select().from(usersTable).where(eq(usersTable.roleId, roleId));
  }

  /**
   * Find multiple users with optional filtering
   */
  async findMany(filters: FilterOptions = {}): Promise<User[]> {
    const conditions = this.buildWhereConditions(filters);

    let query = db.select().from(usersTable);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    return query.orderBy(desc(usersTable.createdAt));
  }

  /**
   * Find multiple users with role names
   */
  async findManyWithRoles(filters: FilterOptions = {}): Promise<UserWithRole[]> {
    const conditions = this.buildWhereConditions(filters);

    // Exclude users with system roles when excludeSystemUsers is true
    if (filters.excludeSystemUsers) {
      conditions.push(
        or(eq(rolesTable.isSystem, false), eq(usersTable.roleId, null as unknown as string)),
      );
    }

    const baseQuery = db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        emailVerified: usersTable.emailVerified,
        image: usersTable.image,
        phone: usersTable.phone,
        isActive: usersTable.isActive,
        locale: usersTable.locale,
        roleId: usersTable.roleId,
        twoFactorEnabled: usersTable.twoFactorEnabled,
        emailTwoFactorEnabled: usersTable.emailTwoFactorEnabled,
        totpTwoFactorEnabled: usersTable.totpTwoFactorEnabled,
        twoFactorSecret: usersTable.twoFactorSecret,
        twoFactorBackupCodes: usersTable.twoFactorBackupCodes,
        preferredTwoFactorMethod: usersTable.preferredTwoFactorMethod,
        lastLoginAt: usersTable.lastLoginAt,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt,
        roleName: rolesTable.displayName,
        isSystemRole: rolesTable.isSystem,
      })
      .from(usersTable)
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id));

    const results =
      conditions.length > 0
        ? await baseQuery.where(and(...conditions)).orderBy(desc(usersTable.createdAt))
        : await baseQuery.orderBy(desc(usersTable.createdAt));

    // Handle null isSystem from left join
    return results.map((r) => ({ ...r, isSystemRole: r.isSystemRole ?? false }));
  }

  /**
   * Find users with pagination
   */
  async findManyPaginated(
    filters: FilterOptions = {},
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<User>> {
    const conditions = this.buildWhereConditions(filters);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build queries
    let countQuery = db.select({ count: count() }).from(usersTable);
    let dataQuery = db.select().from(usersTable);

    if (whereClause) {
      countQuery = countQuery.where(whereClause) as typeof countQuery;
      dataQuery = dataQuery.where(whereClause) as typeof dataQuery;
    }

    // Apply sorting
    const sortBy = options.sortBy || "createdAt";
    const sortOrder = options.sortOrder || "desc";
    const sortColumn = this.getSortColumn(sortBy);

    if (sortOrder === "asc") {
      dataQuery = dataQuery.orderBy(asc(sortColumn)) as typeof dataQuery;
    } else {
      dataQuery = dataQuery.orderBy(desc(sortColumn)) as typeof dataQuery;
    }

    return paginate<User>({
      dataQuery,
      countQuery,
      options,
      defaultLimit: 10,
    });
  }

  /**
   * Find users with pagination and role names
   */
  async findManyPaginatedWithRoles(
    filters: FilterOptions = {},
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<UserWithRole>> {
    const conditions = this.buildWhereConditions(filters, true);

    // Exclude users with system roles when excludeSystemUsers is true
    if (filters.excludeSystemUsers) {
      conditions.push(
        or(eq(rolesTable.isSystem, false), eq(usersTable.roleId, null as unknown as string)),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build count query with join for system user filtering
    let countQuery = db
      .select({ count: count() })
      .from(usersTable)
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id));

    // Build data query with role names
    const sortBy = options.sortBy || "createdAt";
    const sortOrder = options.sortOrder || "desc";
    const sortColumn = this.getSortColumn(sortBy);

    let dataQuery = db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        emailVerified: usersTable.emailVerified,
        image: usersTable.image,
        phone: usersTable.phone,
        isActive: usersTable.isActive,
        locale: usersTable.locale,
        roleId: usersTable.roleId,
        twoFactorEnabled: usersTable.twoFactorEnabled,
        emailTwoFactorEnabled: usersTable.emailTwoFactorEnabled,
        totpTwoFactorEnabled: usersTable.totpTwoFactorEnabled,
        twoFactorSecret: usersTable.twoFactorSecret,
        twoFactorBackupCodes: usersTable.twoFactorBackupCodes,
        preferredTwoFactorMethod: usersTable.preferredTwoFactorMethod,
        lastLoginAt: usersTable.lastLoginAt,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt,
        roleName: rolesTable.displayName,
        isSystemRole: rolesTable.isSystem,
      })
      .from(usersTable)
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id));

    if (whereClause) {
      countQuery = countQuery.where(whereClause) as typeof countQuery;
      dataQuery = dataQuery.where(whereClause) as typeof dataQuery;
    }

    if (sortOrder === "asc") {
      dataQuery = dataQuery.orderBy(asc(sortColumn)) as typeof dataQuery;
    } else {
      dataQuery = dataQuery.orderBy(desc(sortColumn)) as typeof dataQuery;
    }

    // Use pagination helper
    const result = await paginate({
      dataQuery,
      countQuery,
      options,
      defaultLimit: 10,
    });

    // Handle null isSystem from left join
    const data = result.data.map((r) => ({ ...r, isSystemRole: r.isSystemRole ?? false }));

    return {
      ...result,
      data,
    };
  }

  /**
   * Create a new user
   */
  async create(userData: UserNew): Promise<User> {
    const newUser: UserNew = {
      ...userData,
      id: userData.id || generateUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [createdUser] = await db.insert(usersTable).values(newUser).returning();

    // Invalidate version cache
    await versionCache.invalidate("users");

    return createdUser;
  }

  /**
   * Update user by ID
   */
  async update(id: string, userData: Partial<UserNew>): Promise<User> {
    const updateData = {
      ...userData,
      updatedAt: new Date(),
    };

    const [updatedUser] = await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, id))
      .returning();

    if (!updatedUser) {
      throw new Error(`User with ID ${id} not found`);
    }

    // Invalidate version cache
    await versionCache.invalidate("users");

    return updatedUser;
  }

  /**
   * Delete user by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(usersTable)
      .where(eq(usersTable.id, id))
      .returning({ id: usersTable.id });

    const deleted = result.length > 0;

    if (deleted) {
      // Invalidate version cache
      await versionCache.invalidate("users");
    }

    return deleted;
  }

  /**
   * Soft delete user (set isActive to false)
   */
  async softDelete(id: string): Promise<User> {
    return this.update(id, { isActive: false });
  }

  /**
   * Restore soft-deleted user
   */
  async restore(id: string): Promise<User> {
    return this.update(id, { isActive: true });
  }

  /**
   * Count users by role
   */
  async countByRole(): Promise<Record<string, number>> {
    const results = await db
      .select({
        roleName: rolesTable.displayName,
        count: count(),
      })
      .from(usersTable)
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(usersTable.isActive, true))
      .groupBy(rolesTable.displayName);

    return results.reduce(
      (acc, { roleName, count }) => {
        const key = roleName || "unassigned";
        acc[key] = count;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Get recently created users
   */
  async getRecentUsers(limit: number = 5): Promise<User[]> {
    return db
      .select()
      .from(usersTable)
      .where(eq(usersTable.isActive, true))
      .orderBy(desc(usersTable.createdAt))
      .limit(limit);
  }

  /**
   * Get two-factor authentication status for a user
   */
  async getTwoFactorStatus(userId: string): Promise<{
    twoFactorEnabled: boolean;
    emailTwoFactorEnabled: boolean;
    totpTwoFactorEnabled: boolean;
    twoFactorSecret: string | null;
    twoFactorBackupCodes: string | null;
    backupCodesCount: number;
    preferredTwoFactorMethod: string | null;
  } | null> {
    const result = await db
      .select({
        twoFactorEnabled: usersTable.twoFactorEnabled,
        emailTwoFactorEnabled: usersTable.emailTwoFactorEnabled,
        totpTwoFactorEnabled: usersTable.totpTwoFactorEnabled,
        twoFactorSecret: usersTable.twoFactorSecret,
        twoFactorBackupCodes: usersTable.twoFactorBackupCodes,
        preferredTwoFactorMethod: usersTable.preferredTwoFactorMethod,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!result[0]) return null;

    // Decrypt TOTP secret if it's encrypted
    const status = result[0];
    if (status.twoFactorSecret && isEncrypted(status.twoFactorSecret)) {
      status.twoFactorSecret = decryptSecret(status.twoFactorSecret);
    }

    // Count remaining backup codes (they're stored as JSON array of hashed codes)
    let backupCodesCount = 0;
    if (status.twoFactorBackupCodes) {
      try {
        const codes = JSON.parse(status.twoFactorBackupCodes) as string[];
        backupCodesCount = codes.length;
      } catch {
        backupCodesCount = 0;
      }
    }

    return {
      ...status,
      backupCodesCount,
    };
  }

  /**
   * Update two-factor authentication settings for a user
   */
  async updateTwoFactorSettings(
    userId: string,
    settings: {
      twoFactorEnabled?: boolean;
      emailTwoFactorEnabled?: boolean;
      totpTwoFactorEnabled?: boolean;
      twoFactorSecret?: string | null;
      twoFactorBackupCodes?: string | null;
      preferredTwoFactorMethod?: string;
    },
  ): Promise<User> {
    // Encrypt TOTP secret if provided
    const settingsToUpdate = { ...settings };
    if (settingsToUpdate.twoFactorSecret) {
      settingsToUpdate.twoFactorSecret = encryptSecret(settingsToUpdate.twoFactorSecret);
    }

    return this.update(userId, settingsToUpdate);
  }

  /**
   * Set preferred two-factor authentication method
   */
  async setPreferredTwoFactorMethod(userId: string, method: "email" | "totp"): Promise<User> {
    return this.update(userId, { preferredTwoFactorMethod: method });
  }

  /**
   * Update last login timestamp for a user
   */
  async updateLastLoginAt(userId: string): Promise<void> {
    await db.update(usersTable).set({ lastLoginAt: new Date() }).where(eq(usersTable.id, userId));
  }
}
