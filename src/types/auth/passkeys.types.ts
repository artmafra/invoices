import { z } from "zod";

// ========================================
// Passkey Response Schemas
// ========================================

/**
 * Passkey information returned from API endpoints
 * Response type for GET /api/profile/passkeys
 */
export const passkeyResponseSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  deviceType: z.string().nullable(),
  backedUp: z.boolean(),
  createdAt: z.string(),
  lastUsedAt: z.string().nullable(),
});

/**
 * Response type for GET /api/profile/passkeys
 */
export const passkeysListResponseSchema = z.object({
  passkeys: z.array(passkeyResponseSchema),
});

/**
 * Response type for passkey authentication verification
 * Response type for POST /api/auth/passkey/authenticate/verify
 *
 * Returns a verification token that proves the passkey was actually
 * verified server-side - required for NextAuth sign-in.
 */
export const passkeyAuthenticateResponseSchema = z.object({
  userId: z.string(),
  /** Verification token required for NextAuth sign-in (or step-up auth) */
  passkeyVerificationToken: z.string(),
});

/**
 * Response type for passkey registration verification
 * Response type for POST /api/profile/passkeys/register/verify
 */
export const registerPasskeyResponseSchema = z.object({
  passkey: passkeyResponseSchema,
});

// ========================================
// Type Exports
// ========================================

/** Passkey information returned from API */
export type PasskeyResponse = z.infer<typeof passkeyResponseSchema>;

/** List of passkeys response */
export type PasskeysListResponse = z.infer<typeof passkeysListResponseSchema>;

/** Response from passkey authentication */
export type PasskeyAuthenticateResponse = z.infer<typeof passkeyAuthenticateResponseSchema>;

/** Response from passkey registration */
export type RegisterPasskeyResponse = z.infer<typeof registerPasskeyResponseSchema>;

// Re-export request types from validations for convenience
export type {
  RenamePasskeyRequest,
  VerifyPasskeyRegistrationRequest as RegisterPasskeyRequest,
} from "@/validations/passkey.validations";
