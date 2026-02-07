"use client";

import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  COMMAND_GROUPS,
  CORE_COMMANDS,
  generateModuleCommands,
  MODULE_COMMAND_CONFIGS,
  type CommandDefinition,
  type CommandGroup,
} from "@/config/commands.registry";
import { getIconByName } from "@/lib/icons";
import { useUserSession } from "@/hooks/use-session";
import { useApps } from "@/components/apps-provider";

// =============================================================================
// Types
// =============================================================================

export interface CommandItem extends Omit<CommandDefinition, "labelKey" | "keywordsKey"> {
  /** Resolved display label (translated) */
  label: string;
  /** Resolved keywords array (translated) */
  keywords: string[];
  /** Resolved icon component */
  iconComponent: LucideIcon;
}

export interface CommandGroupWithItems extends Omit<CommandGroup, "labelKey"> {
  /** Resolved display label (translated) */
  label: string;
  /** Commands in this group */
  items: CommandItem[];
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Builds the complete list of commands from core commands + user's enabled modules.
 * Filters commands based on user permissions.
 * Translates labels and keywords using the current locale.
 *
 * @returns Grouped and filtered commands ready for rendering
 */
export function useCommands() {
  const { apps } = useApps();
  const { hasPermission } = useUserSession();
  const t = useTranslations("admin.commandPalette");

  const { groups, allCommands } = useMemo(() => {
    // Start with core commands
    const commands: CommandDefinition[] = [...CORE_COMMANDS];

    // Add commands from user's enabled apps
    for (const app of apps) {
      const appConfig = MODULE_COMMAND_CONFIGS[app.id];
      if (appConfig) {
        // Get the actual icon from the app
        const appIcon = getIconByName(app.iconName);

        const appCommands = generateModuleCommands({
          moduleId: app.id,
          moduleName: app.name,
          icon: appIcon,
          pages: appConfig.pages,
          actions: appConfig.actions,
        });

        commands.push(...appCommands);
      }
    }

    // Filter by permissions
    const filteredCommands = commands.filter((cmd) => {
      // If no permission required, always show
      if (!cmd.permission) return true;
      // Check user has the required permission
      return hasPermission(cmd.permission.resource, cmd.permission.action);
    });

    // Convert to CommandItem with resolved icons and translated labels/keywords
    const commandItems: CommandItem[] = filteredCommands.map((cmd) => {
      // Resolve label: use translation if labelKey exists, otherwise use static label
      let label: string;
      if (cmd.labelKey) {
        // For module commands, prefix with module name
        if (cmd.moduleId) {
          const separator = t("separator");
          const moduleName = t(`modules.${cmd.moduleId}`);
          const commandLabel = t(`commands.${cmd.labelKey}`);
          label = `${moduleName}${separator}${commandLabel}`;
        } else {
          // Core commands use direct translation
          label = t(`commands.${cmd.labelKey}`);
        }
      } else {
        label = cmd.label || cmd.id;
      }

      // Resolve keywords: use translation if keywordsKey exists, otherwise use static keywords
      // Translation keywords are now arrays, use t.raw() to get the raw array value
      const translatedKeywords = cmd.keywordsKey ? t.raw(`keywords.${cmd.keywordsKey}`) : null;
      const keywords: string[] = translatedKeywords
        ? Array.isArray(translatedKeywords)
          ? translatedKeywords
          : []
        : cmd.keywords || [];

      return {
        ...cmd,
        label,
        keywords,
        iconComponent: cmd.icon,
      };
    });

    // Group commands
    const groupedCommands = new Map<string, CommandItem[]>();
    for (const cmd of commandItems) {
      const existing = groupedCommands.get(cmd.group) || [];
      existing.push(cmd);
      groupedCommands.set(cmd.group, existing);
    }

    // Build final grouped structure, sorted by priority
    const groupsWithItems: CommandGroupWithItems[] = COMMAND_GROUPS.filter((g) =>
      groupedCommands.has(g.id),
    )
      .map((g) => ({
        ...g,
        label: t(`groups.${g.labelKey}`),
        items: groupedCommands.get(g.id) || [],
      }))
      .sort((a, b) => a.priority - b.priority);

    return {
      groups: groupsWithItems,
      allCommands: commandItems,
    };
  }, [apps, hasPermission, t]);

  return {
    /** Commands organized by groups */
    groups,
    /** Flat list of all available commands */
    allCommands,
    /** Total number of available commands */
    count: allCommands.length,
  };
}
