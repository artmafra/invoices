/**
 * Password Policy Server-Side Utilities
 *
 * Server-only functions for password validation that require database access.
 * Uses accurate zxcvbn-based strength scoring on the server.
 * Use this in API routes, not in client components.
 */

import {
  DEFAULT_PASSWORD_POLICY,
  validatePassword as validatePasswordClient,
  type PasswordPolicySettings,
  type PasswordValidationResult,
} from "@/lib/password-policy";
import { getPasswordStrength } from "@/lib/password-strength.server";
import { settingsService } from "@/services/runtime/settings";

/**
 * Fetches password policy settings from the database.
 * For use in server-side API routes only.
 */
export async function getPasswordPolicySettings(): Promise<PasswordPolicySettings> {
  const [minLength, requireUppercase, requireLowercase, requireNumber, requireSpecial] =
    await Promise.all([
      settingsService.getSettingValue("password_min_length"),
      settingsService.getSettingValue("password_require_uppercase"),
      settingsService.getSettingValue("password_require_lowercase"),
      settingsService.getSettingValue("password_require_number"),
      settingsService.getSettingValue("password_require_special"),
    ]);

  return {
    minLength: minLength ?? DEFAULT_PASSWORD_POLICY.minLength,
    requireUppercase: requireUppercase ?? DEFAULT_PASSWORD_POLICY.requireUppercase,
    requireLowercase: requireLowercase ?? DEFAULT_PASSWORD_POLICY.requireLowercase,
    requireNumber: requireNumber ?? DEFAULT_PASSWORD_POLICY.requireNumber,
    requireSpecial: requireSpecial ?? DEFAULT_PASSWORD_POLICY.requireSpecial,
  };
}

/**
 * Server-side password validation with accurate strength scoring.
 * Fetches settings from database and validates password using zxcvbn.
 * For use in API routes only.
 */
export async function validatePasswordServer(password: string): Promise<PasswordValidationResult> {
  const settings = await getPasswordPolicySettings();

  // Use client validation for policy rules
  const result = validatePasswordClient(password, settings);

  // Override strength with accurate zxcvbn calculation
  const strength = getPasswordStrength(password);

  return {
    ...result,
    strength,
  };
}
