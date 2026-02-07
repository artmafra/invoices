import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  DEFAULT_PASSWORD_POLICY,
  validatePassword,
  type PasswordPolicySettings,
  type PasswordValidationError,
} from "@/lib/password-policy";

// =============================================================================
// Query Keys
// =============================================================================

export const QUERY_KEYS = {
  all: ["settings", "password-policy"] as const,
} as const;

// =============================================================================
// Types
// =============================================================================

export interface TranslatedPasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: 0 | 1 | 2 | 3 | 4;
}

/**
 * Fetches password policy settings from the API.
 * Caches for 10 minutes as settings rarely change.
 */
export const usePasswordPolicy = () => {
  return useQuery({
    queryKey: QUERY_KEYS.all,
    queryFn: async (): Promise<PasswordPolicySettings> => {
      const response = await fetch("/api/settings/password-policy");

      if (!response.ok) {
        // Return defaults if API fails
        return DEFAULT_PASSWORD_POLICY;
      }

      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
    // Use defaults while loading to enable immediate validation
    placeholderData: DEFAULT_PASSWORD_POLICY,
  });
};

/**
 * Translates password validation error keys to localized strings.
 */
function translateErrors(
  errors: PasswordValidationError[],
  t: ReturnType<typeof useTranslations>,
): string[] {
  return errors.map((error) => t(error.key, error.params));
}

/**
 * Hook that combines password policy fetching with real-time validation.
 * Returns translated error messages based on the user's locale.
 *
 * @param password - The password to validate (empty string returns null)
 * @returns Validation result with translated errors and strength score
 */
export const usePasswordValidation = (
  password: string,
): TranslatedPasswordValidationResult | null => {
  const { data: policy } = usePasswordPolicy();
  const t = useTranslations("errors");

  return useMemo(() => {
    // Don't validate empty passwords (no result to show)
    if (!password) return null;

    // Use fetched policy or fall back to defaults
    const settings = policy ?? DEFAULT_PASSWORD_POLICY;
    const result = validatePassword(password, settings);

    // Translate error keys to localized strings
    return {
      valid: result.valid,
      errors: translateErrors(result.errors, t),
      strength: result.strength,
    };
  }, [password, policy, t]);
};
