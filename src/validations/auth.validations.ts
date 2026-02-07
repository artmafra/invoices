import { z } from "zod";

// ========================================
// Login/Credential Schemas
// ========================================

export const verifyCredentialsSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const verify2faLoginSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  code: z.string().length(6, "Code must be 6 digits"),
});

// ========================================
// Password Reset Schemas
// ========================================

export const forgotPasswordSchema = z.object({
  email: z.email("Please enter a valid email address"),
});

export const validateResetTokenSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// ========================================
// Type Exports
// ========================================

export type Verify2faLoginRequest = z.infer<typeof verify2faLoginSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;
export type ValidateResetTokenRequest = z.infer<typeof validateResetTokenSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;
