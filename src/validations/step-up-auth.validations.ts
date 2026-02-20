import { z } from "zod";

// ========================================
// Step-Up Authentication Schemas
// ========================================

/**
 * Step-up authentication request (password method)
 */
export const stepUpPasswordSchema = z.object({
  method: z.literal("password"),
  password: z.string().min(1, "Password is required"),
});

/**
 * Step-up authentication request (passkey method)
 * Requires a verification token from /api/auth/passkey/authenticate/verify
 * that proves the passkey was actually authenticated server-side.
 */
export const stepUpPasskeySchema = z.object({
  method: z.literal("passkey"),
  /** Verification token from passkey authenticate/verify endpoint */
  passkeyVerificationToken: z.string().min(1, "Passkey verification token is required"),
});

/**
 * Step-up authentication request (TOTP method)
 */
export const stepUpTotpSchema = z.object({
  method: z.literal("totp"),
  code: z.string().length(6, "Code must be 6 digits"),
});

/**
 * Combined step-up authentication request schema
 * Note: Method policy validation is done in the route for better error codes
 */
export const stepUpAuthSchema = z.discriminatedUnion("method", [
  stepUpPasswordSchema,
  stepUpPasskeySchema,
  stepUpTotpSchema,
]);

// ========================================
// Type Exports
// ========================================

export type StepUpAuthRequest = z.infer<typeof stepUpAuthSchema>;
