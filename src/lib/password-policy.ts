/**
 * Password Policy Validation
 *
 * Provides password validation against configurable policy settings.
 * Uses lightweight heuristics for client-side strength estimation.
 *
 * NOTE: This file is client-safe and uses simple heuristics for immediate UX feedback.
 * For accurate server-side strength scoring with zxcvbn, use password-policy.server.ts
 *
 * NOTE: This module returns translation keys instead of hardcoded strings.
 * Consumers must translate errors using i18n (e.g., useTranslations("errors")).
 */

// =============================================================================
// Types
// =============================================================================

export interface PasswordPolicySettings {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
}

export interface PasswordValidationError {
  key: string;
  params?: Record<string, string | number | Date>;
}

export interface PasswordValidationResult {
  valid: boolean;
  errors: PasswordValidationError[];
  strength: 0 | 1 | 2 | 3 | 4;
}

// =============================================================================
// Default Settings (used when settings cannot be fetched)
// =============================================================================

export const DEFAULT_PASSWORD_POLICY: PasswordPolicySettings = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false,
};

// =============================================================================
// Strength Label Keys
// =============================================================================

export const STRENGTH_LABEL_KEYS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "passwordStrength.veryWeak",
  1: "passwordStrength.weak",
  2: "passwordStrength.fair",
  3: "passwordStrength.strong",
  4: "passwordStrength.veryStrong",
};

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Calculate password strength using lightweight client-side heuristics.
 * Returns a score from 0 (very weak) to 4 (very strong).
 *
 * This is a simplified algorithm for immediate UX feedback.
 * Server-side validation uses zxcvbn for accurate entropy-based scoring.
 */
function calculatePasswordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  let score = 0;

  // Length scoring (0-2 points)
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  // Character variety (0-2 points)
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1; // Mixed case
  if (/\d/.test(password)) score += 0.5; // Numbers
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score += 0.5; // Special chars

  // Penalize common patterns
  if (/^[a-zA-Z]+$/.test(password) || /^\d+$/.test(password)) score -= 0.5; // Only letters or only numbers
  if (/(.)\1{2,}/.test(password)) score -= 0.5; // Repeated characters (aaa, 111)
  if (/^(password|admin|user|test|123)/i.test(password)) score -= 1; // Common weak passwords

  // Normalize to 0-4 scale
  const normalized = Math.max(0, Math.min(4, Math.round(score)));
  return normalized as 0 | 1 | 2 | 3 | 4;
}

/**
 * Validates a password against the provided policy settings.
 *
 * @param password - The password to validate
 * @param settings - Password policy settings to validate against
 * @returns Validation result with error keys (for i18n) and strength score
 */
export function validatePassword(
  password: string,
  settings: PasswordPolicySettings,
): PasswordValidationResult {
  const errors: PasswordValidationError[] = [];

  // Check minimum length
  if (password.length < settings.minLength) {
    errors.push({
      key: "validation.passwordMinLength",
      params: { min: settings.minLength },
    });
  }

  // Check uppercase requirement
  if (settings.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push({ key: "validation.passwordRequireUppercase" });
  }

  // Check lowercase requirement
  if (settings.requireLowercase && !/[a-z]/.test(password)) {
    errors.push({ key: "validation.passwordRequireLowercase" });
  }

  // Check number requirement
  if (settings.requireNumber && !/\d/.test(password)) {
    errors.push({ key: "validation.passwordRequireNumber" });
  }

  // Check special character requirement
  if (settings.requireSpecial && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push({ key: "validation.passwordRequireSpecial" });
  }

  // Calculate strength using lightweight heuristics
  const strength = calculatePasswordStrength(password);

  return {
    valid: errors.length === 0,
    errors,
    strength,
  };
}

/**
 * Get the translation key for a strength label
 */
export function getStrengthLabelKey(strength: 0 | 1 | 2 | 3 | 4): string {
  return STRENGTH_LABEL_KEYS[strength];
}

/**
 * Get strength color for UI display
 */
export function getStrengthColor(strength: 0 | 1 | 2 | 3 | 4): string {
  const colors: Record<0 | 1 | 2 | 3 | 4, string> = {
    0: "bg-destructive",
    1: "bg-warning",
    2: "bg-warning",
    3: "bg-success",
    4: "bg-success",
  };
  return colors[strength];
}
