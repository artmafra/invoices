/**
 * Cookie-Based Preferences Storage
 *
 * Provides cookie read/write operations for SSR-safe preferences.
 * Cookies are available both server-side and client-side.
 */

/** Cookie name prefix for preferences */
export const COOKIE_PREFIX = "pref.";

/** Cookie names for each preference */
export const COOKIE_NAMES = {
  language: `${COOKIE_PREFIX}language`,
  timezone: `${COOKIE_PREFIX}timezone`,
  paginationSize: `${COOKIE_PREFIX}paginationSize`,
  density: `${COOKIE_PREFIX}density`,
} as const;

/** Cookie max age: 1 year in seconds */
export const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

/**
 * Check if code is running in the browser
 */
export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Read a cookie value on the client side
 * Returns null on server or if cookie doesn't exist
 */
export function getCookie(name: string): string | null {
  if (!isBrowser()) return null;
  try {
    const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
    return match ? decodeURIComponent(match[2]) : null;
  } catch {
    return null;
  }
}

/**
 * Set a cookie value on the client side
 * No-op on server
 */
export function setCookie(name: string, value: string): void {
  if (!isBrowser()) return;
  try {
    const expires = new Date(Date.now() + COOKIE_MAX_AGE * 1000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; expires=${expires}; Secure; SameSite=Lax`;
  } catch {
    // Ignore cookie errors
  }
}

/**
 * Remove a cookie by setting it to expire in the past
 */
export function removeCookie(name: string): void {
  if (!isBrowser()) return;
  try {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=Lax`;
  } catch {
    // Ignore cookie errors
  }
}
