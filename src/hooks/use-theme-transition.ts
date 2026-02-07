/**
 * Theme Transition Hook
 *
 * React hook for animated theme switching using View Transitions API.
 * Wraps next-themes setTheme() with consistent animations across the app.
 *
 * @example
 * const { switchTheme } = useThemeTransition();
 * switchTheme("dark"); // Switches to dark theme with animation
 */

"use client";

import { useCallback } from "react";
import { useTheme } from "next-themes";
import { switchThemeWithAnimation } from "@/lib/theme-transition";

// =============================================================================
// Hook
// =============================================================================

export interface UseThemeTransitionReturn {
  /**
   * Switch theme with fade animation
   * @param newTheme - Theme to switch to ("light" | "dark" | "system")
   */
  switchTheme: (newTheme: string) => void;
  /** Current theme value */
  theme: string | undefined;
  /** Resolved theme (system-aware) */
  resolvedTheme: string | undefined;
}

/**
 * Hook for switching themes with animated transitions
 *
 * @returns Object with switchTheme function and theme state
 *
 * @example
 * // Basic usage
 * const { switchTheme } = useThemeTransition();
 * switchTheme("dark");
 */
export function useThemeTransition(): UseThemeTransitionReturn {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const switchTheme = useCallback(
    (newTheme: string) => {
      switchThemeWithAnimation(() => setTheme(newTheme));
    },
    [setTheme],
  );

  return {
    switchTheme,
    theme,
    resolvedTheme,
  };
}
