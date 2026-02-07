import { APPS_REGISTRY } from "@/config/apps.registry";
import type { App } from "@/components/apps-provider";

/**
 * Get apps filtered by user's apps (server-side only)
 */
export function getAppsForUser(apps: string[]): App[] {
  const accessSet = new Set(apps);

  return APPS_REGISTRY.filter((m) => accessSet.has(m.slug)).map((m) => ({
    id: m.id,
    slug: m.slug,
    name: m.name,
    iconName: m.iconName,
    permissions: m.permissions.map((p) => ({
      action: p.action,
      description: p.description,
    })),
  }));
}

/**
 * Get all apps (server-side only)
 */
export function getAllApps(): App[] {
  return APPS_REGISTRY.map((m) => ({
    id: m.id,
    slug: m.slug,
    name: m.name,
    iconName: m.iconName,
    permissions: m.permissions.map((p) => ({
      action: p.action,
      description: p.description,
    })),
  }));
}
