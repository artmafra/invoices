"use client";

import type { RefObject } from "react";
import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { sanitizeSearchQuery, sanitizeUrlParam } from "@/lib/url-validation";
import type { LoadingTransitionHandle } from "@/components/shared/loading-transition";
import type { SortOrder } from "@/components/shared/search-bar";

export interface UrlFiltersOptions {
  /** Default sort field */
  defaultSortBy?: string;
  /** Default sort order */
  defaultSortOrder?: SortOrder;
  /**
   * Ref to LoadingTransition component for triggering animations.
   * When provided, animations are automatically triggered on filter changes.
   */
  animationRef?: RefObject<LoadingTransitionHandle | null>;
}

export interface UrlFiltersState {
  search: string;
  sortBy: string;
  sortOrder: SortOrder;
  page: number;
  filters: Record<string, string | undefined>;
}

export interface UrlFiltersActions {
  setSearch: (value: string) => void;
  setSort: (sortBy: string, sortOrder: SortOrder) => void;
  setFilter: (key: string, value: string | undefined) => void;
  setPage: (page: number) => void;
  clearAll: () => void;
  hasActiveFilters: boolean;
}

/**
 * Hook for managing search, filter, sort, and pagination state in URL query params.
 * Provides URL persistence for better UX (bookmarkable, shareable, back/forward navigation).
 *
 * @param filterKeys - Array of filter keys to track (e.g., ["role", "status"])
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * const animationRef = useRef<LoadingTransitionHandle>(null);
 * const { state, actions } = useUrlFilters(["role", "status"], {
 *   defaultSortBy: "createdAt",
 *   defaultSortOrder: "desc",
 *   animationRef, // Auto-triggers animation on filter changes
 * });
 *
 * // Use in SearchFilterBar
 * <SearchFilterBar
 *   searchValue={state.search}
 *   onSearchChange={actions.setSearch}
 *   sortBy={state.sortBy}
 *   sortOrder={state.sortOrder}
 *   onSortChange={actions.setSort}
 * />
 *
 * // Pass ref to LoadingTransition
 * <LoadingTransition ref={animationRef} isLoading={...}>
 *   <Content />
 * </LoadingTransition>
 * ```
 */
export function useUrlFilters(
  filterKeys: string[] = [],
  options: UrlFiltersOptions = {},
): { state: UrlFiltersState; actions: UrlFiltersActions } {
  const { defaultSortBy = "createdAt", defaultSortOrder = "desc", animationRef } = options;

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Parse current state from URL (with validation)
  const state = useMemo<UrlFiltersState>(() => {
    // Validate search query
    const search = sanitizeSearchQuery(searchParams.get("search"));

    // Validate sort params
    const sortBy = sanitizeUrlParam(searchParams.get("sortBy")) ?? defaultSortBy;
    const sortOrderParam = sanitizeUrlParam(searchParams.get("sortOrder"), ["asc", "desc"]);
    const sortOrder = (sortOrderParam as SortOrder) ?? defaultSortOrder;

    // Validate page number
    const pageParam = searchParams.get("page");
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;

    // Validate filter values
    const filters: Record<string, string | undefined> = {};
    for (const key of filterKeys) {
      const value = sanitizeUrlParam(searchParams.get(key));
      filters[key] = value;
    }

    return { search, sortBy, sortOrder, page, filters };
  }, [searchParams, filterKeys, defaultSortBy, defaultSortOrder]);

  // Helper to update URL with new params
  const updateUrl = useCallback(
    (updates: Record<string, string | undefined | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(newUrl, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Actions
  const setSearch = useCallback(
    (value: string) => {
      updateUrl({ search: value || undefined, page: undefined }); // Reset page on search
      animationRef?.current?.triggerAnimation();
    },
    [updateUrl, animationRef],
  );

  const setSort = useCallback(
    (sortBy: string, sortOrder: SortOrder) => {
      updateUrl({ sortBy, sortOrder });
      animationRef?.current?.triggerAnimation();
    },
    [updateUrl, animationRef],
  );

  const setFilter = useCallback(
    (key: string, value: string | undefined) => {
      updateUrl({ [key]: value, page: undefined }); // Reset page on filter change
      animationRef?.current?.triggerAnimation();
    },
    [updateUrl, animationRef],
  );

  const setPage = useCallback(
    (page: number) => {
      updateUrl({ page: page > 1 ? String(page) : undefined });
      animationRef?.current?.triggerAnimation();
    },
    [updateUrl, animationRef],
  );

  const clearAll = useCallback(() => {
    const updates: Record<string, undefined> = {
      search: undefined,
      sortBy: undefined,
      sortOrder: undefined,
      page: undefined,
    };
    for (const key of filterKeys) {
      updates[key] = undefined;
    }
    updateUrl(updates);
    animationRef?.current?.triggerAnimation();
  }, [updateUrl, filterKeys, animationRef]);

  const hasActiveFilters = useMemo(() => {
    if (state.search) return true;
    for (const key of filterKeys) {
      if (state.filters[key]) return true;
    }
    return false;
  }, [state.search, state.filters, filterKeys]);

  return {
    state,
    actions: {
      setSearch,
      setSort,
      setFilter,
      setPage,
      clearAll,
      hasActiveFilters,
    },
  };
}
