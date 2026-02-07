import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate pagination items with smart ellipsis for large page counts.
 * Always shows first and last page, with ellipsis when needed.
 *
 * @param currentPage - Current active page (1-indexed)
 * @param totalPages - Total number of pages
 * @param siblingCount - Number of pages to show before/after current page (default: 1)
 * @returns Array of page numbers and "ellipsis" markers
 */
export function generatePaginationItems(
  currentPage: number,
  totalPages: number,
  siblingCount: number = 1,
): (number | "ellipsis")[] {
  const items: (number | "ellipsis")[] = [];

  // If total pages fit without ellipsis, show all
  // Formula: first + last + current + (siblingCount * 2) + (2 ellipsis max) = 5 + siblingCount * 2
  const maxWithoutEllipsis = 5 + siblingCount * 2;

  if (totalPages <= maxWithoutEllipsis) {
    for (let i = 1; i <= totalPages; i++) {
      items.push(i);
    }
    return items;
  }

  // Always show first page
  items.push(1);

  // Calculate range around current page
  const leftSibling = Math.max(2, currentPage - siblingCount);
  const rightSibling = Math.min(totalPages - 1, currentPage + siblingCount);

  // Show left ellipsis if there's a gap after first page
  const showLeftEllipsis = leftSibling > 2;
  // Show right ellipsis if there's a gap before last page
  const showRightEllipsis = rightSibling < totalPages - 1;

  if (showLeftEllipsis) {
    items.push("ellipsis");
  }

  // Add pages around current page
  for (let i = leftSibling; i <= rightSibling; i++) {
    items.push(i);
  }

  if (showRightEllipsis) {
    items.push("ellipsis");
  }

  // Always show last page
  items.push(totalPages);

  return items;
}

/**
 * Deep equality comparison for two values.
 * Handles primitives, arrays, objects, null, undefined, and Date.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  // Same reference or both primitives with same value
  if (a === b) return true;

  // Handle null/undefined
  if (a == null || b == null) return a === b;

  // Handle different types
  if (typeof a !== typeof b) return false;

  // Handle Date objects
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  // Handle objects
  if (typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);

    if (keysA.length !== keysB.length) return false;

    return keysA.every((key) =>
      deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
    );
  }

  return false;
}

/**
 * Convert a display name to a URL-friendly slug
 * e.g., "Forum Moderator" → "forum-moderator"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove non-word chars (except spaces and hyphens)
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}
