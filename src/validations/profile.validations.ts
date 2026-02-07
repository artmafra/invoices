import { z } from "zod";

// ========================================
// Email Param Schemas
// ========================================

export const emailIdParamSchema = z.object({
  id: z.uuid("Invalid email ID format"),
});

export type EmailIdParam = z.infer<typeof emailIdParamSchema>;

// ========================================
// Profile Update Schemas
// ========================================

export const updateProfileSchema = z.object({
  name: z.string().max(255).optional(),
  phone: z.string().max(20).optional(),
});

// ========================================
// User Preferences
// ========================================

/**
 * User preferences (theme, language, timezone, pagination) are device-bound
 * and stored in localStorage/cookies, NOT in the database.
 *
 * See @/lib/preferences for the implementation.
 * No server-side validation schema is needed as preferences are client-only.
 */

export const updatePasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters long"),
});

// ========================================
// Email Change Schemas (Primary Email)
// ========================================

export const requestEmailChangeSchema = z.object({
  newEmail: z.email("Invalid email address"),
});

export const verifyEmailChangeSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
});

// ========================================
// Email Verification Schemas
// ========================================

export const verifyEmailSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
});

// ========================================
// User Emails Management Schemas
// ========================================

export const addUserEmailSchema = z.object({
  email: z.email("Invalid email address"),
});

export const verifyUserEmailSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
});

// ========================================
// Google Link Schemas
// ========================================

export const linkGoogleAccountSchema = z.object({
  googleId: z.string().min(1, "Google account ID is required"),
  email: z.email("Invalid email address").optional(),
  name: z.string().optional(),
  picture: z.string().url("Invalid picture URL").optional(),
  accessToken: z.string().optional(),
});

// ========================================
// Type Exports
// ========================================

export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>;
export type UpdatePasswordRequest = z.infer<typeof updatePasswordSchema>;
export type RequestEmailChangeRequest = z.infer<typeof requestEmailChangeSchema>;
export type VerifyEmailChangeRequest = z.infer<typeof verifyEmailChangeSchema>;
export type VerifyEmailRequest = z.infer<typeof verifyEmailSchema>;
export type AddUserEmailRequest = z.infer<typeof addUserEmailSchema>;
export type VerifyUserEmailRequest = z.infer<typeof verifyUserEmailSchema>;
export type LinkGoogleAccountRequest = z.infer<typeof linkGoogleAccountSchema>;
