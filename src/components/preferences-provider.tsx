"use client";

/**
 * Preferences Provider
 *
 * Provides SSR-injected preferences (pagination size) to admin pages.
 * Values are read from cookies on the server and passed down to avoid double-fetching.
 */
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import {
  COOKIE_NAMES,
  DEFAULT_PAGINATION_SIZE,
  PAGINATION_SIZE_OPTIONS,
  setCookie,
  type PaginationSize,
} from "@/lib/preferences";

// ============================================================================
// Context
// ============================================================================

interface PreferencesContextValue {
  paginationSize: PaginationSize;
  setPaginationSize: (size: PaginationSize) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface PreferencesProviderProps {
  children: ReactNode;
  initialPaginationSize?: PaginationSize;
}

export function PreferencesProvider({
  children,
  initialPaginationSize = DEFAULT_PAGINATION_SIZE,
}: PreferencesProviderProps) {
  const [paginationSize, setPaginationSizeState] = useState<PaginationSize>(() => {
    // Validate the initial value
    if (PAGINATION_SIZE_OPTIONS.includes(initialPaginationSize)) {
      return initialPaginationSize;
    }
    return DEFAULT_PAGINATION_SIZE;
  });

  const setPaginationSize = useCallback((size: PaginationSize) => {
    if (!PAGINATION_SIZE_OPTIONS.includes(size)) {
      return;
    }
    setPaginationSizeState(size);
    setCookie(COOKIE_NAMES.paginationSize, String(size));
  }, []);

  return (
    <PreferencesContext.Provider value={{ paginationSize, setPaginationSize }}>
      {children}
    </PreferencesContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Access pagination size preference from context.
 * Must be used within PreferencesProvider (admin layout).
 *
 * @throws Error if used outside of PreferencesProvider
 */
export function usePreferencesContext(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error(
      "usePreferencesContext must be used within PreferencesProvider. " +
        "This hook is only available in admin pages.",
    );
  }
  return context;
}
