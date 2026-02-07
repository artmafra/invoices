import { z } from "zod";

// ========================================
// Device Type Enum
// ========================================

export const deviceTypeEnum = z.enum(["desktop", "mobile", "tablet"]);

// ========================================
// Session Filters Schema
// ========================================

/**
 * Filter options for admin session queries
 */
export const sessionFiltersSchema = z.object({
  search: z.string().optional(),
  deviceType: deviceTypeEnum.optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

// ========================================
// Session Response Schemas
// ========================================

/**
 * User session information returned from admin API
 * Response type for GET /api/admin/sessions
 */
export const userSessionResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string().nullable(),
  userEmail: z.string(),
  deviceType: z.string().nullable(),
  browser: z.string().nullable(),
  os: z.string().nullable(),
  ipAddress: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  countryCode: z.string().nullable(),
  region: z.string().nullable(),
  createdAt: z.string(),
  lastActivityAt: z.string(),
  expiresAt: z.string(),
});

/**
 * Response type for GET /api/admin/sessions
 */
export const sessionsListResponseSchema = z.object({
  sessions: z.array(userSessionResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

/**
 * Response type for session revocation
 * Response type for DELETE /api/admin/sessions (revokeAll)
 */
export const revokeAllSessionsResponseSchema = z.object({
  success: z.object({ code: z.string() }),
  revokedCount: z.number(),
});

/**
 * Response type for single session revocation
 * Response type for DELETE /api/admin/sessions (single)
 */
export const revokeSessionResponseSchema = z.object({
  success: z.object({ code: z.string() }),
});

// ========================================
// Type Exports
// ========================================

/** Device type enum */
export type DeviceType = z.infer<typeof deviceTypeEnum>;

/** Filter options for admin session queries */
export type SessionFilters = z.infer<typeof sessionFiltersSchema>;

/** User session information from admin API */
export type UserSessionResponse = z.infer<typeof userSessionResponseSchema>;

/** List of sessions response */
export type SessionsListResponse = z.infer<typeof sessionsListResponseSchema>;

/** Response from revoking all sessions */
export type RevokeAllSessionsResponse = z.infer<typeof revokeAllSessionsResponseSchema>;

/** Response from revoking a single session */
export type RevokeSessionResponse = z.infer<typeof revokeSessionResponseSchema>;

// ========================================
// Profile Session Types (User's own sessions)
// ========================================

/**
 * User's own session information (simpler than admin view, no user info needed)
 * Response type for GET /api/profile/sessions
 */
export const profileSessionResponseSchema = z.object({
  id: z.string(),
  deviceType: z.string().nullable(),
  browser: z.string().nullable(),
  os: z.string().nullable(),
  ipAddress: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  countryCode: z.string().nullable(),
  region: z.string().nullable(),
  createdAt: z.string(),
  lastActivityAt: z.string(),
  expiresAt: z.string(),
});

/**
 * Response type for GET /api/profile/sessions
 */
export const profileSessionsListResponseSchema = z.object({
  sessions: z.array(profileSessionResponseSchema),
});

/** User's own session information */
export type ProfileSessionResponse = z.infer<typeof profileSessionResponseSchema>;

/** List of user's own sessions */
export type ProfileSessionsListResponse = z.infer<typeof profileSessionsListResponseSchema>;
