import {
  moduleSettingsTable,
  type ModuleSetting,
  type ModuleSettingNew,
} from "@/schema/module-settings.schema";
import { and, asc, eq } from "drizzle-orm";
import { generateUUID } from "@/lib/uuid";
import { db } from "@/db/postgres";
import type { BaseStorage } from "./types";

/**
 * Module settings storage for per-module configuration.
 * moduleId now stores the registry module ID directly (e.g., "notes", "tasks")
 */
export class ModuleSettingStorage implements BaseStorage<
  ModuleSetting,
  ModuleSettingNew,
  Partial<ModuleSettingNew>
> {
  /**
   * Find setting by ID
   */
  async findById(id: string): Promise<ModuleSetting | undefined> {
    const result = await db
      .select()
      .from(moduleSettingsTable)
      .where(eq(moduleSettingsTable.id, id))
      .limit(1);
    return result[0];
  }

  /**
   * Find all settings for a module (by registry module ID)
   */
  async findByModuleId(moduleId: string): Promise<ModuleSetting[]> {
    return db
      .select()
      .from(moduleSettingsTable)
      .where(eq(moduleSettingsTable.moduleId, moduleId))
      .orderBy(asc(moduleSettingsTable.category), asc(moduleSettingsTable.key));
  }

  /**
   * Find setting by module ID and key
   */
  async findByModuleIdAndKey(moduleId: string, key: string): Promise<ModuleSetting | undefined> {
    const result = await db
      .select()
      .from(moduleSettingsTable)
      .where(and(eq(moduleSettingsTable.moduleId, moduleId), eq(moduleSettingsTable.key, key)))
      .limit(1);
    return result[0];
  }

  /**
   * Find all settings
   */
  async findMany(): Promise<ModuleSetting[]> {
    return db
      .select()
      .from(moduleSettingsTable)
      .orderBy(asc(moduleSettingsTable.moduleId), asc(moduleSettingsTable.key));
  }

  /**
   * Find settings by category within a module
   */
  async findByModuleIdAndCategory(moduleId: string, category: string): Promise<ModuleSetting[]> {
    return db
      .select()
      .from(moduleSettingsTable)
      .where(
        and(eq(moduleSettingsTable.moduleId, moduleId), eq(moduleSettingsTable.category, category)),
      )
      .orderBy(asc(moduleSettingsTable.key));
  }

  /**
   * Create a new setting
   */
  async create(settingData: ModuleSettingNew): Promise<ModuleSetting> {
    const newSetting: ModuleSettingNew = {
      ...settingData,
      id: settingData.id || generateUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const [created] = await db.insert(moduleSettingsTable).values(newSetting).returning();
    return created;
  }

  /**
   * Update setting by ID
   */
  async update(id: string, settingData: Partial<ModuleSettingNew>): Promise<ModuleSetting> {
    const updateData = {
      ...settingData,
      updatedAt: new Date().toISOString(),
    };

    const [updated] = await db
      .update(moduleSettingsTable)
      .set(updateData)
      .where(eq(moduleSettingsTable.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Module setting with ID ${id} not found`);
    }

    return updated;
  }

  /**
   * Delete setting by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(moduleSettingsTable)
      .where(eq(moduleSettingsTable.id, id))
      .returning({ id: moduleSettingsTable.id });
    return result.length > 0;
  }

  /**
   * Delete all settings for a module
   */
  async deleteByModuleId(moduleId: string): Promise<number> {
    const result = await db
      .delete(moduleSettingsTable)
      .where(eq(moduleSettingsTable.moduleId, moduleId))
      .returning({ id: moduleSettingsTable.id });
    return result.length;
  }

  /**
   * Upsert a setting (create if doesn't exist, update if it does)
   */
  async upsert(
    settingData: Omit<ModuleSettingNew, "id"> & { id?: string },
  ): Promise<ModuleSetting> {
    const existing = await this.findByModuleIdAndKey(settingData.moduleId, settingData.key);

    if (existing) {
      return this.update(existing.id, settingData);
    } else {
      return this.create(settingData as ModuleSettingNew);
    }
  }

  /**
   * Get setting value by module ID and key (returns parsed value based on type)
   */
  async getValue<T = unknown>(moduleId: string, key: string): Promise<T | undefined> {
    const setting = await this.findByModuleIdAndKey(moduleId, key);

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
   * Set setting value by module ID and key
   */
  async setValue(moduleId: string, key: string, value: unknown): Promise<ModuleSetting> {
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

    const existing = await this.findByModuleIdAndKey(moduleId, key);

    if (existing) {
      return this.update(existing.id, { value: stringValue });
    } else {
      throw new Error(`Module setting with moduleId ${moduleId} and key ${key} not found`);
    }
  }

  /**
   * Get settings grouped by category for a module
   */
  async getByCategory(moduleId: string): Promise<Record<string, ModuleSetting[]>> {
    const settings = await this.findByModuleId(moduleId);

    return settings.reduce(
      (acc, setting) => {
        if (!acc[setting.category]) {
          acc[setting.category] = [];
        }
        acc[setting.category].push(setting);
        return acc;
      },
      {} as Record<string, ModuleSetting[]>,
    );
  }
}
