import type { AdminUserResponse } from "@/types/users/users.types";

/**
 * Gets the display name for a user, falling back to a placeholder if no name is set.
 */
export function getDisplayName(user: AdminUserResponse, noNamePlaceholder: string): string {
  return user.name || noNamePlaceholder;
}

/**
 * Gets the initials for a user's avatar from their display name.
 * Returns up to 2 characters (first letter of first and last name).
 */
export function getInitials(user: AdminUserResponse, noNamePlaceholder: string): string {
  const name = getDisplayName(user, noNamePlaceholder);
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
