/**
 * Commands Registry
 *
 * Central definition for all command palette items.
 * Commands are derived from navigation items + custom actions.
 * All commands respect the permission system.
 */

import {
  Activity,
  FileText,
  Globe,
  History,
  Home,
  Monitor,
  Moon,
  Plus,
  Proportions,
  Settings,
  Shield,
  ShieldCheck,
  Sliders,
  Sun,
  User,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

// =============================================================================
// Command Type Definitions
// =============================================================================

export interface CommandPermission {
  resource: string;
  action: string;
}

export type CommandType = "page" | "action" | "function";

/** Unique identifier for function commands */
export type FunctionCommandId =
  | "theme:light"
  | "theme:dark"
  | "theme:system"
  | "language:en-US"
  | "language:pt-BR"
  | "density:compact"
  | "density:comfortable"
  | "density:spacious";

export interface CommandDefinition {
  /** Unique identifier for the command */
  id: string;
  /** Translation key for the label (e.g., "dashboard" maps to "commands.dashboard") - for core commands */
  labelKey?: string;
  /** Display label shown in command palette - for module commands (not translated) */
  label?: string;
  /** Group this command belongs to (for visual organization) */
  group: string;
  /** Icon component from lucide-react */
  icon: LucideIcon;
  /** Type: 'page' for navigation, 'action' for triggering dialogs, 'function' for immediate execution */
  type: CommandType;
  /** URL to navigate to (for page commands) */
  href?: string;
  /** Action identifier for triggering dialogs (for action commands) */
  actionId?: string;
  /** URL to navigate to before triggering action (for action commands) */
  actionHref?: string;
  /** Function command identifier (for function commands) */
  functionId?: FunctionCommandId;
  /** Translation key for keywords (e.g., "dashboard" maps to "keywords.dashboard") - for core commands */
  keywordsKey?: string;
  /** Keywords for fuzzy search matching - for module commands (not translated) */
  keywords?: string[];
  /** Permission required to see this command */
  permission?: CommandPermission;
  /** Whether this command requires an active module (derived from module navItems) */
  moduleId?: string;
}

export interface CommandGroup {
  /** Group identifier */
  id: string;
  /** Translation key for the group label (e.g., "pages" maps to "groups.pages") */
  labelKey: string;
  /** Sort priority (lower = higher in list) */
  priority: number;
}

// =============================================================================
// Command Groups
// =============================================================================

export const COMMAND_GROUPS: CommandGroup[] = [
  { id: "pages", labelKey: "pages", priority: 0 },
  { id: "system", labelKey: "system", priority: 1 },
  { id: "tools", labelKey: "tools", priority: 2 },
];

// =============================================================================
// Core Commands (always available, permission-gated)
// =============================================================================

/**
 * Core system commands - these are always registered regardless of modules.
 * Each command can be gated by permissions.
 */
export const CORE_COMMANDS: CommandDefinition[] = [
  // ---------------------------------------------------------------------------
  // System Pages
  // ---------------------------------------------------------------------------
  {
    id: "page:dashboard",
    labelKey: "dashboard",
    group: "pages",
    icon: Home,
    type: "page",
    href: "/admin",
    keywordsKey: "dashboard",
  },
  {
    id: "page:profile",
    labelKey: "profile",
    group: "pages",
    icon: User,
    type: "page",
    href: "/admin/profile",
    keywordsKey: "profile",
  },
  {
    id: "page:profile:preferences",
    labelKey: "profilePreferences",
    group: "pages",
    icon: Sliders,
    type: "page",
    href: "/admin/profile/preferences",
    keywordsKey: "profilePreferences",
  },
  {
    id: "page:profile:security",
    labelKey: "profileSecurity",
    group: "pages",
    icon: ShieldCheck,
    type: "page",
    href: "/admin/profile/security",
    keywordsKey: "profileSecurity",
  },
  {
    id: "page:profile:sessions",
    labelKey: "profileSessions",
    group: "pages",
    icon: Monitor,
    type: "page",
    href: "/admin/profile/sessions",
    keywordsKey: "profileSessions",
  },
  {
    id: "page:profile:login-history",
    labelKey: "profileLoginHistory",
    group: "pages",
    icon: History,
    type: "page",
    href: "/admin/profile/login-history",
    keywordsKey: "profileLoginHistory",
  },
  {
    id: "page:settings",
    labelKey: "settings",
    group: "system",
    icon: Settings,
    type: "page",
    href: "/admin/system/settings",
    keywordsKey: "settings",
    permission: { resource: "settings", action: "view" },
  },
  {
    id: "page:users",
    labelKey: "users",
    group: "system",
    icon: Users,
    type: "page",
    href: "/admin/system/users",
    keywordsKey: "users",
    permission: { resource: "users", action: "view" },
  },
  {
    id: "action:users:create",
    labelKey: "usersNew",
    group: "system",
    icon: Plus,
    type: "action",
    actionId: "users:create",
    actionHref: "/admin/system/users",
    keywordsKey: "usersNew",
    permission: { resource: "users", action: "create" },
  },
  {
    id: "action:users:invite",
    labelKey: "usersInvite",
    group: "system",
    icon: Plus,
    type: "action",
    actionId: "users:invite",
    actionHref: "/admin/system/users",
    keywordsKey: "usersInvite",
    permission: { resource: "users", action: "create" },
  },
  {
    id: "page:roles",
    labelKey: "roles",
    group: "system",
    icon: Shield,
    type: "page",
    href: "/admin/system/roles",
    keywordsKey: "roles",
    permission: { resource: "roles", action: "view" },
  },
  {
    id: "action:roles:create",
    labelKey: "rolesNew",
    group: "system",
    icon: Plus,
    type: "action",
    actionId: "roles:create",
    actionHref: "/admin/system/roles",
    keywordsKey: "rolesNew",
    permission: { resource: "roles", action: "create" },
  },
  {
    id: "page:activity",
    labelKey: "activityLog",
    group: "system",
    icon: Activity,
    type: "page",
    href: "/admin/system/activity",
    keywordsKey: "activityLog",
    permission: { resource: "activity", action: "view" },
  },
  {
    id: "page:sessions",
    labelKey: "sessions",
    group: "system",
    icon: Monitor,
    type: "page",
    href: "/admin/system/sessions",
    keywordsKey: "sessions",
    permission: { resource: "sessions", action: "view" },
  },
  {
    id: "page:setup",
    labelKey: "setup",
    group: "system",
    icon: Wrench,
    type: "page",
    href: "/admin/system/setup",
    keywordsKey: "setup",
    permission: { resource: "system", action: "setup" },
  },
  // ---------------------------------------------------------------------------
  // Tools
  // ---------------------------------------------------------------------------
  {
    id: "function:theme:light",
    labelKey: "themeLight",
    group: "tools",
    icon: Sun,
    type: "function",
    functionId: "theme:light",
    keywordsKey: "themeLight",
  },
  {
    id: "function:theme:dark",
    labelKey: "themeDark",
    group: "tools",
    icon: Moon,
    type: "function",
    functionId: "theme:dark",
    keywordsKey: "themeDark",
  },
  {
    id: "function:theme:system",
    labelKey: "themeSystem",
    group: "tools",
    icon: Monitor,
    type: "function",
    functionId: "theme:system",
    keywordsKey: "themeSystem",
  },
  {
    id: "function:language:en-US",
    labelKey: "languageEnglish",
    group: "tools",
    icon: Globe,
    type: "function",
    functionId: "language:en-US",
    keywordsKey: "languageEnglish",
  },
  {
    id: "function:language:pt-BR",
    labelKey: "languagePortuguese",
    group: "tools",
    icon: Globe,
    type: "function",
    functionId: "language:pt-BR",
    keywordsKey: "languagePortuguese",
  },
  {
    id: "function:density:compact",
    labelKey: "densityCompact",
    group: "tools",
    icon: Proportions,
    type: "function",
    functionId: "density:compact",
    keywordsKey: "densityCompact",
  },
  {
    id: "function:density:comfortable",
    labelKey: "densityComfortable",
    group: "tools",
    icon: Proportions,
    type: "function",
    functionId: "density:comfortable",
    keywordsKey: "densityComfortable",
  },
  {
    id: "function:density:spacious",
    labelKey: "densitySpacious",
    group: "tools",
    icon: Proportions,
    type: "function",
    functionId: "density:spacious",
    keywordsKey: "densitySpacious",
  },
];

// =============================================================================
// Module Command Generators
// =============================================================================

/**
 * Generates commands from a module's navigation items.
 * Called dynamically based on user's enabled modules.
 */
export interface ModuleCommandConfig {
  moduleId: string;
  moduleName: string;
  icon: LucideIcon;
  /** Navigation pages from the module */
  pages: Array<{
    /** Translation key for the label (e.g., "allNotes" maps to "commandPalette.commands.notes.allNotes") */
    labelKey: string;
    href: string;
    /** Translation key for keywords (e.g., "allNotes" maps to "commandPalette.keywords.notes.allNotes") */
    keywordsKey: string;
    permission?: CommandPermission;
  }>;
  /** Quick actions for the module */
  actions?: Array<{
    /** Translation key for the label (e.g., "new" maps to "commandPalette.commands.notes.new") */
    labelKey: string;
    actionId: string;
    /** URL to navigate to before triggering this action */
    actionHref: string;
    /** Translation key for keywords (e.g., "new" maps to "commandPalette.keywords.notes.new") */
    keywordsKey: string;
    permission?: CommandPermission;
  }>;
}

/**
 * Generate command definitions from a module config
 */
export function generateModuleCommands(config: ModuleCommandConfig): CommandDefinition[] {
  const commands: CommandDefinition[] = [];

  // Generate page commands
  for (const page of config.pages) {
    commands.push({
      id: `page:${config.moduleId}:${page.href.split("/").pop() || "index"}`,
      labelKey: `${config.moduleId}.${page.labelKey}`,
      group: "pages",
      icon: config.icon,
      type: "page",
      href: page.href,
      keywordsKey: `${config.moduleId}.${page.keywordsKey}`,
      permission: page.permission,
      moduleId: config.moduleId,
    });
  }

  // Generate action commands (nested under module name)
  if (config.actions) {
    for (const action of config.actions) {
      commands.push({
        id: `action:${config.moduleId}:${action.actionId}`,
        labelKey: `${config.moduleId}.${action.labelKey}`,
        group: "pages",
        icon: Plus,
        type: "action",
        actionId: `${config.moduleId}:${action.actionId}`,
        actionHref: action.actionHref,
        keywordsKey: `${config.moduleId}.${action.keywordsKey}`,
        permission: action.permission,
        moduleId: config.moduleId,
      });
    }
  }

  return commands;
}

// =============================================================================
// Pre-defined Module Commands
// =============================================================================

/**
 * Module command configurations.
 * These extend the base module definitions with command-specific metadata.
 */
export const MODULE_COMMAND_CONFIGS: Record<string, Omit<ModuleCommandConfig, "moduleId">> = {
  notes: {
    moduleName: "Notes",
    icon: FileText,
    pages: [
      {
        labelKey: "allNotes",
        href: "/admin/notes",
        keywordsKey: "allNotes",
        permission: { resource: "notes", action: "view" },
      },
      {
        labelKey: "archivedNotes",
        href: "/admin/notes/archived",
        keywordsKey: "archivedNotes",
        permission: { resource: "notes", action: "view" },
      },
    ],
    actions: [
      {
        labelKey: "new",
        actionId: "create",
        actionHref: "/admin/notes",
        keywordsKey: "new",
        permission: { resource: "notes", action: "create" },
      },
    ],
  },
  tasks: {
    moduleName: "Tasks",
    icon: FileText, // Will be overridden by module icon
    pages: [
      {
        labelKey: "allTasks",
        href: "/admin/tasks",
        keywordsKey: "allTasks",
        permission: { resource: "tasks", action: "view" },
      },
      {
        labelKey: "taskLists",
        href: "/admin/tasks/lists",
        keywordsKey: "taskLists",
        permission: { resource: "tasks", action: "view" },
      },
    ],
    actions: [
      {
        labelKey: "newTask",
        actionId: "create",
        actionHref: "/admin/tasks",
        keywordsKey: "newTask",
        permission: { resource: "tasks", action: "create" },
      },
      {
        labelKey: "newList",
        actionId: "create-list",
        actionHref: "/admin/tasks/lists",
        keywordsKey: "newList",
        permission: { resource: "tasks", action: "create" },
      },
    ],
  },
  games: {
    moduleName: "Games",
    icon: FileText, // Will be overridden by module icon
    pages: [
      {
        labelKey: "allGames",
        href: "/admin/games",
        keywordsKey: "allGames",
        permission: { resource: "games", action: "view" },
      },
    ],
    actions: [
      {
        labelKey: "new",
        actionId: "create",
        actionHref: "/admin/games",
        keywordsKey: "new",
        permission: { resource: "games", action: "create" },
      },
    ],
  },
};
