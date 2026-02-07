/**
 * Apps Registry
 *
 * Central definition for all application apps with TypeScript type safety.
 * Apps are developer-defined features that can be enabled/disabled via admin UI.
 * Each app has its own routes, permissions, settings, and navigation items.
 */

import { CheckSquare, Gamepad2, ScrollText, StickyNote, type LucideIcon } from "lucide-react";

// =============================================================================
// App Type Definitions
// =============================================================================

export interface AppPermission {
  resource: string;
  action: string;
  description: string;
}

export interface AppSettingCategory {
  key: string;
  label: string;
  description?: string;
}

export interface AppDefinition<S extends string = string> {
  /** Unique identifier for the app (used in database) */
  id: S;
  /** URL-friendly slug (used in routes: /admin/[slug]) */
  slug: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Icon component from lucide-react */
  icon: LucideIcon;
  /** Icon name for serialization (must match lucide-react export name) */
  iconName: string;
  /** App version */
  version: string;
  /** Permissions this app registers */
  permissions: AppPermission[];
  /** Setting categories for this app (optional) */
  settingCategories?: AppSettingCategory[];
  /** Whether this app is enabled by default on fresh installs */
  enabledByDefault?: boolean;
}

// =============================================================================
// Helper Function for Creating Apps
// =============================================================================

/**
 * Helper to define an app with type safety
 */
export function defineApp<S extends string>(
  id: S,
  config: Omit<AppDefinition<S>, "id">,
): AppDefinition<S> {
  return { id, ...config };
}

// =============================================================================
// Apps Registry Definition
// =============================================================================

/**
 * Register all application apps here.
 * Developers add new apps by calling defineApp() and adding to this array.
 *
 * Example:
 * ```ts
 * defineApp("events", {
 *   slug: "events",
 *   name: "Event Booking",
 *   description: "Manage events and bookings",
 *   icon: CalendarDays,
 *   iconName: "CalendarDays",
 *   version: "1.0.0",
 *   permissions: [
 *     // Note: App access is controlled via user entitlements, not permissions
 *     { resource: "events", action: "view", description: "View events" },
 *     { resource: "events", action: "create", description: "Create events" },
 *   ],
 *   settingCategories: [
 *     { key: "booking", label: "Booking Settings" },
 *   ],
 * })
 * ```
 */
export const APPS_REGISTRY: AppDefinition[] = [
  // ==========================================================================
  // Notes App - Simple internal notes/memos for admin users
  // ==========================================================================
  defineApp("notes", {
    slug: "notes",
    name: "Notes",
    description: "Create and manage internal notes and memos",
    icon: StickyNote,
    iconName: "StickyNote",
    version: "1.0.0",
    enabledByDefault: true,
    permissions: [
      // Note: App access is controlled via user entitlements (app_permissions table)
      { resource: "notes", action: "view", description: "View" },
      { resource: "notes", action: "create", description: "Create" },
      { resource: "notes", action: "edit", description: "Edit" },
      { resource: "notes", action: "delete", description: "Delete" },
    ],
  }),

  // ==========================================================================
  // Tasks App - Task management with lists, status, and assignments
  // ==========================================================================
  defineApp("tasks", {
    slug: "tasks",
    name: "Tasks",
    description: "Manage tasks, to-do lists, and assignments",
    icon: CheckSquare,
    iconName: "CheckSquare",
    version: "1.0.0",
    enabledByDefault: true,
    permissions: [
      // Note: App access is controlled via user entitlements (app_permissions table)
      { resource: "tasks", action: "view", description: "View" },
      { resource: "tasks", action: "create", description: "Create" },
      { resource: "tasks", action: "edit", description: "Edit" },
      { resource: "tasks", action: "delete", description: "Delete" },
      { resource: "tasks", action: "assign", description: "Assign" },
    ],
  }),

  // ==========================================================================
  // Coop Games App - Track cooperative games for play sessions
  // ==========================================================================
  defineApp("games", {
    slug: "games",
    name: "Games",
    description: "Track cooperative games for play sessions",
    icon: Gamepad2,
    iconName: "Gamepad2",
    version: "1.0.0",
    enabledByDefault: true,
    permissions: [
      { resource: "games", action: "view", description: "View" },
      { resource: "games", action: "create", description: "Create" },
      { resource: "games", action: "edit", description: "Edit" },
      { resource: "games", action: "delete", description: "Delete" },
    ],
  }),

  defineApp("invoices", {
    slug: "invoices",
    name: "Invoices",
    description: "Create and manage corporational invoices",
    icon: ScrollText,
    iconName: "ScrollText",
    version: "1.0.0",
    enabledByDefault: true,
    permissions: [
      { resource: "invoices", action: "view", description: "View" },
      { resource: "invoices", action: "create", description: "Create" },
      { resource: "invoices", action: "edit", description: "Edit" },
      { resource: "invoices", action: "delete", description: "Delete" },
    ],
  }),
];

// =============================================================================
// Type Exports
// =============================================================================

/** Union type of all registered app IDs */
export type AppId = (typeof APPS_REGISTRY)[number]["id"];

/** Union type of all registered app slugs */
export type AppSlug = (typeof APPS_REGISTRY)[number]["slug"];

// =============================================================================
// Runtime Utilities
// =============================================================================

/**
 * Get app definition by ID
 */
export function getAppById<S extends string>(id: S): AppDefinition<S> | undefined {
  return APPS_REGISTRY.find((m) => m.id === id) as AppDefinition<S> | undefined;
}

/**
 * Get app definition by slug
 */
export function getAppBySlug(slug: string): AppDefinition | undefined {
  return APPS_REGISTRY.find((m) => m.slug === slug);
}

/**
 * Check if an app ID is valid (registered)
 */
export function isValidAppId(id: string): id is AppId {
  return APPS_REGISTRY.some((m) => m.id === id);
}

/**
 * Check if an app slug is valid (registered)
 */
export function isValidAppSlug(slug: string): slug is AppSlug {
  return APPS_REGISTRY.some((m) => m.slug === slug);
}

/**
 * Get all permissions from all registered apps
 */
export function getAllAppPermissions(): AppPermission[] {
  return APPS_REGISTRY.flatMap((m) => m.permissions);
}

/**
 * Get all apps that should be enabled by default
 */
export function getDefaultEnabledApps(): AppDefinition[] {
  return APPS_REGISTRY.filter((m) => m.enabledByDefault);
}
