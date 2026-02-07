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
 * Combined step-up authentication request schema
 */
export const stepUpAuthSchema = z.discriminatedUnion("method", [
  stepUpPasswordSchema,
  stepUpPasskeySchema,
]);

// ========================================
// Type Exports
// ========================================

export type StepUpAuthRequest = z.infer<typeof stepUpAuthSchema>;
