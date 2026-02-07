import { z } from "zod";

// ========================================
// Geolocation Result Schema
// ========================================

/**
 * Geolocation data returned from ip-api.com
 */
export const geolocationResultSchema = z.object({
  /** City name (e.g., "San Francisco") */
  city: z.string().nullable(),
  /** Country name (e.g., "United States") */
  country: z.string().nullable(),
  /** ISO 3166-1 alpha-2 country code (e.g., "US") */
  countryCode: z.string().nullable(),
  /** Region/state name (e.g., "California") */
  region: z.string().nullable(),
});

// ========================================
// Session Info Schema (for activity logs)
// ========================================

/**
 * Session context snapshot stored in activity logs.
 * Contains device, browser, OS, IP, and geolocation data.
 * This is a self-contained snapshot that doesn't depend on the session existing.
 */
export const sessionInfoSchema = z.object({
  /** Device type: desktop, mobile, tablet */
  deviceType: z.string().nullable(),
  /** Browser name (e.g., "Chrome", "Firefox") */
  browser: z.string().nullable(),
  /** Operating system (e.g., "Windows 10", "macOS") */
  os: z.string().nullable(),
  /** IP address (IPv4 or IPv6) */
  ipAddress: z.string().nullable(),
  /** City name */
  city: z.string().nullable(),
  /** Country name */
  country: z.string().nullable(),
  /** ISO country code */
  countryCode: z.string().nullable(),
  /** Region/state name */
  region: z.string().nullable(),
});

// ========================================
// Type Exports
// ========================================

/** Geolocation data from IP lookup */
export type GeolocationResult = z.infer<typeof geolocationResultSchema>;

/** Session context snapshot for activity logs */
export type SessionInfo = z.infer<typeof sessionInfoSchema>;
