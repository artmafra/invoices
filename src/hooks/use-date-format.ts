"use client";

import { useCallback, useMemo } from "react";
import { useLocale, useTimeZone } from "next-intl";

/**
 * Options for date formatting, extending Intl.DateTimeFormatOptions
 */
export type DateFormatOptions = Intl.DateTimeFormatOptions;

/**
 * Preset format options for common use cases
 */
export const DATE_PRESETS = {
  /** Dec 20, 2025 */
  shortDate: { dateStyle: "medium" } as const,
  /** December 20, 2025 */
  longDate: { dateStyle: "long" } as const,
  /** 12/20/2025 */
  numericDate: { dateStyle: "short" } as const,
  /** Dec 20 */
  monthDay: { month: "short", day: "numeric" } as const,
  /** 3:45 PM */
  shortTime: { timeStyle: "short" } as const,
  /** Dec 20, 2025, 3:45 PM */
  shortDateTime: { dateStyle: "medium", timeStyle: "short" } as const,
  /** December 20, 2025 at 3:45:30 PM */
  longDateTime: { dateStyle: "long", timeStyle: "medium" } as const,
  /** 12/20/2025, 3:45 PM */
  numericDateTime: { dateStyle: "short", timeStyle: "short" } as const,
} satisfies Record<string, DateFormatOptions>;

/**
 * Hook for locale-aware date and time formatting.
 *
 * Uses the user's locale preference from next-intl (configured via session preferences).
 * Timezone is automatically applied from next-intl's provider configuration.
 *
 * @example
 * ```tsx
 * const { formatDate, formatDateTime, formatRelativeTime } = useDateFormat();
 *
 * // Using presets
 * formatDate(date); // "Dec 20, 2025" (shortDate preset)
 * formatDateTime(date); // "Dec 20, 2025, 3:45 PM" (shortDateTime preset)
 *
 * // Using custom options
 * formatDate(date, { dateStyle: "full" }); // "Saturday, December 20, 2025"
 * formatDateTime(date, { dateStyle: "short", timeStyle: "long" });
 *
 * // Relative time (uses Intl.RelativeTimeFormat for auto-localization)
 * formatRelativeTime(date); // "5 minutes ago", "há 5 minutos" (pt-BR), etc.
 * ```
 */
export function useDateFormat() {
  const locale = useLocale();
  const timeZone = useTimeZone();

  /**
   * Format a date using Intl.DateTimeFormat
   * @param date - Date to format (Date object, ISO string, or timestamp)
   * @param options - Intl.DateTimeFormatOptions or undefined for default (shortDate)
   */
  const formatDate = useCallback(
    (date: Date | string | number, options?: DateFormatOptions): string => {
      const dateObj = date instanceof Date ? date : new Date(date);
      const opts = { ...(options ?? DATE_PRESETS.shortDate), timeZone };
      return new Intl.DateTimeFormat(locale, opts).format(dateObj);
    },
    [locale, timeZone],
  );

  /**
   * Format a date with time using Intl.DateTimeFormat
   * @param date - Date to format (Date object, ISO string, or timestamp)
   * @param options - Intl.DateTimeFormatOptions or undefined for default (shortDateTime)
   */
  const formatDateTime = useCallback(
    (date: Date | string | number, options?: DateFormatOptions): string => {
      const dateObj = date instanceof Date ? date : new Date(date);
      const opts = { ...(options ?? DATE_PRESETS.shortDateTime), timeZone };
      return new Intl.DateTimeFormat(locale, opts).format(dateObj);
    },
    [locale, timeZone],
  );

  /**
   * Format a date as relative time (e.g., "5 minutes ago", "in 3 days")
   * Uses Intl.RelativeTimeFormat for automatic localization.
   *
   * @param date - Date to format (Date object, ISO string, or timestamp)
   * @param baseDate - Reference date for comparison (defaults to now)
   */
  const formatRelativeTime = useCallback(
    (date: Date | string | number, baseDate: Date = new Date()): string => {
      const dateObj = date instanceof Date ? date : new Date(date);
      const diffMs = dateObj.getTime() - baseDate.getTime();
      const absDiffMs = Math.abs(diffMs);

      // Determine the appropriate unit and value
      const seconds = Math.floor(absDiffMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      const weeks = Math.floor(days / 7);
      const months = Math.floor(days / 30);
      const years = Math.floor(days / 365);

      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

      // Use negative for past, positive for future
      const sign = diffMs < 0 ? -1 : 1;

      if (seconds < 60) {
        return rtf.format(sign * seconds, "second");
      } else if (minutes < 60) {
        return rtf.format(sign * minutes, "minute");
      } else if (hours < 24) {
        return rtf.format(sign * hours, "hour");
      } else if (days < 7) {
        return rtf.format(sign * days, "day");
      } else if (weeks < 4) {
        return rtf.format(sign * weeks, "week");
      } else if (months < 12) {
        return rtf.format(sign * months, "month");
      } else {
        return rtf.format(sign * years, "year");
      }
    },
    [locale],
  );

  /**
   * Format remaining time until a future date (e.g., "in 3 days", "expires tomorrow")
   * Returns a past format if the date has already passed.
   *
   * @param date - Future date to format
   */
  const formatTimeUntil = useCallback(
    (date: Date | string | number): string => {
      return formatRelativeTime(date);
    },
    [formatRelativeTime],
  );

  return useMemo(
    () => ({
      locale,
      timeZone,
      formatDate,
      formatDateTime,
      formatRelativeTime,
      formatTimeUntil,
      presets: DATE_PRESETS,
    }),
    [locale, timeZone, formatDate, formatDateTime, formatRelativeTime, formatTimeUntil],
  );
}
