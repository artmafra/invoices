import { z } from "zod";

// ========================================
// TOTP Schemas
// ========================================

export const enableTotpSchema = z.object({
  secret: z.string().min(1, "Secret is required"),
  code: z.string().length(6, "Code must be 6 digits"),
  backupCodes: z.array(z.string().length(8)).length(10, "Must have 10 backup codes"),
});

// ========================================
// Email 2FA Schemas
// ========================================

export const verify2faCodeSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
});

export const toggle2faSchema = z.object({
  enabled: z.boolean(),
});

export const resend2faSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

// ========================================
// Type Exports
// ========================================

export type EnableTotpRequest = z.infer<typeof enableTotpSchema>;
export type Verify2faCodeRequest = z.infer<typeof verify2faCodeSchema>;
export type Toggle2faRequest = z.infer<typeof toggle2faSchema>;
export type Resend2faRequest = z.infer<typeof resend2faSchema>;
