"use client";

import Link from "next/link";
import { useSessionContext } from "@/contexts/session-context";
import { useTranslations } from "next-intl";
import { getAvatarUrl } from "@/lib/avatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavUser() {
  const t = useTranslations("admin.nav");
  const { isMobile, setOpenMobile } = useSidebar();
  const { session } = useSessionContext();

  const isImpersonating = !!session?.user?.impersonatedBy;

  // Close mobile sidebar when navigating
  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Use session data, fallback to default values if no session
  const user = {
    name: session?.user?.name || "Guest",
    email: session?.user?.email || "",
    avatar: session?.user?.image || undefined,
  };

  // Generate initials from user name for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          asChild
          className={isImpersonating ? "ring-1 ring-warning ring-offset-1 ring-offset-sidebar" : ""}
        >
          <Link href="/admin/profile" onClick={handleLinkClick}>
            <div className="relative">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={getAvatarUrl(user.avatar, "sm")} alt={user.name} />
                <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">
                {user.name}
                {isImpersonating && (
                  <span className="ml-space-xs text-warning">{t("viewingAs")}</span>
                )}
              </span>
              <span className="text-muted-foreground truncate text-xs">{user.email}</span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
