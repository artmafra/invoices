"use client";

/**
 * Preferences Hook
 *
 * SSR-safe preferences hook that accepts initial server-read values.
 * No provider needed - each component manages its own state.
 */
import { startTransition, useCallback, useEffect, useState } from "react";
import { defaultLocale, isValidLocale, LOCALE_COOKIE_NAME, type Locale } from "@/i18n/config";
import { DEFAULT_DENSITY, type Density } from "@/config/ui.config";
import { COOKIE_MAX_AGE, COOKIE_NAMES, getCookie, removeCookie, setCookie } from "./cookies";
import {
  DEFAULT_PAGINATION_SIZE,
  DEFAULT_TIMEZONE,
  detectLanguage,
  detectTimezone,
} from "./preferences.defaults";
import type { LocalPreferences, PaginationSize } from "./preferences.types";
import { PAGINATION_SIZE_OPTIONS } from "./preferences.types";

// ============================================================================
// Helper: Set next-intl locale cookie
// ============================================================================

function setLocaleCookie(locale: Locale): void {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + COOKIE_MAX_AGE * 1000).toUTCString();
  document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}; path=/; expires=${expires}; SameSite=Lax`;
}

function removeLocaleCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCALE_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

// ============================================================================
// Types
// ============================================================================

interface UsePreferencesOptions {
  /** Initial preferences read from cookies on server (for SSR) */
  initialPreferences?: LocalPreferences;
}

interface UsePreferencesReturn {
  /** Current preferences */
  prefs: LocalPreferences;
  /** Update a single preference (persists to cookie) */
  setPref: <K extends keyof LocalPreferences>(key: K, value: LocalPreferences[K]) => void;
  /** Reset all preferences to defaults (clears cookies) */
  reset: () => void;
  /** Browser-detected timezone */
  detectedTimezone: string;
  /** Browser-detected language */
  detectedLanguage: Locale;
}

// ============================================================================
// Default Values (used when no initial provided)
// ============================================================================

const DEFAULT_PREFS: LocalPreferences = {
  language: defaultLocale,
  timezone: DEFAULT_TIMEZONE,
  paginationSize: DEFAULT_PAGINATION_SIZE,
  selectedApp: null,
  density: DEFAULT_DENSITY,
};

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Preferences hook with SSR support.
 *
 * @param options.initialPreferences - Server-read preferences for SSR hydration match
 *
 * @example
 * // In a page component that receives server-read prefs:
 * const { prefs, setPref, reset, detectedTimezone } = usePreferences({
 *   initialPreferences: serverPrefs
 * });
 *
 * @example
 * // For components that don't need SSR (will flash on first render):
 * const { prefs, setPref } = usePreferences();
 */
export function usePreferences(options: UsePreferencesOptions = {}): UsePreferencesReturn {
  const { initialPreferences } = options;

  const [prefs, setPrefs] = useState<LocalPreferences>(initialPreferences ?? DEFAULT_PREFS);
  const [detectedTimezone, setDetectedTimezone] = useState(
    initialPreferences?.timezone ?? DEFAULT_TIMEZONE,
  );
  const [detectedLanguage, setDetectedLanguage] = useState<Locale>(
    initialPreferences?.language ?? defaultLocale,
  );

  // On mount: detect browser settings and read cookies if no initial provided
  useEffect(() => {
    const browserTimezone = detectTimezone();
    const browserLanguage = detectLanguage();
    startTransition(() => {
      setDetectedTimezone(browserTimezone);
      setDetectedLanguage(browserLanguage);
    });

    // If no initial preferences provided, read from cookies
    if (!initialPreferences) {
      const languageCookie = getCookie(COOKIE_NAMES.language);
      const timezoneCookie = getCookie(COOKIE_NAMES.timezone);
      const paginationCookie = getCookie(COOKIE_NAMES.paginationSize);
      const densityCookie = getCookie(COOKIE_NAMES.density);

      const language: Locale =
        languageCookie && isValidLocale(languageCookie) ? languageCookie : defaultLocale;

      const timezone = timezoneCookie || browserTimezone;

      const parsedPagination = paginationCookie ? parseInt(paginationCookie, 10) : NaN;
      const paginationSize: PaginationSize = PAGINATION_SIZE_OPTIONS.includes(
        parsedPagination as PaginationSize,
      )
        ? (parsedPagination as PaginationSize)
        : DEFAULT_PAGINATION_SIZE;

      const validDensities: Density[] = ["compact", "comfortable", "spacious"];
      const density: Density =
        densityCookie && validDensities.includes(densityCookie as Density)
          ? (densityCookie as Density)
          : DEFAULT_DENSITY;

      // selectedApp is managed by AppsProvider, just use null here
      const selectedApp = null;

      startTransition(() => {
        setPrefs({ language, timezone, paginationSize, selectedApp, density });
      });
    }

    // First-visit detection: set cookies if they don't exist
    if (!getCookie(COOKIE_NAMES.timezone)) {
      setCookie(COOKIE_NAMES.timezone, browserTimezone);
      startTransition(() => {
        setPrefs((prev) => ({ ...prev, timezone: browserTimezone }));
      });
    }

    if (!getCookie(COOKIE_NAMES.language)) {
      setCookie(COOKIE_NAMES.language, browserLanguage);
      setLocaleCookie(browserLanguage);
      startTransition(() => {
        setPrefs((prev) => ({ ...prev, language: browserLanguage }));
      });
    }
  }, [initialPreferences]);

  // Update a single preference
  const setPref = useCallback(
    <K extends keyof LocalPreferences>(key: K, value: LocalPreferences[K]) => {
      setPrefs((prev) => ({ ...prev, [key]: value }));

      switch (key) {
        case "language":
          setCookie(COOKIE_NAMES.language, value as string);
          setLocaleCookie(value as Locale);
          break;
        case "timezone":
          setCookie(COOKIE_NAMES.timezone, value as string);
          break;
        case "paginationSize":
          setCookie(COOKIE_NAMES.paginationSize, String(value));
          break;
        case "density": {
          const densityValue = value as Density;
          setCookie(COOKIE_NAMES.density, densityValue);
          // Apply to document root for CSS custom properties
          if (typeof document !== "undefined") {
            document.documentElement.setAttribute("data-density", densityValue);
          }
          break;
        }
      }
    },
    [],
  );

  // Reset all preferences to defaults
  const reset = useCallback(() => {
    removeCookie(COOKIE_NAMES.language);
    removeCookie(COOKIE_NAMES.timezone);
    removeCookie(COOKIE_NAMES.paginationSize);
    removeCookie(COOKIE_NAMES.density);
    removeLocaleCookie();

    const defaults: LocalPreferences = {
      language: detectedLanguage,
      timezone: detectedTimezone,
      paginationSize: DEFAULT_PAGINATION_SIZE,
      selectedApp: null,
      density: DEFAULT_DENSITY,
    };

    // Reset data-density attribute
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-density", DEFAULT_DENSITY);
    }

    setPrefs(defaults);
  }, [detectedLanguage, detectedTimezone]);

  return { prefs, setPref, reset, detectedTimezone, detectedLanguage };
}
