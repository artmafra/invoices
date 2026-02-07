/**
 * Preferences Module
 *
 * Cookie-based, SSR-safe preferences system.
 * Preferences are device-bound (persist across logout and user switching).
 */

// Types
export type { LocalPreferences, PaginationSize } from "./preferences.types";
export { PAGINATION_SIZE_OPTIONS } from "./preferences.types";

// Defaults
export {
  DEFAULT_PAGINATION_SIZE,
  DEFAULT_TIMEZONE,
  detectLanguage,
  detectTimezone,
} from "./preferences.defaults";

// Cookie utilities
export {
  COOKIE_MAX_AGE,
  COOKIE_NAMES,
  COOKIE_PREFIX,
  getCookie,
  isBrowser,
  removeCookie,
  setCookie,
} from "./cookies";

// Hooks
export { usePreferences } from "./use-preferences";

// Language server sync
export { updateLanguageOnServer } from "./language.client";

// Server-side utilities (re-exported for convenience, but import directly in server components)
// Note: getPreferencesFromCookies is in preferences.server.ts with "server-only"
