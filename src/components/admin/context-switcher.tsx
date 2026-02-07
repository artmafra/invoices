"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Package, Settings, UserCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { siteConfig } from "@/config/site.config";
import { getIconByName } from "@/lib/icons";
import { useSelectedApp } from "@/hooks/admin/use-selected-app";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const router = useRouter();
  const tNav = useTranslations("admin.nav");
  const tSwitcher = useTranslations("admin.appSwitcher");
  const { isMobile, setOpenMobile } = useSidebar();
  const { selectedApp, accessibleApps, hasAccessibleApps, selectApp } = useSelectedApp();

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

  const handleSelectApp = (appSlug: string) => {
    selectApp(appSlug);
    router.push(`/admin/${appSlug}`);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleNavigate = (url: string) => {
    router.push(url);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

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

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild suppressHydrationWarning>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center">
                <Image src="/images/logo.svg" alt={siteConfig.name} width={32} height={32} />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{siteConfig.name}</span>
                <span className="text-muted-foreground truncate text-xs">{getContextLabel()}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            {/* Apps section */}
            {hasAccessibleApps && (
              <>
                <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                  {tSwitcher("switchApp")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {accessibleApps.map((app) => {
                  const AppIcon = getIconByName(app.iconName);
                  const isSelected = selectedApp?.slug === app.slug && contextMode === "app";

                  return (
                    <DropdownMenuItem
                      key={app.slug}
                      onClick={() => handleSelectApp(app.slug)}
                      className="gap-space-sm p-space-sm"
                    >
                      <div className="flex size-6 items-center justify-center">
                        <AppIcon className="size-4 shrink-0" />
                      </div>
                      <span className="flex-1">{app.name}</span>
                      {isSelected && <Check className="text-primary size-4" />}
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
              </>
            )}

            {/* System & Profile links */}
            <DropdownMenuItem
              onClick={() => handleNavigate("/admin/system/users")}
              className="gap-space-sm p-space-sm"
            >
              <div className="flex size-6 items-center justify-center">
                <Settings className="size-4 shrink-0" />
              </div>
              <span className="flex-1">{tNav("system")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="gap-space-sm p-space-sm">
              <Link href="/admin/profile">
                <div className="flex size-6 items-center justify-center">
                  <UserCircle className="size-4 shrink-0" />
                </div>
                <span className="flex-1">{tNav("profile")}</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
