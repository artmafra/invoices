import { z } from "zod";
import { basePaginationSchema, baseSearchSchema } from "./query.validations";

/**
 * Query schema for fetching profile sessions
 */
export const getProfileSessionsQuerySchema = z.object({
  sortBy: z.enum(["lastActivityAt", "createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
  search: z.string().optional(),
  deviceType: z.enum(["desktop", "mobile", "tablet"]).optional(),
});

/**
 * Query schema for fetching admin sessions (all users)
 */
export const getAdminSessionsQuerySchema = basePaginationSchema
  .extend(baseSearchSchema.shape)
  .extend({
    deviceType: z.enum(["desktop", "mobile", "tablet"]).optional(),
    userId: z.string().uuid().optional(),
  });

// Types
export type GetProfileSessionsQuery = z.infer<typeof getProfileSessionsQuerySchema>;
export type GetAdminSessionsQuery = z.infer<typeof getAdminSessionsQuerySchema>;
