"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// =============================================================================
// Types
// =============================================================================

export interface App {
  id: string;
  slug: string;
  name: string;
  iconName: string;
  permissions: Array<{
    action: string;
    description: string;
  }>;
}

// =============================================================================
// Query Key
// =============================================================================

export const APPS_QUERY_KEY = ["apps", "user"];

// =============================================================================
// Context
// =============================================================================

interface AppsContextValue {
  /** All apps the user has access to */
  apps: App[];
  /** Check if user has access to an app by slug */
  hasAppAccess: (slug: string) => boolean;
  /** Get an app by slug */
  getAppBySlug: (slug: string) => App | undefined;
  /** Refetch apps (e.g., after impersonation) */
  refetch: () => void;
  /** Initial selected app slug from server cookie (for hydration) */
  initialSelectedAppSlug: string | null;
}

const AppsContext = createContext<AppsContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

interface AppsProviderProps {
  children: ReactNode;
  /** Apps pre-filtered by user's apps (from server) */
  apps: App[];
  /** Initial selected app slug from server cookie (for hydration) */
  initialSelectedAppSlug?: string | null;
}

/**
 * Provides apps data to the admin layout.
 * Uses React Query with SSR initial data for:
 * - Fast first render (no loading flash)
 * - Ability to refetch on impersonation changes
 */
export function AppsProvider({
  children,
  apps: initialApps,
  initialSelectedAppSlug = null,
}: AppsProviderProps) {
  const queryClient = useQueryClient();

  // Use React Query with SSR initial data
  const { data: apps = initialApps } = useQuery({
    queryKey: APPS_QUERY_KEY,
    queryFn: async (): Promise<App[]> => {
      const response = await fetch("/api/admin/apps/user");
      if (!response.ok) {
        throw new Error("Failed to fetch apps");
      }
      return response.json();
    },
    initialData: initialApps,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const value = useMemo<AppsContextValue>(() => {
    const appsBySlug = new Map(apps.map((m) => [m.slug, m]));

    return {
      apps,
      hasAppAccess: (slug: string) => appsBySlug.has(slug),
      getAppBySlug: (slug: string) => appsBySlug.get(slug),
      refetch: () => {
        queryClient.invalidateQueries({ queryKey: APPS_QUERY_KEY });
      },
      initialSelectedAppSlug,
    };
  }, [apps, queryClient, initialSelectedAppSlug]);

  return <AppsContext.Provider value={value}>{children}</AppsContext.Provider>;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Access apps data from the provider.
 * Must be used within AppsProvider.
 */
export function useApps(): AppsContextValue {
  const context = useContext(AppsContext);
  if (!context) {
    throw new Error("useApps must be used within an AppsProvider");
  }
  return context;
}
