/**
 * Password Strength Server-Side Utilities
 *
 * Server-only functions for accurate password strength scoring using zxcvbn.
 * This keeps the 400KB zxcvbn library out of the client bundle.
 */

import zxcvbn from "zxcvbn";

/**
 * Calculate password strength using zxcvbn (server-side only).
 * Returns a score from 0 (very weak) to 4 (very strong).
 *
 * @param password - The password to analyze
 * @returns Strength score (0-4)
 */
export function getPasswordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  const result = zxcvbn(password);
  return result.score as 0 | 1 | 2 | 3 | 4;
}
