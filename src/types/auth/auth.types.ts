import { z } from "zod";
import { forgotPasswordSchema, resetPasswordSchema } from "@/validations/auth.validations";

// ========================================
// Pending 2FA Types
// ========================================

/** Request type for POST /api/auth/pending-2fa */
export interface Pending2faRequest {
  token: string;
}

/** Response type for POST /api/auth/pending-2fa */
export interface Pending2faResponse {
  success: boolean;
  userId: string;
  email: string;
  availableMethods: AvailableTwoFactorMethods;
}

// ========================================
// Two-Factor Authentication Types
// ========================================

/**
 * Available two-factor authentication methods for a user
 * Used during login flow to indicate which 2FA methods are available
 */
export interface AvailableTwoFactorMethods {
  email: boolean;
  totp: boolean;
  backup: boolean;
  hasAny: boolean;
  preferred?: "email" | "totp";
}

/**
 * Response type for GET /api/profile/2fa
 * Returns the 2FA status for the current user
 */
export interface TwoFactorStatusResponse {
  enabled: boolean;
  methods: {
    email: boolean;
    totp: boolean;
  };
  preferred: string;
  backupCodesCount: number;
}

/**
 * Response type for POST /api/profile/2fa/backup-codes/regenerate
 * Returns the newly generated backup codes
 */
export interface RegenerateBackupCodesResponse {
  success: boolean;
  message: string;
  backupCodes: string[];
}

/**
 * TOTP (Time-based One-Time Password) setup data
 * Response type for POST /api/profile/2fa/totp/setup
 */
export interface TotpSetupResponse {
  qrCodeUrl: string;
  secret: string;
  manualEntryKey: string;
  backupCodes: string[];
}

/**
 * Request data for enabling TOTP 2FA
 * Request type for POST /api/profile/2fa/totp/enable
 */
export interface TotpEnableRequest {
  secret: string;
  code: string;
  backupCodes: string[];
}

/**
 * Response type for POST /api/profile/2fa/totp/enable
 */
export interface TotpEnableResponse {
  success: boolean;
  message: string;
  backupCodes: string[];
}

/**
 * Request data for enabling email 2FA
 * Request type for POST /api/profile/2fa/email/enable
 */
export interface EmailTwoFactorEnableRequest {
  code: string;
}

/** Request data for resending 2FA code during login */
export interface TwoFactorResendRequest {
  userId: string;
}

/** Request data for verifying 2FA code during login */
export interface TwoFactorVerifyRequest {
  userId: string;
  code: string;
  method: "email" | "totp";
}

// ========================================
// Session Types
// ========================================

/** Request data for session refresh */
export interface SessionRefreshRequest {
  refreshToken: string;
}

// ========================================
// Password Reset Types
// ========================================

/** Request type for POST /api/auth/forgot-password */
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;

/** Request type for POST /api/auth/reset-password */
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;

/** Response type for GET /api/auth/reset-password (token validation) */
export interface ValidateResetTokenResponse {
  valid: boolean;
  email?: string;
  error?: string;
}

/** Response type for POST /api/auth/reset-password */
export interface ResetPasswordResponse {
  success: { code: string };
}
