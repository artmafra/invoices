/**
 * Preferences Type Definitions
 *
 * Device-bound preferences stored in cookies.
 * These persist across logout and user switching (e.g., impersonation).
 */

import type { Locale } from "@/i18n/config";
import type { Density } from "@/config/ui.config";

/** Valid pagination size values */
export const PAGINATION_SIZE_OPTIONS = [20, 50, 100] as const;
export type PaginationSize = (typeof PAGINATION_SIZE_OPTIONS)[number];

/** All local preferences stored in cookies */
export interface LocalPreferences {
  /** Language/locale preference (e.g., "en-US", "pt-BR") */
  language: Locale;
  /** Timezone preference (e.g., "America/New_York") */
  timezone: string;
  /** Pagination size for admin lists */
  paginationSize: PaginationSize;
  /** Selected app slug (admin sidebar) */
  selectedApp: string | null;
  /** UI density preference (compact, comfortable, spacious) */
  density: Density;
}
