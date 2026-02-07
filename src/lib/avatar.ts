import type { PROFILE_PICTURE_SIZES } from "@/services/cloud-storage.service";

export type AvatarSize = keyof typeof PROFILE_PICTURE_SIZES | "original";

/**
 * Get the URL for a specific size variant of an avatar image.
 *
 * Profile pictures are stored with size suffixes:
 * - Original: /api/storage/images/profile-pictures/{uuid}.webp
 * - Small (64px): /api/storage/images/profile-pictures/{uuid}_sm.webp
 * - Medium (128px): /api/storage/images/profile-pictures/{uuid}_md.webp
 * - Large (256px): /api/storage/images/profile-pictures/{uuid}_lg.webp
 *
 * Recommended sizes by context:
 * - "sm" (64px): Navigation avatars, small thumbnails
 * - "md" (128px): User cards, lists, dropdown menus
 * - "lg" (256px): Profile pages, large displays
 * - "original" (300px): Full quality for zoom/download
 *
 * @param url - The base avatar URL (can be any size variant or external URL)
 * @param size - The desired size: "sm", "md", "lg", or "original"
 * @returns The URL for the requested size, or original URL if not a profile picture
 */
export function getAvatarUrl(
  url: string | null | undefined,
  size: AvatarSize = "md",
): string | undefined {
  if (!url) return undefined;

  // Only transform URLs that are profile pictures from our storage
  if (!url.includes("/api/storage/images/profile-pictures/")) {
    return url;
  }

  // Extract the base URL (without size suffix) and query params
  const [urlWithoutQuery, queryString] = url.split("?");

  // Remove any existing size suffix (_sm, _md, _lg) from the filename
  const baseUrl = urlWithoutQuery.replace(/_(sm|md|lg)(\.webp)$/, "$2");

  // For original size, just return the base URL
  if (size === "original") {
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  // Insert the size suffix before the extension
  const sizedUrl = baseUrl.replace(/\.webp$/, `_${size}.webp`);

  return queryString ? `${sizedUrl}?${queryString}` : sizedUrl;
}

/**
 * Pixel dimensions for each avatar size.
 * Use this for setting explicit width/height on Image components.
 */
export const AVATAR_DIMENSIONS = {
  sm: 64,
  md: 128,
  lg: 256,
  original: 300,
} as const;
