"use client";

import { useEffect, useState } from "react";
import { useThemeTransition } from "@/hooks/use-theme-transition";
import {
  ThemeToggleButton,
  type ThemeToggleButtonProps,
} from "@/components/ui/shadcn-io/theme-toggle-button";

interface ThemeToggleProps extends Omit<ThemeToggleButtonProps, "theme" | "onClick"> {
  /** Initial theme for SSR (read from cookie on server) */
  initialTheme?: string;
}

/**
 * Read theme cookie on client-side
 */
function getThemeCookie(): string {
  if (typeof document === "undefined") return "system";
  const match = document.cookie.match(/(?:^|;\s*)pref\.theme=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "system";
}

/**
 * Theme Toggle Component
 *
 * Wrapper around ThemeToggleButton that handles theme switching logic
 * using the centralized theme transition system. Toggles between light and dark only.
 */
export function ThemeToggle({ showLabel = false, className, initialTheme }: ThemeToggleProps) {
  const { theme, switchTheme } = useThemeTransition();
  const [mounted, setMounted] = useState(false);

  // Read theme from cookie on mount if no initialTheme provided
  const [cookieTheme] = useState(() => initialTheme ?? getThemeCookie());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const handleToggle = () => {
    const currentTheme = mounted ? theme : cookieTheme;
    const newTheme = currentTheme === "light" ? "dark" : "light";
    switchTheme(newTheme);
  };

  // Use cookieTheme during SSR/initial render, then switch to actual theme after mount
  const displayTheme = mounted ? theme : cookieTheme;

  return (
    <ThemeToggleButton
      theme={displayTheme as "light" | "dark"}
      showLabel={showLabel}
      className={className}
      onClick={handleToggle}
    />
  );
}
