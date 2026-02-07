import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useUrlFilters } from "@/hooks/admin/use-url-filters";
import { useDebounce } from "@/hooks/use-debounce";
import type { LoadingTransitionHandle } from "@/components/shared/loading-transition";
import type { SearchBarSortOption } from "@/components/shared/search-bar";

/**
 * Custom hook for managing settings filters, search, and sorting
 * Consolidates URL state management, debounced search, and sort options
 *
 * @returns Filters state, search input, sort options, and setter functions
 */
export function useSettingsFilters() {
  const tc = useTranslations("common");

  // Animation ref for LoadingTransition
  const animationRef = useRef<LoadingTransitionHandle>(null);

  // URL-persisted filters and sorting
  const { state: filterState, actions: filterActions } = useUrlFilters(["category"], {
    defaultSortBy: "key",
    defaultSortOrder: "asc",
    animationRef,
  });

  // Local search input with debounce
  const [searchInput, setSearchInput] = useState(filterState.search);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Sync debounced search to URL
  const prevSearchRef = useRef(debouncedSearch);
  useEffect(() => {
    if (prevSearchRef.current !== debouncedSearch) {
      prevSearchRef.current = debouncedSearch;
      if (debouncedSearch !== filterState.search) {
        filterActions.setSearch(debouncedSearch);
      }
    }
  }, [debouncedSearch, filterState.search, filterActions]);

  // Sort options
  const sortOptions = useMemo<SearchBarSortOption[]>(
    () => [
      { value: "key", label: tc("table.key") },
      { value: "category", label: tc("table.category") },
      { value: "updatedAt", label: tc("table.updatedAt") },
    ],
    [tc],
  );

  const clearFilters = () => {
    setSearchInput("");
    filterActions.clearAll();
  };

  const handleSortChange = (sortBy: string, sortOrder: "asc" | "desc") => {
    filterActions.setSort(sortBy, sortOrder);
  };

  return {
    // Filters state
    filters: {
      category: filterState.filters.category,
      search: debouncedSearch,
      sortBy: filterState.sortBy,
      sortOrder: filterState.sortOrder,
    },
    // Local search state
    searchInput,
    setSearchInput,
    // Sort state
    sortOptions,
    setSort: handleSortChange,
    // Filter state
    categoryFilter: filterState.filters.category,
    setCategoryFilter: (category: string | undefined) =>
      filterActions.setFilter("category", category),
    // Clear all
    clearFilters,
    hasActiveFilters: !!debouncedSearch || !!filterState.filters.category,
    // Animation ref for LoadingTransition
    animationRef,
  };
}
