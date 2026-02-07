/**
 * Internationalization Configuration
 *
 * Defines supported locales and default locale for the application.
 * Uses cookie-based locale detection (no URL prefix).
 */

/** Supported locale codes */
export const locales = ["en-US", "pt-BR"] as const;

/** Type for supported locales */
export type Locale = (typeof locales)[number];

/** Default locale (fallback) */
export const defaultLocale: Locale = "en-US";

/** Cookie name for storing locale preference */
export const LOCALE_COOKIE_NAME = "locale";

/** Locale display names for UI */
export const localeNames: Record<Locale, string> = {
  "en-US": "English (United States)",
  "pt-BR": "Português (Brasil)",
};

/**
 * Check if a string is a valid locale
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}
