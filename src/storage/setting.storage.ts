import { settingsTable, type Setting, type SettingNew } from "@/schema/settings.schema";
import { and, asc, count, desc, eq, ilike, max } from "drizzle-orm";
import { isSensitiveSetting } from "@/config/settings.registry";
import type { SettingScope } from "@/config/settings.registry";
import { versionCache } from "@/lib/cache/version-cache.service";
import { decryptSecret, encryptSecret, isEncrypted } from "@/lib/security";
import { generateUUID } from "@/lib/uuid";
import { db } from "@/db/postgres";
import { paginate } from "@/storage/helpers/pagination";
import type { BaseStorage, PaginatedResult, PaginationOptions } from "./types";

/**
 * Filter options for settings queries
 */
export interface SettingFilterOptions {
  search?: string;
  category?: string;
  scope?: SettingScope;
  type?: string;
}

/**
 * Encrypt a setting value if the setting is marked as sensitive
 */
function encryptIfSensitive(key: string, value: string): string {
  if (!value || !isSensitiveSetting(key)) {
    return value;
  }
  // Don't re-encrypt if already encrypted
  if (isEncrypted(value)) {
    return value;
  }
  return encryptSecret(value);
}

/**
 * Decrypt a setting value if it's encrypted
 */
function decryptIfEncrypted(value: string): string {
  if (!value || !isEncrypted(value)) {
    return value;
  }
  return decryptSecret(value);
}

/**
 * Decrypt a setting's value field if encrypted
 */
function decryptSetting(setting: Setting): Setting {
  if (!setting.value) return setting;
  return {
    ...setting,
    value: decryptIfEncrypted(setting.value),
  };
}

export class SettingStorage implements BaseStorage<Setting, SettingNew, Partial<SettingNew>> {
  /**
   * Build WHERE conditions based on filters
   */
  private buildWhereConditions(filters: SettingFilterOptions) {
    const conditions = [];

    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(ilike(settingsTable.key, searchTerm));
    }

    if (filters.category) {
      conditions.push(eq(settingsTable.category, filters.category));
    }

    if (filters.scope) {
      conditions.push(eq(settingsTable.scope, filters.scope));
    }

    if (filters.type) {
      conditions.push(eq(settingsTable.type, filters.type));
    }

    return conditions;
  }

  /**
   * Get column for sorting
   */
  private getSortColumn(sortBy: string) {
    switch (sortBy) {
      case "key":
        return settingsTable.key;
      case "label":
        return settingsTable.label;
      case "category":
        return settingsTable.category;
      case "type":
        return settingsTable.type;
      case "createdAt":
        return settingsTable.createdAt;
      case "updatedAt":
        return settingsTable.updatedAt;
      default:
        return settingsTable.key;
    }
  }

  /**
   * Get collection version for ETag generation.
   * Returns max(updated_at) and count for the filtered set.
   *
   * Uses Redis caching with 10-second TTL to reduce database load.
   */
  async getCollectionVersion(
    filters: SettingFilterOptions = {},
  ): Promise<{ maxUpdatedAt: Date | null; count: number }> {
    const cacheKey = versionCache.buildCacheKey("settings", filters);

    return versionCache.getOrFetch(cacheKey, async () => {
      const conditions = this.buildWhereConditions(filters);
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const query = db
        .select({
          maxUpdatedAt: max(settingsTable.updatedAt),
          count: count(settingsTable.id),
        })
        .from(settingsTable);

      const [result] = whereClause ? await query.where(whereClause) : await query;

      return {
        maxUpdatedAt: result?.maxUpdatedAt ? new Date(result.maxUpdatedAt) : null,
        count: result?.count ?? 0,
      };
    });
  }

  /**
   * Find setting by ID
   */
  async findById(id: string): Promise<Setting | undefined> {
    const result = await db.select().from(settingsTable).where(eq(settingsTable.id, id)).limit(1);

    return result[0] ? decryptSetting(result[0]) : undefined;
  }

  /**
   * Find setting by key
   */
  async findByKey(key: string): Promise<Setting | undefined> {
    const result = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);

    return result[0] ? decryptSetting(result[0]) : undefined;
  }

  /**
   * Find multiple settings with optional filtering
   */
  async findMany(filters: SettingFilterOptions = {}): Promise<Setting[]> {
    const conditions = this.buildWhereConditions(filters);

    let query = db.select().from(settingsTable);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const results = await query.orderBy(asc(settingsTable.category), asc(settingsTable.key));
    return results.map(decryptSetting);
  }

  /**
   * Find settings with pagination
   */
  async findManyPaginated(
    filters: SettingFilterOptions = {},
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<Setting>> {
    const conditions = this.buildWhereConditions(filters);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build queries
    let countQuery = db.select({ count: count() }).from(settingsTable);
    let dataQuery = db.select().from(settingsTable);

    if (whereClause) {
      countQuery = countQuery.where(whereClause) as typeof countQuery;
      dataQuery = dataQuery.where(whereClause) as typeof dataQuery;
    }

    // Apply sorting
    const sortBy = options.sortBy || "key";
    const sortOrder = options.sortOrder || "asc";
    const sortColumn = this.getSortColumn(sortBy);

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
    });

    // Decrypt settings after pagination
    return {
      ...result,
      data: result.data.map(decryptSetting),
    };
  }

  /**
   * Create a new setting
   */
  async create(settingData: SettingNew): Promise<Setting> {
    const newSetting: SettingNew = {
      ...settingData,
      // Encrypt value if this is a sensitive setting
      value: settingData.value
        ? encryptIfSensitive(settingData.key, settingData.value)
        : settingData.value,
      id: settingData.id || generateUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const [createdSetting] = await db.insert(settingsTable).values(newSetting).returning();

    // Invalidate version cache
    await versionCache.invalidate("settings");

    return decryptSetting(createdSetting);
  }

  /**
   * Update setting by ID
   */
  async update(id: string, settingData: Partial<SettingNew>): Promise<Setting> {
    // Get existing setting to determine the key for encryption check
    const existing = await db
      .select({ key: settingsTable.key })
      .from(settingsTable)
      .where(eq(settingsTable.id, id))
      .limit(1);

    const key = existing[0]?.key;

    const updateData = {
      ...settingData,
      // Encrypt value if this is a sensitive setting
      ...(settingData.value !== undefined && key
        ? { value: encryptIfSensitive(key, settingData.value) }
        : {}),
      updatedAt: new Date().toISOString(),
    };

    const [updatedSetting] = await db
      .update(settingsTable)
      .set(updateData)
      .where(eq(settingsTable.id, id))
      .returning();

    if (!updatedSetting) {
      throw new Error(`Setting with ID ${id} not found`);
    }

    // Invalidate version cache
    await versionCache.invalidate("settings");

    return decryptSetting(updatedSetting);
  }

  /**
   * Update setting by key
   */
  async updateByKey(key: string, settingData: Partial<SettingNew>): Promise<Setting> {
    const updateData = {
      ...settingData,
      // Encrypt value if this is a sensitive setting
      ...(settingData.value !== undefined
        ? { value: encryptIfSensitive(key, settingData.value) }
        : {}),
      updatedAt: new Date().toISOString(),
    };

    const [updatedSetting] = await db
      .update(settingsTable)
      .set(updateData)
      .where(eq(settingsTable.key, key))
      .returning();

    if (!updatedSetting) {
      throw new Error(`Setting with key ${key} not found`);
    }

    return decryptSetting(updatedSetting);
  }

  /**
   * Delete setting by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(settingsTable)
      .where(eq(settingsTable.id, id))
      .returning({ id: settingsTable.id });

    return result.length > 0;
  }

  /**
   * Delete setting by key
   */
  async deleteByKey(key: string): Promise<boolean> {
    const result = await db
      .delete(settingsTable)
      .where(eq(settingsTable.key, key))
      .returning({ id: settingsTable.id });

    return result.length > 0;
  }

  /**
   * Find settings by scope
   */
  async findByScope(scope: SettingScope): Promise<Setting[]> {
    const results = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.scope, scope))
      .orderBy(asc(settingsTable.category), asc(settingsTable.key));
    return results.map(decryptSetting);
  }

  /**
   * Find settings by scope and category
   */
  async findByScopeAndCategory(scope: SettingScope, category: string): Promise<Setting[]> {
    const results = await db
      .select()
      .from(settingsTable)
      .where(and(eq(settingsTable.scope, scope), eq(settingsTable.category, category)))
      .orderBy(asc(settingsTable.key));
    return results.map(decryptSetting);
  }

  /**
   * Get settings grouped by category
   */
  async getByCategory(): Promise<Record<string, Setting[]>> {
    const allSettings = await this.findMany();

    return allSettings.reduce(
      (acc, setting) => {
        if (!acc[setting.category]) {
          acc[setting.category] = [];
        }
        acc[setting.category].push(setting);
        return acc;
      },
      {} as Record<string, Setting[]>,
    );
  }

  /**
   * Upsert a setting (create if doesn't exist, update if it does)
   * ID is optional - if not provided and creating, one will be generated
   */
  async upsert(settingData: Omit<SettingNew, "id"> & { id?: string }): Promise<Setting> {
    const existing = await this.findByKey(settingData.key);

    if (existing) {
      return this.update(existing.id, settingData);
    } else {
      return this.create(settingData as SettingNew);
    }
  }

  /**
   * Get setting value by key (returns the parsed value based on type)
   */
  async getValue<T = any>(key: string): Promise<T | undefined> {
    const setting = await this.findByKey(key);

    if (!setting || !setting.value) {
      return undefined;
    }

    // Parse value based on type
    switch (setting.type) {
      case "boolean":
        return (setting.value === "true") as T;
      case "number":
        return Number(setting.value) as T;
      case "json":
        try {
          return JSON.parse(setting.value) as T;
        } catch {
          return undefined;
        }
      default:
        return setting.value as T;
    }
  }

  /**
   * Set setting value by key (automatically handles type conversion)
   */
  async setValue(key: string, value: string | number | boolean | object | null): Promise<Setting> {
    let stringValue: string;

    // Convert value to string based on type
    if (typeof value === "boolean") {
      stringValue = value.toString();
    } else if (typeof value === "number") {
      stringValue = value.toString();
    } else if (typeof value === "object") {
      stringValue = JSON.stringify(value);
    } else {
      stringValue = String(value);
    }

    const existing = await this.findByKey(key);

    if (existing) {
      return this.updateByKey(key, { value: stringValue });
    } else {
      throw new Error(`Setting with key ${key} not found`);
    }
  }
}
