import { Package, Settings } from "lucide-react";
import type { ActivityDetails, ActivityEntry } from "@/types/common/activity.types";
import { getAppById } from "@/config/apps.registry";
import { entityTypeMap } from "./constants";

/**
 * Translation function type for activity log localization
 */
type TranslationFunction = {
  (key: string): string;
  (key: string, values: Record<string, string | number>): string;
  has: (key: string) => boolean;
};

/**
 * Generate a human-readable summary for an activity entry
 * Returns simple action titles (target info shown separately in Affected line)
 */
export function generateSummary(log: ActivityEntry, t: TranslationFunction): string {
  const action = log.action;
  const translationKey = `actions.${action}`;

  // Check if translation exists
  if (t.has(translationKey)) {
    return t(translationKey);
  }

  // Fallback: parse action and generate generic summary using translated verbs/resources
  const [resource, verb] = action.split(".");

  const verbKey = `verbs.${verb}`;
  const resourceKey = `resources.${resource}`;

  const formattedVerb = t.has(verbKey)
    ? t(verbKey)
    : verb?.charAt(0).toUpperCase() + verb?.slice(1) || "Action";

  const formattedResource = t.has(resourceKey)
    ? t(resourceKey)
    : resource?.replace(/_/g, " ") || "item";

  return `${formattedVerb} ${formattedResource}`;
}

/**
 * Format a value for display
 */
export function formatValue(value: unknown): string | { empty: true } {
  if (value === null || value === undefined) return { empty: true };
  if (typeof value === "string") {
    if (value === "") return { empty: true };
    return value;
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value.toString();
  return JSON.stringify(value);
}

/**
 * Check if a string looks like an image URL
 */
export function isImageUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  // Check for common image extensions or cloud storage patterns
  return (
    /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(value) ||
    value.startsWith("/api/storage/images/") ||
    value.includes("storage.googleapis.com") ||
    value.includes("cloudinary.com") ||
    value.includes("amazonaws.com")
  );
}

/**
 * Check if a string looks like a UUID (for determining display format)
 */
export function isUuid(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Format an ID for display - show prefix for UUIDs, full value for non-UUIDs (like setting keys)
 */
export function formatIdForDisplay(id: string | null | undefined): string | null {
  if (!id) return null;
  return isUuid(id) ? id.slice(0, 6) : id;
}

/**
 * Get the translation key for an entity type
 */
export function getEntityTypeKey(type: string | undefined): string {
  if (!type) return "unknown";
  return entityTypeMap[type] || "unknown";
}

/**
 * Scope badge configuration type
 */
export interface ScopeBadgeConfig {
  label: string;
  icon: typeof Settings;
  variant: "secondary" | "outline";
}

/**
 * Get scope badge info (System or App)
 */
export function getScopeBadge(details: ActivityDetails | null): ScopeBadgeConfig {
  if (!details || details.scope === "system") {
    return { label: "System", icon: Settings, variant: "secondary" };
  }

  // Get app name from registry
  const appInfo = details.appId ? getAppById(details.appId) : null;
  const appName = appInfo?.name || details.appId || "App";

  return { label: appName, icon: Package, variant: "outline" };
}
