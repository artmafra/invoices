import { APPS_REGISTRY } from "@/config/apps.registry";
import type { App } from "@/components/apps-provider";

/**
 * Resources that grant implicit access to the "invoices" app
 */
const INVOICES_APP_RESOURCES = ["invoices", "companies", "suppliers", "services"];

/**
 * Get apps filtered by user's apps (server-side only)
 * Also auto-grants apps when the user has matching role permissions.
 */
export function getAppsForUser(apps: string[], permissions: string[] = []): App[] {
  const accessSet = new Set(apps);

  // Auto-include "invoices" app if the user has any related role permission
  if (!accessSet.has("invoices")) {
    const hasInvoicesAccess = permissions.some((p) =>
      INVOICES_APP_RESOURCES.some((r) => p.startsWith(`${r}.`)),
    );
    if (hasInvoicesAccess) {
      accessSet.add("invoices");
    }
  }

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
