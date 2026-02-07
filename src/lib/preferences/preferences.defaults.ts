/**
 * Preferences Default Values and Detection
 *
 * Provides default values and browser-based detection for preferences.
 */

import { defaultLocale, isValidLocale, locales, type Locale } from "@/i18n/config";
import { DEFAULT_DENSITY } from "@/config/ui.config";
import { isBrowser } from "./cookies";
import type { LocalPreferences, PaginationSize } from "./preferences.types";

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_PAGINATION_SIZE: PaginationSize = 20;
export const DEFAULT_TIMEZONE = "UTC";
export { DEFAULT_DENSITY };

// ============================================================================
// Browser Detection
// ============================================================================

/**
 * Detect timezone from browser
 * Falls back to UTC on server or if detection fails
 */
export function detectTimezone(): string {
  if (!isBrowser()) return DEFAULT_TIMEZONE;
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return detected || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/**
 * Detect preferred language from browser
 * Matches against supported locales, falls back to default locale
 */
export function detectLanguage(): Locale {
  if (!isBrowser()) return defaultLocale;

  try {
    // Try navigator.languages first (array of preferred languages)
    const browserLanguages = navigator.languages ?? [navigator.language];

    for (const lang of browserLanguages) {
      // Exact match (e.g., "en-US" matches "en-US")
      if (isValidLocale(lang)) {
        return lang;
      }

      // Partial match (e.g., "en" matches "en-US", "pt" matches "pt-BR")
      const langPrefix = lang.split("-")[0].toLowerCase();
      const match = locales.find((locale) => locale.toLowerCase().startsWith(langPrefix));
      if (match) {
        return match;
      }
    }
  } catch {
    // Ignore detection errors
  }

  return defaultLocale;
}

// ============================================================================
// Default Preferences Object
// ============================================================================

/**
 * Get default preferences with browser detection applied
 * Safe to call on server (returns static defaults)
 */
export function getDefaultPreferences(): LocalPreferences {
  return {
    language: detectLanguage(),
    timezone: detectTimezone(),
    paginationSize: DEFAULT_PAGINATION_SIZE,
    selectedApp: null,
    density: DEFAULT_DENSITY,
  };
}

/**
 * Static defaults for SSR (no browser detection)
 * Used for initial render to avoid hydration mismatch
 */
export const SSR_DEFAULTS: LocalPreferences = {
  language: defaultLocale,
  timezone: DEFAULT_TIMEZONE,
  paginationSize: DEFAULT_PAGINATION_SIZE,
  selectedApp: null,
  density: DEFAULT_DENSITY,
};
