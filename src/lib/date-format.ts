/**
 * Server-side date formatting utilities.
 *
 * These functions are for use in API routes, services, and email templates
 * where the React `useDateFormat` hook is not available.
 *
 * For client-side date formatting, use the `useDateFormat` hook instead.
 */

export type DateFormatOptions = Intl.DateTimeFormatOptions;

/**
 * Preset format options for common use cases (mirrors client-side presets)
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
  /** Full format with timezone name for emails */
  emailDateTime: {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  } as const,
} satisfies Record<string, DateFormatOptions>;

/**
 * Format a date on the server side.
 *
 * @param date - Date to format (Date object, ISO string, or timestamp)
 * @param locale - Locale string (e.g., "en-US", "pt-BR")
 * @param timeZone - IANA timezone (e.g., "UTC", "America/Sao_Paulo")
 * @param options - Intl.DateTimeFormatOptions or undefined for default (shortDate)
 *
 * @example
 * ```ts
 * // In a service or API route
 * const formatted = formatDateServer(new Date(), "en-US", "America/Sao_Paulo");
 * // => "Dec 20, 2025"
 *
 * const withTime = formatDateTimeServer(new Date(), "pt-BR", "America/Sao_Paulo");
 * // => "20 de dez. de 2025, 15:45"
 * ```
 */
export function formatDateServer(
  date: Date | string | number,
  locale: string = "en-US",
  timeZone: string = "UTC",
  options?: DateFormatOptions,
): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  const opts = { ...DATE_PRESETS.shortDate, ...options, timeZone };
  return new Intl.DateTimeFormat(locale, opts).format(dateObj);
}

/**
 * Format a date with time on the server side.
 *
 * @param date - Date to format (Date object, ISO string, or timestamp)
 * @param locale - Locale string (e.g., "en-US", "pt-BR")
 * @param timeZone - IANA timezone (e.g., "UTC", "America/Sao_Paulo")
 * @param options - Intl.DateTimeFormatOptions or undefined for default (shortDateTime)
 */
export function formatDateTimeServer(
  date: Date | string | number,
  locale: string = "en-US",
  timeZone: string = "UTC",
  options?: DateFormatOptions,
): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  const opts = { ...DATE_PRESETS.shortDateTime, ...options, timeZone };
  return new Intl.DateTimeFormat(locale, opts).format(dateObj);
}

/**
 * Format a date for email templates with full context.
 * Always uses UTC with timezone name to avoid ambiguity in emails.
 *
 * @param date - Date to format (Date object, ISO string, or timestamp)
 * @param locale - Locale string (e.g., "en-US", "pt-BR")
 *
 * @example
 * ```ts
 * formatEmailDateTime(new Date(), "en-US");
 * // => "Friday, December 20, 2025 at 03:45 PM UTC"
 * ```
 */
export function formatEmailDateTime(
  date: Date | string | number,
  locale: string = "en-US",
): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(locale, {
    ...DATE_PRESETS.emailDateTime,
    timeZone: "UTC",
  }).format(dateObj);
}
