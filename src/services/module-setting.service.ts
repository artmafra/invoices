import type { ModuleSetting, ModuleSettingNew } from "@/schema/module-settings.schema";
import { getAppById, type AppSettingCategory } from "@/config/apps.registry";
import { moduleSettingStorage } from "@/storage/runtime/module-setting";

/**
 * Service for managing module settings.
 * moduleId is now the registry module ID directly (e.g., "notes", "tasks")
 */
export class ModuleSettingService {
  /**
   * Get all settings for a module by its registry ID
   */
  async getSettingsByModuleId(moduleId: string): Promise<ModuleSetting[]> {
    return moduleSettingStorage.findByModuleId(moduleId);
  }

  /**
   * Get settings grouped by category for a module
   */
  async getSettingsByCategory(moduleId: string): Promise<Record<string, ModuleSetting[]>> {
    return moduleSettingStorage.getByCategory(moduleId);
  }

  /**
   * Get a specific setting value
   */
  async getSettingValue<T = unknown>(moduleId: string, key: string): Promise<T | null> {
    return (await moduleSettingStorage.getValue<T>(moduleId, key)) ?? null;
  }

  /**
   * Update a setting value
   */
  async updateSetting(moduleId: string, key: string, value: unknown): Promise<ModuleSetting> {
    return moduleSettingStorage.setValue(moduleId, key, value);
  }

  /**
   * Create or update a setting
   */
  async upsertSetting(
    moduleId: string,
    settingData: Omit<ModuleSettingNew, "id" | "moduleId">,
  ): Promise<ModuleSetting> {
    return moduleSettingStorage.upsert({
      ...settingData,
      moduleId,
    });
  }

  /**
   * Delete a setting
   */
  async deleteSetting(settingId: string): Promise<boolean> {
    return moduleSettingStorage.delete(settingId);
  }

  /**
   * Get setting categories for an app from the registry
   */
  getSettingCategories(appId: string): AppSettingCategory[] {
    const definition = getAppById(appId);
    return definition?.settingCategories ?? [];
  }

  /**
   * Bulk update settings for an app
   */
  async bulkUpdateSettings(
    appId: string,
    settings: Array<{ key: string; value: unknown }>,
  ): Promise<ModuleSetting[]> {
    const results: ModuleSetting[] = [];
    for (const { key, value } of settings) {
      const updated = await moduleSettingStorage.setValue(appId, key, value);
      results.push(updated);
    }

    return results;
  }
}
