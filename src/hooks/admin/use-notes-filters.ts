"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LoadingTransitionHandle } from "@/components/shared/loading-transition";
import type { SearchBarSortOption } from "@/components/shared/search-bar";
import { useDebounce } from "../use-debounce";
import { useUrlFilters } from "./use-url-filters";

/**
 * Hook to manage note list filters with URL persistence and debounced search
 * Consolidates filter state management for notes and archived notes pages
 */
export function useNotesFilters(isArchived: boolean = false) {
  const animationRef = useRef<LoadingTransitionHandle>(null);

  // URL-persisted filters and sorting
  const { state: filterState, actions: filterActions } = useUrlFilters(["color"], {
    defaultSortBy: "updatedAt",
    defaultSortOrder: "desc",
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

  // Sort options for SearchFilterBar
  const sortOptions = useMemo<SearchBarSortOption[]>(
    () => [
      { value: "title", label: "Title" },
      { value: "createdAt", label: "Created" },
      { value: "updatedAt", label: "Updated" },
    ],
    [],
  );

  return {
    // State
    filters: {
      search: debouncedSearch,
      isArchived,
      color: filterState.filters.color,
      sortBy: filterState.sortBy,
      sortOrder: filterState.sortOrder,
      page: filterState.page,
    },
    searchInput,
    sortOptions,
    animationRef,

    // Actions
    setSearchInput,
    setColorFilter: (value: string) =>
      filterActions.setFilter("color", value === "any" ? undefined : value),
    setSort: filterActions.setSort,
    setPage: filterActions.setPage,
    clearFilters: () => {
      setSearchInput("");
      filterActions.clearAll();
    },
    hasActiveFilters: filterActions.hasActiveFilters,
  };
}
