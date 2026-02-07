"use client";

import { useEffect, useRef, useState } from "react";
import type { LoadingTransitionHandle } from "@/components/shared/loading-transition";
import type { SearchBarSortOption, SortOrder } from "@/components/shared/search-bar";
import { useDebounce } from "../use-debounce";
import { useUrlFilters, type UrlFiltersOptions } from "./use-url-filters";

export interface ListFilterConfig extends UrlFiltersOptions {
  /** Filter keys to track in URL (e.g., ["roleId", "status"]) */
  filterKeys?: string[];
  /** Sort options for the SearchFilterBar */
  sortOptions: SearchBarSortOption[];
}

export interface ListFiltersResult {
  filters: {
    search: string;
    sortBy: string;
    sortOrder: SortOrder;
    page: number;
    [key: string]: string | number | undefined;
  };
  searchInput: string;
  sortOptions: SearchBarSortOption[];
  animationRef: React.RefObject<LoadingTransitionHandle | null>;
  setSearchInput: (value: string) => void;
  setFilter: (key: string, value: string | undefined) => void;
  setSort: (sortBy: string, sortOrder: "asc" | "desc") => void;
  setPage: (page: number) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

/**
 * Centralized hook for list page filters with URL persistence and debounced search.
 * Eliminates duplicate filter logic across user/role/game/task/activity/login-history screens.
 *
 * @example
 * ```tsx
 * const { filters, searchInput, setSearchInput, sortOptions, actions, animationRef } = useListFilters({
 *   filterKeys: ["roleId", "status"],
 *   defaultSortBy: "createdAt",
 *   defaultSortOrder: "desc",
 *   sortOptions: [
 *     { value: "name", label: t("table.name") },
 *     { value: "email", label: t("table.email") },
 *   ],
 * });
 * ```
 */
export function useListFilters(config: ListFilterConfig): ListFiltersResult {
  const { filterKeys = [], sortOptions, ...urlOptions } = config;

  const animationRef = useRef<LoadingTransitionHandle>(null);

  // URL-persisted filters and sorting
  const { state: filterState, actions: filterActions } = useUrlFilters(filterKeys, {
    ...urlOptions,
    animationRef,
  });

  // Local search input with debounce (URL updates on debounced value)
  const [searchInput, setSearchInput] = useState(filterState.search);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Sync debounced search to URL
  useEffect(() => {
    if (debouncedSearch !== filterState.search) {
      filterActions.setSearch(debouncedSearch);
    }
  }, [debouncedSearch, filterState.search, filterActions]);

  // Sync URL search to input on mount/back navigation
  useEffect(() => {
    if (filterState.search !== searchInput && filterState.search !== debouncedSearch) {
      setSearchInput(filterState.search);
    }
    // Only sync URL→input, not input→URL (handled by separate effect above)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterState.search]);

  const clearFilters = () => {
    setSearchInput("");
    filterActions.clearAll();
  };

  const handleSortChange = (sortBy: string, sortOrder: "asc" | "desc") => {
    filterActions.setSort(sortBy, sortOrder);
  };

  return {
    // State
    filters: {
      search: debouncedSearch,
      sortBy: filterState.sortBy,
      sortOrder: filterState.sortOrder,
      page: filterState.page,
      ...filterState.filters,
    },
    searchInput,
    sortOptions,
    animationRef,

    // Actions
    setSearchInput,
    setFilter: filterActions.setFilter,
    setSort: handleSortChange,
    setPage: filterActions.setPage,
    clearFilters,
    hasActiveFilters: filterActions.hasActiveFilters,
  };
}
