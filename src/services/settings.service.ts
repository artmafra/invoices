import type { Setting, SettingNew } from "@/schema/settings.schema";
import {
  getSettingDefault,
  parseSettingValue,
  type SettingKey,
  type SettingScope,
  type SettingValueType,
} from "@/config/settings.registry";
import { settingStorage } from "@/storage/runtime/setting";
import { SettingFilterOptions } from "@/storage/setting.storage";

export class SettingsService {
  // ===========================================================================
  // Core Get Methods
  // ===========================================================================

  /**
   * Get a single setting by key
   * Returns the full setting object or null if not found
   */
  async getSetting<K extends SettingKey>(key: K): Promise<Setting | null> {
    const setting = await settingStorage.findByKey(key);
    return setting ?? null;
  }

  /**
   * Get a setting's parsed value by key with type inference
   * Returns the typed value based on the setting definition, or default if not found
   */
  async getSettingValue<K extends SettingKey>(key: K): Promise<SettingValueType<K> | null> {
    const setting = await settingStorage.findByKey(key);

    if (!setting) {
      // Return registry default if setting doesn't exist in DB
      const defaultValue = getSettingDefault(key);
      return parseSettingValue(key, defaultValue);
    }

    return parseSettingValue(key, setting.value);
  }

  /**
   * Get multiple settings with optional filtering
   */
  async getSettings(filters: SettingFilterOptions = {}): Promise<Setting[]> {
    return settingStorage.findMany(filters);
  }

  /**
   * Get collection version for ETag generation.
   * Returns max(updated_at) and count for the filtered set.
   */
  async getCollectionVersion(
    filters: SettingFilterOptions = {},
  ): Promise<{ maxUpdatedAt: Date | null; count: number }> {
    return settingStorage.getCollectionVersion(filters);
  }

  /**
   * Get distinct categories from all settings
   */
  async getDistinctCategories(): Promise<string[]> {
    const settings = await settingStorage.findMany({});
    return [...new Set(settings.map((s) => s.category))];
  }

  // ===========================================================================
  // Write Methods
  // ===========================================================================

  /**
   * Set a setting's value by key
   */
  async setSettingValue(
    key: string,
    value: string | number | boolean | object | null,
  ): Promise<Setting> {
    return settingStorage.setValue(key, value);
  }

  /**
   * Update a setting by key (for updating metadata, not just value)
   */
  async updateSetting(
    key: string,
    data: Partial<Omit<SettingNew, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Setting> {
    return settingStorage.updateByKey(key, data);
  }

  /**
   * Upsert a setting (create if doesn't exist, update if it does)
   */
  async upsertSetting(data: Omit<SettingNew, "id" | "createdAt" | "updatedAt">): Promise<Setting> {
    return settingStorage.upsert(data as SettingNew);
  }

  /**
   * Delete a setting by key
   */
  async deleteSetting(key: string): Promise<boolean> {
    return settingStorage.deleteByKey(key);
  }

  // ===========================================================================
  // Validation
  // ===========================================================================

  /**
   * Validate a setting value based on its type
   */
  validateSettingValue(type: string, value: unknown): boolean {
    switch (type) {
      case "boolean":
        return typeof value === "boolean" || value === "true" || value === "false";
      case "number":
        return !isNaN(Number(value));
      case "json":
        try {
          JSON.parse(typeof value === "string" ? value : JSON.stringify(value));
          return true;
        } catch {
          return false;
        }
      case "string":
      case "image":
      case "select":
      default:
        return typeof value === "string";
    }
  }
}

// ===========================================================================
// Helper Functions
// ===========================================================================

/**
 * Get a setting value from an array of settings (useful for SSR)
 */
export function getSettingValueFromArray<K extends SettingKey>(
  settings: Setting[],
  key: K,
  defaultValue?: SettingValueType<K>,
): SettingValueType<K> | null {
  const setting = settings.find((s) => s.key === key);

  if (!setting) {
    if (defaultValue !== undefined) return defaultValue;
    const registryDefault = getSettingDefault(key);
    return parseSettingValue(key, registryDefault);
  }

  const parsed = parseSettingValue(key, setting.value);
  if (parsed === null && defaultValue !== undefined) return defaultValue;
  return parsed;
}

/**
 * Helper to get scope filter for public settings
 */
export function publicScope(): { scope: SettingScope } {
  return { scope: "public" };
}

/**
 * Helper to get scope filter for system settings
 */
export function systemScope(): { scope: SettingScope } {
  return { scope: "system" };
}
