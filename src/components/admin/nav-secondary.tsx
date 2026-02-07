"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { useTranslations } from "next-intl";
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
 * Secondary navigation component.
 * Renders a single "System" link that navigates to system settings.
 */
export function NavSecondary(props: React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();
  const { hasPermission } = useUserSession();
  const { isMobile, setOpenMobile } = useSidebar();

  // Check if user has access to any system page
  const hasSystemAccess =
    hasPermission("settings", "view") ||
    hasPermission("users", "view") ||
    hasPermission("roles", "view") ||
    hasPermission("activity", "view") ||
    hasPermission("sessions", "view");

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Don't render if user has no system access
  if (!hasSystemAccess) {
    return null;
  }

  const isActive = pathname?.startsWith("/admin/system");

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={t("system")} asChild isActive={isActive}>
              <Link href="/admin/system/users" onClick={handleLinkClick}>
                <Settings />
                <span>{t("system")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
