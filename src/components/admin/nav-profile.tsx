"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionContext } from "@/contexts/session-context";
import {
  Eye,
  LogInIcon,
  LogOut,
  Monitor,
  Settings,
  ShieldUserIcon,
  UserCircle,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import type { NavItem } from "@/lib/navigation";
import { isMainNavItemActive } from "@/lib/navigation";
import { useEndImpersonation } from "@/hooks/admin/use-users";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

/**
 * Profile navigation items definition.
 * Used by NavProfile component and could be exported for use elsewhere.
 */
export function getProfileNavItems(t: ReturnType<typeof useTranslations<"admin.nav">>): NavItem[] {
  return [
    {
      title: t("profile"),
      url: "/admin/profile",
      icon: UserCircle,
    },
    {
      title: t("preferences"),
      url: "/admin/profile/preferences",
      icon: Settings,
    },
    {
      title: t("security"),
      url: "/admin/profile/security",
      icon: ShieldUserIcon,
    },
    {
      title: t("loginHistory"),
      url: "/admin/profile/login-history",
      icon: LogInIcon,
    },
    {
      title: t("sessions"),
      url: "/admin/profile/sessions",
      icon: Monitor,
    },
  ];
}

/**
 * Navigation component for profile pages.
 * Renders profile-related navigation items in the sidebar.
 */
export function NavProfile() {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const { session } = useSessionContext();
  const endImpersonation = useEndImpersonation();

  const isImpersonating = !!session?.user?.impersonatedBy;

  const items = getProfileNavItems(t);

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleLogout = async () => {
    if (isMobile) {
      setOpenMobile(false);
    }
    try {
      await fetch("/api/auth/revoke-session", { method: "POST" });
    } catch {
      // Best-effort: still proceed with client sign-out.
    }
    await signOut({ callbackUrl: "/admin/login" });
  };

  const handleExitImpersonation = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
    endImpersonation.mutate();
  };

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-space-sm">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                tooltip={item.title}
                asChild
                isActive={isMainNavItemActive(item, pathname, items)}
              >
                <Link href={item.url} onClick={handleLinkClick}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        <SidebarSeparator />
        <SidebarMenu>
          {isImpersonating ? (
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={t("exitImpersonation")}
                onClick={handleExitImpersonation}
                disabled={endImpersonation.isPending}
                variant="destructive"
              >
                <Eye />
                <span>{t("exitImpersonation")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : (
            <SidebarMenuItem>
              <SidebarMenuButton tooltip={t("logout")} onClick={handleLogout} variant="destructive">
                <LogOut />
                <span>{t("logout")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
