"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Archive, CheckSquare, Gamepad2, StickyNote, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { NavItem } from "@/lib/navigation";
import { useSelectedApp } from "@/hooks/admin/use-selected-app";
import { CommandPaletteTrigger } from "@/components/admin/command-palette-trigger";
import { ContextSwitcher } from "@/components/admin/context-switcher";
import { NavMain } from "@/components/admin/nav-main";
import { NavProfile } from "@/components/admin/nav-profile";
import { NavSecondary } from "@/components/admin/nav-secondary";
import { NavSystem } from "@/components/admin/nav-system";
import { NavUser } from "@/components/admin/nav-user";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";

// =============================================================================
// App Navigation Configuration
// =============================================================================

interface AppNavConfig {
  icon: LucideIcon;
  getItems: (t: ReturnType<typeof useTranslations>) => NavItem[];
}

/**
 * Navigation items for each app.
 * Defined here (not in registry) so we can use translations.
 */
const APP_NAV_CONFIG: Record<string, AppNavConfig> = {
  notes: {
    icon: StickyNote,
    getItems: (t) => [
      {
        title: t("nav.allNotes"),
        url: "/admin/notes",
        icon: StickyNote,
        permission: { resource: "notes", action: "view" },
      },
      {
        title: t("nav.archivedNotes"),
        url: "/admin/notes/archived",
        icon: Archive,
        permission: { resource: "notes", action: "view" },
      },
    ],
  },
  tasks: {
    icon: CheckSquare,
    getItems: (t) => [
      {
        title: t("nav.allTasks"),
        url: "/admin/tasks",
        icon: CheckSquare,
        permission: { resource: "tasks", action: "view" },
      },
      {
        title: t("nav.lists"),
        url: "/admin/tasks/lists",
        icon: CheckSquare,
        permission: { resource: "tasks", action: "view" },
      },
    ],
  },
  games: {
    icon: Gamepad2,
    getItems: (t) => [
      {
        title: t("nav.allGames"),
        url: "/admin/games",
        icon: Gamepad2,
        permission: { resource: "games", action: "view" },
      },
    ],
  },
};

export function AppSidebar(
  props: React.ComponentProps<typeof Sidebar> & { userPermissions: string[] },
) {
  const { userPermissions, ...sidebarProps } = props;
  const pathname = usePathname();
  const tNotes = useTranslations("apps/notes");
  const tTasks = useTranslations("apps/tasks");
  const tGames = useTranslations("apps/games");
  const { selectedApp } = useSelectedApp();

  // Detect special sidebar modes
  const isProfilePage = pathname?.startsWith("/admin/profile");
  const isSystemPage = pathname?.startsWith("/admin/system");

  // Map app IDs to their translation functions
  const appTranslations: Record<string, ReturnType<typeof useTranslations>> = React.useMemo(
    () => ({
      notes: tNotes,
      tasks: tTasks,
      games: tGames,
    }),
    [tNotes, tTasks, tGames],
  );

  // Build nav items from selected app using translations
  const navMain = React.useMemo(() => {
    if (!selectedApp) return [];

    const config = APP_NAV_CONFIG[selectedApp.id];
    if (!config) return [];

    const t = appTranslations[selectedApp.id];
    if (!t) return [];

    const items = config.getItems(t);

    // Filter by permissions (server-side data)
    return items
      .filter((item) => {
        if (!item.permission) return true;
        const permString = `${item.permission.resource}.${item.permission.action}`;
        return userPermissions.includes(permString);
      })
      .map((item) => ({
        ...item,
        items: item.items?.filter((subItem) => {
          if (!subItem.permission) return true;
          const permString = `${subItem.permission.resource}.${subItem.permission.action}`;
          return userPermissions.includes(permString);
        }),
      }))
      .filter((item) => !item.items || item.items.length > 0);
  }, [selectedApp, appTranslations, userPermissions]);

  // Determine which main content to show
  const renderContent = () => {
    if (isProfilePage) return <NavProfile />;
    if (isSystemPage) return <NavSystem />;
    return <NavMain items={navMain} />;
  };

  // Show NavSecondary on default and profile pages (not on system pages)
  const showNavSecondary = !isSystemPage;

  return (
    <Sidebar className="border-r-0" {...sidebarProps}>
      <SidebarHeader>
        <ContextSwitcher />
        <CommandPaletteTrigger />
      </SidebarHeader>
      <SidebarContent className="">
        {renderContent()}
        {showNavSecondary && <NavSecondary className="mt-auto" />}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
