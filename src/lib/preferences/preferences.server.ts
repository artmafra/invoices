import "server-only";
/**
 * Server-Side Preferences Reader
 *
 * Reads preference cookies on the server for SSR.
 * Use this in server components and layouts.
 */

import { cookies } from "next/headers";
import { defaultLocale, isValidLocale, type Locale } from "@/i18n/config";
import { DEFAULT_DENSITY, type Density } from "@/config/ui.config";
import { COOKIE_NAMES } from "./cookies";
import { DEFAULT_PAGINATION_SIZE, DEFAULT_TIMEZONE } from "./preferences.defaults";
import type { LocalPreferences, PaginationSize } from "./preferences.types";
import { PAGINATION_SIZE_OPTIONS } from "./preferences.types";

/**
 * Read all preferences from cookies on the server
 * Returns validated values with defaults for missing/invalid cookies
 */
export async function getPreferencesFromCookies(): Promise<LocalPreferences> {
  const cookieStore = await cookies();

  // Language: validate or use default
  const languageCookie = cookieStore.get(COOKIE_NAMES.language)?.value;
  const language: Locale =
    languageCookie && isValidLocale(languageCookie) ? languageCookie : defaultLocale;

  // Timezone: use stored or default
  const timezoneCookie = cookieStore.get(COOKIE_NAMES.timezone)?.value;
  const timezone = timezoneCookie || DEFAULT_TIMEZONE;

  // Pagination size: validate or use default
  const paginationCookie = cookieStore.get(COOKIE_NAMES.paginationSize)?.value;
  const parsedPagination = paginationCookie ? parseInt(paginationCookie, 10) : NaN;
  const paginationSize: PaginationSize = PAGINATION_SIZE_OPTIONS.includes(
    parsedPagination as PaginationSize,
  )
    ? (parsedPagination as PaginationSize)
    : DEFAULT_PAGINATION_SIZE;

  // Selected app: validate against registered app slugs
  const selectedAppCookie = cookieStore.get("app")?.value ?? null;
  // Import at runtime to avoid circular dependencies
  const { isValidAppSlug } = await import("@/config/apps.registry");
  const selectedApp =
    selectedAppCookie && isValidAppSlug(selectedAppCookie) ? selectedAppCookie : null;

  // Density: validate or use default
  const densityCookie = cookieStore.get(COOKIE_NAMES.density)?.value;
  const validDensities: Density[] = ["compact", "comfortable", "spacious"];
  const density: Density =
    densityCookie && validDensities.includes(densityCookie as Density)
      ? (densityCookie as Density)
      : DEFAULT_DENSITY;

  return { language, timezone, paginationSize, selectedApp, density };
}
