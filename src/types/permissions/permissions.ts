/**
 * Permission Types & Constants
 *
 * This module contains ONLY types and constants with NO project imports.
 * This prevents circular dependency issues when other modules import these types.
 */

// =============================================================================
// Core Permission Resources & Actions (Source of Truth)
// =============================================================================

/**
 * Core system resources (non-module)
 * Module resources are defined in modules.registry.ts
 */
export const CORE_RESOURCES = [
  "users",
  "roles",
  "settings",
  "sessions",
  "system",
  "activity",
] as const;

/**
 * All possible actions across core resources
 */
export const CORE_ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "activate",
  "app-permissions",
  "revoke",
  "setup",
  "backup",
  "verify",
] as const;

// =============================================================================
// Derived Types (must be defined before RESOURCE_ACTIONS for satisfies clause)
// =============================================================================

/** Union type of all core resources */
export type CoreResource = (typeof CORE_RESOURCES)[number];

/** Union type of all core actions */
export type CoreAction = (typeof CORE_ACTIONS)[number];

/**
 * Resource-specific actions mapping (for validation)
 */
export const RESOURCE_ACTIONS = {
  users: ["view", "create", "edit", "delete", "activate", "app-permissions"],
  roles: ["view", "create", "edit", "delete"],
  settings: ["view", "edit"],
  sessions: ["view", "revoke"],
  system: ["view", "setup", "backup"],
  activity: ["view", "verify"],
} as const satisfies Record<CoreResource, readonly CoreAction[]>;

/** Valid actions for a specific resource */
export type ActionsForResource<R extends CoreResource> = (typeof RESOURCE_ACTIONS)[R][number];

/** Core permission string format: "resource.action" */
export type CorePermissionString = {
  [R in CoreResource]: `${R}.${ActionsForResource<R>}`;
}[CoreResource];

// =============================================================================
// Activity Types
// =============================================================================

/**
 * Activity scope - where the action originated
 */
export type ActivityScope = "system" | "app";

/**
 * Activity target types - entity types that can be logged
 */
export const ACTIVITY_TARGET_TYPES = [
  "user",
  "role",
  "session",
  "user-sessions",
  "setting",
  "invitation",
  "auth",
  "system",
  "note",
  "task",
  "task-list",
] as const;

export type ActivityTargetType = (typeof ACTIVITY_TARGET_TYPES)[number];

// =============================================================================
// Authorization Types
// =============================================================================

export interface AuthorizationResult {
  authorized: boolean;
  error?: string;
  status?: number;
}

/**
 * Permission constants for easy reference
 */
export const PERMISSIONS = {
  // Users
  USERS_VIEW: { resource: "users", action: "view" },
  USERS_CREATE: { resource: "users", action: "create" },
  USERS_EDIT: { resource: "users", action: "edit" },
  USERS_DELETE: { resource: "users", action: "delete" },
  USERS_ACTIVATE: { resource: "users", action: "activate" },
  USERS_APP_PERMISSIONS: { resource: "users", action: "app-permissions" },

  // Roles
  ROLES_VIEW: { resource: "roles", action: "view" },
  ROLES_CREATE: { resource: "roles", action: "create" },
  ROLES_EDIT: { resource: "roles", action: "edit" },
  ROLES_DELETE: { resource: "roles", action: "delete" },

  // Settings
  SETTINGS_VIEW: { resource: "settings", action: "view" },
  SETTINGS_EDIT: { resource: "settings", action: "edit" },

  // Sessions
  SESSIONS_VIEW: { resource: "sessions", action: "view" },
  SESSIONS_REVOKE: { resource: "sessions", action: "revoke" },

  // System
  SYSTEM_VIEW: { resource: "system", action: "view" },
  SYSTEM_SETUP: { resource: "system", action: "setup" },
  SYSTEM_BACKUP: { resource: "system", action: "backup" },

  // Activity
  ACTIVITY_VIEW: { resource: "activity", action: "view" },
} as const satisfies Record<string, { resource: CoreResource; action: CoreAction }>;
