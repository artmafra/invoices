"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FilePenLine } from "lucide-react";
import { useTranslations } from "next-intl";
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
 * Top navigation component.
 * Renders the primary shortcut button at the top of the sidebar content.
 * Hidden when the user is already on the target page.
 */
export function NavTop(props: React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const isInvoicesActive = pathname?.startsWith("/admin/invoices");

  if (isInvoicesActive) return null;

  return (
    <>
      <SidebarGroup {...props}>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip={t("invoices")} asChild>
                <Link href="/admin/invoices" onClick={handleLinkClick}>
                  <FilePenLine />
                  <span>{t("invoices")}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarSeparator />
    </>
  );
}
