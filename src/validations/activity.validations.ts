import { z } from "zod";
import { baseQuerySchema } from "./query.validations";

// Query schema for fetching activities
export const getActivityQuerySchema = baseQuerySchema.extend({
  userId: z.uuid().optional(),
  action: z.string().max(100).optional(),
  resource: z.string().max(100).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// Schema for verifying activity chain integrity
export const verifyActivitySchema = z.object({
  mode: z.enum(["quick", "full"]),
  limit: z.coerce.number().int().min(1).optional(),
});

// Types
export type GetActivityQuery = z.infer<typeof getActivityQuerySchema>;
export type VerifyActivityRequest = z.infer<typeof verifyActivitySchema>;
