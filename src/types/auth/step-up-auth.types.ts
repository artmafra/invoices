// ========================================
// Step-Up Authentication Types
// ========================================

/**
 * Authentication method used for login
 */
export type AuthMethod = "password" | "passkey" | "google";

/**
 * Step-up authentication response
 */
export interface StepUpAuthResponse {
  success: boolean;
  stepUpAuthAt: number; // Unix timestamp in milliseconds
  stepUpToken: string; // Secure token for session.update()
}

/**
 * Auth capabilities exposed to the client
 * Indicates which methods the user can use for step-up auth
 */
export interface AuthCapabilities {
  hasPassword: boolean;
  hasPasskeys: boolean;
}

// ========================================
// Re-export Request Types from Validations
// ========================================

export type { StepUpAuthRequest } from "@/validations/step-up-auth.validations";
