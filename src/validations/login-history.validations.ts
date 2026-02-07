import { z } from "zod";
import { baseQuerySchema } from "./query.validations";

/**
 * Query schema for fetching login history
 */
export const getLoginHistoryQuerySchema = baseQuerySchema.extend({
  success: z.coerce.boolean().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  authMethod: z.enum(["password", "google", "passkey"]).optional(),
});

/**
 * Query schema for fetching recent login history
 */
export const getRecentLoginHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

// Types
export type GetLoginHistoryQuery = z.infer<typeof getLoginHistoryQuerySchema>;
export type GetRecentLoginHistoryQuery = z.infer<typeof getRecentLoginHistoryQuerySchema>;
