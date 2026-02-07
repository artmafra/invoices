import { z } from "zod";

// ========================================
// Passkey Param Schemas
// ========================================

export const passkeyIdParamSchema = z.object({
  id: z.uuid("Invalid passkey ID format"),
});

export type PasskeyIdParam = z.infer<typeof passkeyIdParamSchema>;

// ========================================
// Passkey Registration Schemas
// ========================================

export const passkeyRegistrationResponseSchema = z.object({
  id: z.string(),
  rawId: z.string(),
  response: z.object({
    clientDataJSON: z.string(),
    attestationObject: z.string(),
    authenticatorData: z.string().optional(),
    transports: z.array(z.string()).optional(),
    publicKeyAlgorithm: z.number().optional(),
    publicKey: z.string().optional(),
  }),
  authenticatorAttachment: z.enum(["platform", "cross-platform"]).optional(),
  clientExtensionResults: z.record(z.string(), z.unknown()),
  type: z.literal("public-key"),
});

export const verifyPasskeyRegistrationSchema = z.object({
  response: passkeyRegistrationResponseSchema,
  deviceName: z.string().max(255).optional(),
});

// ========================================
// Passkey Authentication Schemas
// ========================================

export const passkeyAuthenticationResponseSchema = z.object({
  id: z.string(),
  rawId: z.string(),
  response: z.object({
    clientDataJSON: z.string(),
    authenticatorData: z.string(),
    signature: z.string(),
    userHandle: z.string().optional(),
  }),
  authenticatorAttachment: z.enum(["platform", "cross-platform"]).optional(),
  clientExtensionResults: z.record(z.string(), z.unknown()),
  type: z.literal("public-key"),
});

export const generateAuthenticationOptionsSchema = z.object({
  email: z.email().optional(),
});

export const verifyPasskeyAuthenticationSchema = z.object({
  response: passkeyAuthenticationResponseSchema,
  /** Purpose of the authentication - determines if a verification token is generated */
  purpose: z.enum(["login", "step-up"]).optional().default("login"),
});

// ========================================
// Passkey Management Schemas
// ========================================

export const renamePasskeySchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name is too long"),
});

// ========================================
// Type Exports
// ========================================

export type PasskeyRegistrationResponse = z.infer<typeof passkeyRegistrationResponseSchema>;
export type VerifyPasskeyRegistrationRequest = z.infer<typeof verifyPasskeyRegistrationSchema>;
export type PasskeyAuthenticationResponse = z.infer<typeof passkeyAuthenticationResponseSchema>;
export type GenerateAuthenticationOptionsRequest = z.infer<
  typeof generateAuthenticationOptionsSchema
>;
export type VerifyPasskeyAuthenticationRequest = z.infer<typeof verifyPasskeyAuthenticationSchema>;
export type RenamePasskeyRequest = z.infer<typeof renamePasskeySchema>;
