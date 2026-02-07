import { usersTable } from "@/schema/users.schema";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ========================================
// User Profile Response Schema
// ========================================

// Base schema from database table, picking only profile-relevant fields
const userProfileBaseSchema = createSelectSchema(usersTable).pick({
  id: true,
  email: true,
  name: true,
  image: true,
  phone: true,
  roleId: true,
  emailVerified: true,
  twoFactorEnabled: true,
  totpTwoFactorEnabled: true,
  emailTwoFactorEnabled: true,
  createdAt: true,
  updatedAt: true,
});

// Extended schema with computed/joined fields and JSON serialization
// Dates are serialized as strings when sent to the client
export const userProfileResponseSchema = userProfileBaseSchema
  .extend({
    // Joined from roles table
    roleName: z.string().nullable(),
    // Computed from accounts table
    hasGoogleLinked: z.boolean().optional(),
    // Auth capabilities for step-up authentication
    hasPassword: z.boolean().optional(),
    hasPasskeys: z.boolean().optional(),
    // Override date fields to string (JSON serialization)
    emailVerified: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

// ========================================
// Profile Update Response Schema
// ========================================

export const profileUpdateResponseSchema = z.object({
  success: z.object({ code: z.string() }),
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    phone: z.string().nullable(),
  }),
});

// ========================================
// Type Exports
// ========================================

/** Response type for GET /api/profile - user's full profile data */
export type UserProfileResponse = z.infer<typeof userProfileResponseSchema>;

/** Response type for PUT /api/profile - profile update result */
export type ProfileUpdateResponse = z.infer<typeof profileUpdateResponseSchema>;

// Re-export request types from validations for convenience
// Note: UpdatePreferencesRequest was removed - preferences are now device-bound (localStorage)
// See @/lib/preferences for the new preferences system
export type {
  UpdateProfileRequest,
  UpdatePasswordRequest,
  RequestEmailChangeRequest,
  VerifyEmailChangeRequest,
  VerifyEmailRequest,
} from "@/validations/profile.validations";
