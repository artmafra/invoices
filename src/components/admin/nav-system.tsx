"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Monitor, Settings, Shield, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import type { NavItem } from "@/lib/navigation";
import { isMainNavItemActive } from "@/lib/navigation";
import { useUserSession } from "@/hooks/use-session";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

/**
 * System navigation items definition.
 * Used by NavSystem component.
 */
export function getSystemNavItems(t: ReturnType<typeof useTranslations<"admin.nav">>): NavItem[] {
  return [
    {
      title: t("users"),
      url: "/admin/system/users",
      icon: Users,
      permission: { resource: "users", action: "view" },
    },
    {
      title: t("roles"),
      url: "/admin/system/roles",
      icon: Shield,
      permission: { resource: "roles", action: "view" },
    },
    {
      title: t("settings"),
      url: "/admin/system/settings",
      icon: Settings,
      permission: { resource: "settings", action: "view" },
    },
    {
      title: t("activity"),
      url: "/admin/system/activity",
      icon: Activity,
      permission: { resource: "activity", action: "view" },
    },
    {
      title: t("sessions"),
      url: "/admin/system/sessions",
      icon: Monitor,
      permission: { resource: "sessions", action: "view" },
    },
  ];
}

/**
 * Navigation component for system pages.
 * Renders system-related navigation items in the sidebar.
 */
export function NavSystem() {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();
  const { hasPermission } = useUserSession();
  const { isMobile, setOpenMobile } = useSidebar();

  const items = getSystemNavItems(t);

  // Filter items based on permissions
  const filteredItems = items.filter(
    (item) => !item.permission || hasPermission(item.permission.resource, item.permission.action),
  );

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-space-sm">
        <SidebarMenu>
          {filteredItems.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                tooltip={item.title}
                asChild
                isActive={isMainNavItemActive(item, pathname, filteredItems)}
              >
                <Link href={item.url} onClick={handleLinkClick}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
