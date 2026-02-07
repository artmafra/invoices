import {
  APPS_REGISTRY,
  getAppById,
  getAppBySlug,
  type AppDefinition,
} from "@/config/apps.registry";

/**
 * Service for working with apps.
 * All apps are always enabled - the registry is the sole source of truth.
 */
export class AppService {
  /**
   * Get all registered apps
   */
  getAllApps(): AppDefinition[] {
    return APPS_REGISTRY;
  }

  /**
   * Get an app by its registry ID
   */
  getAppById(id: string): AppDefinition | null {
    return getAppById(id) ?? null;
  }

  /**
   * Get an app by its slug
   */
  getAppBySlug(slug: string): AppDefinition | null {
    return getAppBySlug(slug) ?? null;
  }

  /**
   * Get all app IDs
   */
  getAllAppIds(): string[] {
    return APPS_REGISTRY.map((m) => m.id);
  }

  /**
   * Get all app slugs
   */
  getAllAppSlugs(): string[] {
    return APPS_REGISTRY.map((m) => m.slug);
  }
}
