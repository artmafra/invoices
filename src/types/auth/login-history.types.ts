import { z } from "zod";

// ========================================
// Auth Method Enum
// ========================================

export const authMethodEnum = z.enum(["password", "google", "passkey"]);
export type AuthMethod = z.infer<typeof authMethodEnum>;

// ========================================
// Login History Response Schemas
// ========================================

/**
 * Single login history entry
 * Response type for GET /api/profile/login-history
 */
export const loginHistoryResponseSchema = z.object({
  id: z.string(),
  success: z.boolean(),
  authMethod: authMethodEnum.nullable(),
  failureReason: z.string().nullable(),
  ipAddress: z.string().nullable(),
  deviceType: z.string().nullable(),
  browser: z.string().nullable(),
  os: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  countryCode: z.string().nullable(),
  region: z.string().nullable(),
  createdAt: z.string(),
});

/**
 * Paginated login history response
 */
export const loginHistoryListResponseSchema = z.object({
  data: z.array(loginHistoryResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

/**
 * Recent login history response (non-paginated)
 */
export const recentLoginHistoryResponseSchema = z.object({
  data: z.array(loginHistoryResponseSchema),
});

// ========================================
// Type Exports
// ========================================

/** Single login history entry */
export type LoginHistoryResponse = z.infer<typeof loginHistoryResponseSchema>;

/** Paginated login history response */
export type LoginHistoryListResponse = z.infer<typeof loginHistoryListResponseSchema>;

/** Recent login history response */
export type RecentLoginHistoryResponse = z.infer<typeof recentLoginHistoryResponseSchema>;

// Re-export query types from validations
export type {
  GetLoginHistoryQuery,
  GetRecentLoginHistoryQuery,
} from "@/validations/login-history.validations";
