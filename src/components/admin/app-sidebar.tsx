"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useSelectedCompany } from "@/contexts/company-context";
import { BarChart2, Briefcase, Building2, FilePenLine, Users, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { NavItem } from "@/lib/navigation";
import { useSelectedApp } from "@/hooks/admin/use-selected-app";
import { CommandPaletteTrigger } from "@/components/admin/command-palette-trigger";
import { ContextSwitcher } from "@/components/admin/context-switcher";
import { NavMain } from "@/components/admin/nav-main";
import { NavProfile } from "@/components/admin/nav-profile";
import { NavSecondary } from "@/components/admin/nav-secondary";
import { NavSystem } from "@/components/admin/nav-system";
import { NavTop } from "@/components/admin/nav-top";
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
  invoices: {
    icon: FilePenLine,
    getItems: (t) => [
      {
        title: t("nav.companies"),
        url: "/admin/invoices/companies",
        icon: Building2,
        permission: { resource: "companies", action: "view" },
      },
      {
        title: t("nav.allTasks"),
        url: "/admin/invoices",
        icon: FilePenLine,
        permission: { resource: "invoices", action: "view" },
      },
      {
        title: t("nav.suppliers"),
        url: "/admin/invoices/suppliers",
        icon: Users,
        permission: { resource: "suppliers", action: "view" },
      },
      {
        title: t("nav.services"),
        url: "/admin/invoices/services",
        icon: Briefcase,
        permission: { resource: "services", action: "view" },
      },
      {
        title: t("nav.reports"),
        url: "/admin/invoices/reports",
        icon: BarChart2,
        permission: { resource: "invoices", action: "view" },
      },
    ],
  },
};

export function AppSidebar(
  props: React.ComponentProps<typeof Sidebar> & { userPermissions: string[] },
) {
  const { userPermissions, ...sidebarProps } = props;
  const pathname = usePathname();
  const tInvoices = useTranslations("apps/invoices");
  const tSuppliers = useTranslations("apps/suppliers");
  const { selectedApp } = useSelectedApp();
  const { selectedCompanyId } = useSelectedCompany();

  // Detect special sidebar modes
  const isProfilePage = pathname?.startsWith("/admin/profile");
  const isSystemPage = pathname?.startsWith("/admin/system");
  const isInvoicesWithoutCompany = selectedApp?.id === "invoices" && !selectedCompanyId;

  // Map app IDs to their translation functions
  const appTranslations: Record<string, ReturnType<typeof useTranslations>> = React.useMemo(
    () => ({
      invoices: tInvoices,
      suppliers: tSuppliers,
    }),
    [tInvoices, tSuppliers],
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
    if (isInvoicesWithoutCompany) return <NavMain items={navMain.slice(0, 1)} />;
    return <NavMain items={navMain} />;
  };

  // Always show NavSecondary; it handles its own visibility per-button

  return (
    <Sidebar className="border-r-0" {...sidebarProps}>
      <SidebarHeader>
        <ContextSwitcher />
        <CommandPaletteTrigger />
      </SidebarHeader>
      <SidebarContent className="">
        <NavTop />
        {renderContent()}
        <NavSecondary className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
