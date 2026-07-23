"use client";

import { useEffect, useRef, useState } from "react";
import type { LoadingTransitionHandle } from "@/components/shared/loading-transition";
import { useDebounce } from "../use-debounce";
import { useUrlFilters } from "./use-url-filters";

/**
 * Hook to manage session list filters with URL persistence and debounced search
 * Consolidates filter state management for system and profile sessions pages
 * Note: Sort options are not included since different pages use different translation namespaces
 */
export function useSessionsFilters() {
  const animationRef = useRef<LoadingTransitionHandle>(null);

  // URL-persisted filters and sorting
  const { state: filterState, actions: filterActions } = useUrlFilters(["deviceType"], {
    defaultSortBy: "lastActivityAt",
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

  // Adjust the local draft when browser navigation changes the URL search.
  const [syncedUrlSearch, setSyncedUrlSearch] = useState(filterState.search);
  if (filterState.search !== syncedUrlSearch) {
    setSyncedUrlSearch(filterState.search);
    if (filterState.search !== debouncedSearch) {
      setSearchInput(filterState.search);
    }
  }

  return {
    // State
    filters: {
      search: debouncedSearch,
      deviceType: filterState.filters.deviceType,
      sortBy: filterState.sortBy,
      sortOrder: filterState.sortOrder,
      page: filterState.page,
    },
    searchInput,
    animationRef,

    // Actions
    setSearchInput,
    setDeviceTypeFilter: (value: string) =>
      filterActions.setFilter("deviceType", value === "any" ? undefined : value),
    setSort: filterActions.setSort,
    setPage: filterActions.setPage,
    clearFilters: () => {
      setSearchInput("");
      filterActions.clearAll();
    },
    hasActiveFilters: filterActions.hasActiveFilters,
  };
}
