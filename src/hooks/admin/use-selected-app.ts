"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useApps, type App } from "@/components/apps-provider";

// =============================================================================
// Constants
// =============================================================================

const APP_COOKIE = "app";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// =============================================================================
// Cookie Helpers
// =============================================================================

function setCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; Secure; SameSite=Lax`;
}

// =============================================================================
// Types
// =============================================================================

export interface SelectedAppState {
  /** Currently selected app, or null if none selected/accessible */
  selectedApp: App | null;
  /** All apps the user has access to */
  accessibleApps: App[];
  /** Whether the user has access to any apps */
  hasAccessibleApps: boolean;
  /** Select a different app */
  selectApp: (appId: string) => void;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to manage the currently selected app with:
 * - Cookie persistence for selected app
 * - URL path detection as fallback
 * - Apps pre-filtered by user's apps (from server)
 * - Defaults to first accessible app alphabetically
 */
export function useSelectedApp(): SelectedAppState {
  const pathname = usePathname();
  const { apps, initialSelectedAppSlug } = useApps();

  // Track selected app ID in state
  // Initialize from server-provided cookie value to avoid hydration mismatch
  const [selectedAppId, setSelectedAppId] = useState<string | null>(initialSelectedAppSlug);

  // Apps are pre-filtered by apps from the server, just sort them
  const accessibleApps = useMemo(() => {
    return [...apps].sort((a, b) => a.name.localeCompare(b.name));
  }, [apps]);

  // Detect app from URL path (e.g., /admin/notes -> notes)
  const appFromUrl = useMemo(() => {
    if (!pathname) return null;
    const match = pathname.match(/^\/admin\/([^/]+)/);
    if (!match) return null;
    const slug = match[1];
    // Check if this slug matches an accessible app
    return accessibleApps.find((app) => app.slug === slug) || null;
  }, [pathname, accessibleApps]);

  // Determine the actual selected app
  const selectedApp = useMemo(() => {
    // If we have an app from URL and it's accessible, use it
    if (appFromUrl) {
      return appFromUrl;
    }

    // If we have a saved selection and it's accessible, use it
    if (selectedAppId) {
      const saved = accessibleApps.find((app) => app.slug === selectedAppId);
      if (saved) return saved;
    }

    // Default to first accessible app alphabetically
    return accessibleApps[0] || null;
  }, [appFromUrl, selectedAppId, accessibleApps]);

  // Update cookie when selected app changes or URL changes
  useEffect(() => {
    if (appFromUrl) {
      // URL takes precedence - update cookie and local state
      setCookie(APP_COOKIE, appFromUrl.slug);
      // Use startTransition to avoid the setState warning
      startTransition(() => {
        setSelectedAppId(appFromUrl.slug);
      });
    } else if (selectedApp) {
      // No URL override, sync cookie with current selection
      setCookie(APP_COOKIE, selectedApp.slug);
    }
  }, [appFromUrl, selectedApp]);

  // Function to manually select an app
  const selectApp = useCallback((appId: string) => {
    setSelectedAppId(appId);
    setCookie(APP_COOKIE, appId);
  }, []);

  return {
    selectedApp,
    accessibleApps,
    hasAccessibleApps: accessibleApps.length > 0,
    selectApp,
  };
}
