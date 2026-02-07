/**
 * Security Policy Module
 *
 * Central source of truth for all security-related policies and decisions.
 * This module defines:
 * - Which actions require step-up authentication
 * - What triggers session invalidation
 * - Rate limiting requirements by action type
 *
 * All route handlers and services should reference these policies
 * instead of hardcoding security decisions.
 *
 * @module lib/auth/policy
 */

// =============================================================================
// Sensitive Actions
// =============================================================================

/**
 * Actions that require step-up (re-authentication) to perform.
 * These are operations that could enable account takeover if
 * performed by an attacker with a stolen session.
 */
export const SENSITIVE_ACTIONS = {
  // Password & Authentication
  PASSWORD_CHANGE: "password.change",

  // Email
  EMAIL_CHANGE_INITIATE: "email.change.initiate",
  EMAIL_CHANGE_VERIFY: "email.change.verify",

  // Passkeys
  PASSKEY_REGISTER: "passkey.register",
  PASSKEY_DELETE: "passkey.delete",

  // Two-Factor Authentication
  TOTP_ENABLE: "totp.enable",
  TOTP_DISABLE: "totp.disable",
  EMAIL_2FA_ENABLE: "email2fa.enable",
  EMAIL_2FA_DISABLE: "email2fa.disable",

  // Recovery
  VIEW_BACKUP_CODES: "backup.codes.view",
  REGENERATE_BACKUP_CODES: "backup.codes.regenerate",

  // Sessions
  SESSION_REVOKE_OTHER: "session.revoke.other",
  SESSION_REVOKE_ALL: "session.revoke.all",
} as const;

export type SensitiveAction = (typeof SENSITIVE_ACTIONS)[keyof typeof SENSITIVE_ACTIONS];

/**
 * Check if an action requires step-up authentication.
 * All actions in SENSITIVE_ACTIONS require step-up by default.
 */
export function requiresStepUp(action: SensitiveAction): boolean {
  return Object.values(SENSITIVE_ACTIONS).includes(action);
}

// =============================================================================
// Session Invalidation Triggers
// =============================================================================

/**
 * Session invalidation rules for security-sensitive changes.
 *
 * - 'revoke_all': Revoke ALL sessions including current (user must re-login)
 * - 'revoke_others': Keep current session, revoke all others
 * - 'none': No session invalidation required
 */
export type SessionInvalidationRule = "revoke_all" | "revoke_others" | "none";

/**
 * Maps security events to their session invalidation behavior.
 */
export const SESSION_INVALIDATION_TRIGGERS: Record<string, SessionInvalidationRule> = {
  // Password changes - revoke others so attacker sessions are killed
  password_change: "revoke_others",

  // Password reset (forgot password flow) - revoke ALL because this is
  // typically done when account is compromised; user must re-authenticate
  password_reset: "revoke_all",

  // Email change - revoke others in case attacker changed email
  email_change: "revoke_others",

  // 2FA disabled - revoke others as this weakens security
  totp_disable: "revoke_others",
  email_2fa_disable: "revoke_others",

  // Account compromise detected - revoke everything
  account_compromise: "revoke_all",

  // User deactivation - revoke all sessions to enforce account lockout
  user_deactivation: "revoke_all",

  // Passkey removal when it's a critical auth factor
  passkey_delete_critical: "revoke_others",

  // RBAC changes - revoke sessions to enforce new permissions immediately
  role_change: "revoke_others",
  role_permissions_update: "revoke_all",
  user_apps_update: "revoke_others",
} as const;

/**
 * Get the session invalidation rule for a security event.
 * Returns 'none' if no rule is defined.
 */
export function getSessionInvalidationRule(event: string): SessionInvalidationRule {
  return SESSION_INVALIDATION_TRIGGERS[event] ?? "none";
}

/**
 * Check if a trigger should revoke sessions for RBAC changes.
 * Pure helper for determining if session revocation is needed.
 */
export function shouldRevokeSessionsForRbacChange(trigger: string): boolean {
  const rule = getSessionInvalidationRule(trigger);
  return rule === "revoke_all" || rule === "revoke_others";
}

// =============================================================================
// Step-Up Authentication Configuration
// =============================================================================

/**
 * Step-up authentication configuration.
 */
export const STEP_UP_CONFIG = {
  /** How long a step-up authentication remains valid (in milliseconds) */
  WINDOW_MS: 10 * 60 * 1000, // 10 minutes

  /** Allowed methods for step-up verification */
  METHODS: ["password", "passkey"] as const,
} as const;

// =============================================================================
// Rate Limiting Policy
// =============================================================================

/**
 * Maps endpoint categories to their rate limiter type.
 * Used to ensure consistent rate limiting across the application.
 */
export const RATE_LIMIT_POLICY = {
  // High-sensitivity: authentication attempts
  auth: "auth",
  passwordReset: "passwordReset",
  tokenValidation: "tokenValidation",

  // Medium-sensitivity: 2FA operations
  twoFactor: "twoFactor",
  twoFactorResend: "twoFactorResend",
  stepUp: "stepUp",

  // Sensitive profile operations
  sensitiveAction: "sensitiveAction",

  // Standard operations
  default: "default",
} as const;

export type RateLimitPolicy = (typeof RATE_LIMIT_POLICY)[keyof typeof RATE_LIMIT_POLICY];

/**
 * Get the rate limiter type for an endpoint category.
 */
export function getRateLimitPolicy(category: keyof typeof RATE_LIMIT_POLICY): RateLimitPolicy {
  return RATE_LIMIT_POLICY[category];
}

// =============================================================================
// Security Event Types (for audit logging)
// =============================================================================

/**
 * Security event types for audit logging.
 * These should be used with activityService.logAction().
 */
export const SECURITY_EVENTS = {
  // Authentication
  LOGIN_SUCCESS: "login_success",
  LOGIN_FAILED: "login_failed",
  LOGOUT: "logout",

  // Password
  PASSWORD_CHANGE: "change_password",
  PASSWORD_RESET_REQUEST: "password_reset_request",
  PASSWORD_RESET_COMPLETE: "password_reset_complete",

  // Email
  EMAIL_CHANGE_INITIATE: "email_change_initiate",
  EMAIL_CHANGE_COMPLETE: "email_change_complete",
  EMAIL_CHANGE_CANCEL: "email_change_cancel",

  // Two-Factor
  TOTP_ENABLE: "totp_enable",
  TOTP_DISABLE: "totp_disable",
  EMAIL_2FA_ENABLE: "email_2fa_enable",
  EMAIL_2FA_DISABLE: "email_2fa_disable",
  BACKUP_CODE_USED: "backup_code_used",
  BACKUP_CODES_REGENERATED: "backup_codes_regenerated",

  // Passkeys
  PASSKEY_REGISTER: "passkey_register",
  PASSKEY_DELETE: "passkey_delete",
  PASSKEY_RENAME: "passkey_rename",

  // Sessions
  SESSION_REVOKE: "session_revoke",
  SESSION_REVOKE_ALL: "session_revoke_all",
  SESSIONS_INVALIDATED: "sessions_invalidated",

  // Account Security
  ACCOUNT_LOCKOUT: "account_lockout",
  STEP_UP_AUTH: "step_up_auth",
} as const;

export type SecurityEvent = (typeof SECURITY_EVENTS)[keyof typeof SECURITY_EVENTS];
