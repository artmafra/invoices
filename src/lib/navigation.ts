import { type LucideIcon } from "lucide-react";

export interface NavItemPermission {
  resource: string;
  action: string;
}

export interface NavSubItem {
  title: string;
  url: string;
  permission?: NavItemPermission;
}

export interface NavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  permission?: NavItemPermission;
  items?: NavSubItem[];
}

/**
 * Determines if a navigation item should be considered active based on the current pathname.
 * Uses most-specific-match logic to prevent parent items from being highlighted
 * when a more specific child item matches.
 */
export function isNavItemActive(url: string, pathname: string, allNavItems: NavItem[]): boolean {
  // For exact matches, always return true
  if (pathname === url) return true;

  // For prefix matches, only return true if no other item has a longer matching prefix
  if (pathname.startsWith(url) && url !== "/admin") {
    // Get all URLs from all nav items (both top-level and sub-items)
    const allUrls = allNavItems.flatMap((item) => [
      item.url,
      ...(item.items?.map((sub) => sub.url) || []),
    ]);

    // Check if there's a longer matching URL
    const longerMatch = allUrls.find(
      (itemUrl) => itemUrl !== url && pathname.startsWith(itemUrl) && itemUrl.length > url.length,
    );

    return !longerMatch;
  }

  return false;
}

/**
 * Determines if a main navigation item (without sub-items) should be active
 */
export function isMainNavItemActive(
  item: NavItem,
  pathname: string,
  allNavItems: NavItem[],
): boolean {
  if (item.items?.length) return false;
  return isNavItemActive(item.url, pathname, allNavItems);
}

/**
 * Determines which navigation items should be expanded based on the current pathname
 */
export function getExpandedItems(pathname: string, items: NavItem[]): string[] {
  const shouldItemBeExpanded = (item: NavItem) => {
    if (!item.items) return false;
    return item.items.some((subItem) => pathname.startsWith(subItem.url));
  };

  return items.filter((item) => shouldItemBeExpanded(item)).map((item) => item.title);
}
