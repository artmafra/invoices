"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSelectedCompany } from "@/contexts/company-context";
import { Package } from "lucide-react";
import { useTranslations } from "next-intl";
import { siteConfig } from "@/config/site.config";
import { useSelectedApp } from "@/hooks/admin/use-selected-app";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type ContextMode = "app" | "system" | "profile";

/**
 * Unified context switcher component.
 * Adapts header display based on current route while providing
 * consistent dropdown navigation to apps, system, and profile.
 */
export function ContextSwitcher() {
  const pathname = usePathname();
  const tNav = useTranslations("admin.nav");
  const tSwitcher = useTranslations("admin.appSwitcher");
  const { isMobile, setOpenMobile } = useSidebar();
  const { selectedApp, hasAccessibleApps } = useSelectedApp();
  const { selectedCompanyName } = useSelectedCompany();

  // Determine current context mode
  const getContextMode = (): ContextMode => {
    if (pathname?.startsWith("/admin/profile")) return "profile";
    if (pathname?.startsWith("/admin/system")) return "system";
    return "app";
  };

  const contextMode = getContextMode();

  // Get the context label for the header subtitle
  const getContextLabel = (): string => {
    switch (contextMode) {
      case "profile":
        return tNav("profile");
      case "system":
        return tNav("system");
      default:
        return selectedApp?.name || tSwitcher("noAppSelected");
    }
  };

  // For invoices app with a selected company, subtitle is the company name
  const subtitleLabel =
    selectedApp?.slug === "invoices" && selectedCompanyName
      ? selectedCompanyName
      : getContextLabel();

  // No accessible apps and not in system/profile - show disabled state
  if (!hasAccessibleApps && contextMode === "app") {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="bg-muted text-muted-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <Package className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="text-muted-foreground truncate font-medium">
                {tSwitcher("noApps")}
              </span>
              <span className="text-muted-foreground truncate text-xs">
                {tSwitcher("noAccess")}
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // In app context mode: show static header (no clickable link)
  if (contextMode === "app" && selectedApp) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" asChild onClick={() => isMobile && setOpenMobile(false)}>
            <Link href="/admin/invoices">
              <div className="flex aspect-square size-8 items-center justify-center">
                <Image
                  src="/images/contpaz-logo.svg"
                  alt={siteConfig.name}
                  width={32}
                  height={32}
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{siteConfig.name}</span>
                <span className="text-muted-foreground truncate text-xs">{subtitleLabel}</span>
              </div>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild onClick={() => isMobile && setOpenMobile(false)}>
          <Link href="/admin/invoices">
            <div className="flex aspect-square size-8 items-center justify-center">
              <Image src="/images/contpaz-logo.svg" alt={siteConfig.name} width={32} height={32} />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{siteConfig.name}</span>
              <span className="text-muted-foreground truncate text-xs">{subtitleLabel}</span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
