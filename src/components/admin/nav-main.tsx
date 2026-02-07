"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import {
  getExpandedItems,
  isMainNavItemActive,
  isNavItemActive,
  type NavItem,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  // Close mobile sidebar when navigating
  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Derive initially expanded items from current pathname
  const initialOpenItems = useMemo(() => getExpandedItems(pathname, items), [pathname, items]);

  // Track user-toggled state separately
  const [toggledState, setToggledState] = useState<Record<string, boolean>>({});

  // Combine initial state with user toggles
  const openItems = useMemo(() => {
    const items = new Set(initialOpenItems);
    for (const [title, isOpen] of Object.entries(toggledState)) {
      if (isOpen) {
        items.add(title);
      } else {
        items.delete(title);
      }
    }
    return Array.from(items);
  }, [initialOpenItems, toggledState]);

  const toggleItem = (title: string) => {
    setToggledState((prev) => ({
      ...prev,
      [title]: !openItems.includes(title),
    }));
  };

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-space-sm">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              {item.items?.length ? (
                <Collapsible
                  open={openItems.includes(item.title)}
                  onOpenChange={() => toggleItem(item.title)}
                >
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title} className="w-full">
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight
                        className={cn(
                          "ml-auto size-4 transition-transform",
                          openItems.includes(item.title) && "rotate-90",
                        )}
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isNavItemActive(subItem.url, pathname, items)}
                          >
                            <Link href={subItem.url} onClick={handleLinkClick}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
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
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
