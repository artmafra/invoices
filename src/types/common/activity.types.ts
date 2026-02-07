import { z } from "zod";
import { sessionInfoSchema } from "@/types/common/geolocation.types";
import type { ActivityScope, ActivityTargetType } from "@/types/permissions/permissions";

// ========================================
// Activity Change Schema
// ========================================

/**
 * Individual field change for activity logging
 */
export const activityChangeSchema = z.object({
  /** Field name that changed */
  field: z.string(),
  /** Previous value */
  from: z.unknown().optional(),
  /** New value */
  to: z.unknown().optional(),
  /** Items added (for array fields like permissions) */
  added: z.array(z.string()).optional(),
  /** Items removed (for array fields like permissions) */
  removed: z.array(z.string()).optional(),
});

// ========================================
// Activity Target Schema
// ========================================

/**
 * Target entity affected by the activity
 */
export const activityTargetSchema = z.object({
  /** Entity type (e.g., "user", "role", "note", "session") */
  type: z.custom<ActivityTargetType | (string & {})>(),
  /** Entity ID */
  id: z.string().optional(),
  /** Display name for the entity */
  name: z.string().optional(),
});

// ========================================
// Activity Details Schema
// ========================================

/**
 * Activity details stored in JSON column
 */
export const activityDetailsSchema = z.object({
  /** Origin scope: system features or app modules */
  scope: z.custom<ActivityScope>(),
  /** Module ID if scope is "app" (e.g., "notes", "tasks") */
  appId: z.string().optional(),
  /** Target entity affected by this action */
  target: activityTargetSchema,
  /** Related entities affected by this action (e.g., session owner, invitation recipient) */
  relatedTargets: z.array(activityTargetSchema).optional(),
  /** Impersonation context (real actor vs effective user) */
  impersonation: z
    .object({
      /** The real actor performing the action (e.g., admin) */
      actor: z.object({
        id: z.string(),
        name: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
      }),
      /** The effective user identity used for authorization */
      effective: z.object({
        id: z.string(),
        name: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
      }),
    })
    .optional(),
  /** Structured changes array for field-level tracking */
  changes: z.array(activityChangeSchema).optional(),
  /** Additional context metadata (browser info, method, etc.) */
  metadata: z.record(z.string(), z.unknown()).optional(),
  /** Error message for failed actions */
  error: z.string().optional(),
  /** Identifier for login attempts (email/username) */
  identifier: z.string().optional(),
  /** Reason for failure */
  reason: z.string().optional(),
});

// ========================================
// Activity Entry Schema
// ========================================

/**
 * Activity entry with user details (response from API)
 */
export const activityEntrySchema = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  action: z.string(),
  resource: z.string(),
  resourceId: z.string().nullable(),
  details: activityDetailsSchema.nullable(),
  sessionInfo: sessionInfoSchema.nullable(),
  createdAt: z.string(),
  userName: z.string().nullable(),
  userEmail: z.string().nullable(),
  userImage: z.string().nullable(),
});

// ========================================
// Activity Filters Schema
// ========================================

/**
 * Activity filter options for API queries
 */
export const activityFiltersSchema = z.object({
  page: z.number().optional(),
  limit: z.number().optional(),
  userId: z.string().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
});

// ========================================
// Type Exports
// ========================================

/** Individual field change for activity */
export type ActivityChange = z.infer<typeof activityChangeSchema>;

/** Target entity affected by the activity */
export type ActivityTarget = z.infer<typeof activityTargetSchema>;

/** Activity details stored in JSON column */
export type ActivityDetails = z.infer<typeof activityDetailsSchema>;

/** Activity entry with user details */
export type ActivityEntry = z.infer<typeof activityEntrySchema>;

/** Activity filter options for API */
export type ActivityFilters = z.infer<typeof activityFiltersSchema>;
