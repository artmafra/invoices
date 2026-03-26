"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SupplierTaxRegime } from "@/schema/suppliers.schema";
import type { LoadingTransitionHandle } from "@/components/shared/loading-transition";
import type { SearchBarSortOption } from "@/components/shared/search-bar";
import { useDebounce } from "../use-debounce";
import { useUrlFilters } from "./use-url-filters";

/**
 * Hook to manage supplier list filters with URL persistence and debounced search
 * Consolidates filter state management for suppliers page
 */
export function useSuppliersFilters() {
  const animationRef = useRef<LoadingTransitionHandle>(null);

  // URL-persisted filters and sorting
  const { state: filterState, actions: filterActions } = useUrlFilters(
    ["taxRegime", "city", "name", "cnpj"],
    {
      defaultSortBy: "name",
      defaultSortOrder: "asc",
      animationRef,
    },
  );

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
      { value: "name", label: "Name" },
      { value: "city", label: "City" },
      { value: "cnpj", label: "CNPJ" },
    ],
    [],
  );

  return {
    // State
    filters: {
      search: debouncedSearch,
      taxRegime: (filterState.filters.taxRegime as SupplierTaxRegime | undefined) ?? "all",
      city: filterState.filters.city,
      name: filterState.filters.name,
      cnpj: filterState.filters.cnpj,
      sortBy: filterState.sortBy,
      sortOrder: filterState.sortOrder,
      page: filterState.page,
    },
    searchInput,
    sortOptions,
    animationRef,

    // Actions
    setSearchInput,
    setTaxRegimeFilter: (value: string) =>
      filterActions.setFilter("taxRegime", value === "all" ? undefined : value),
    setCityFilter: (value: string) => filterActions.setFilter("city", value || undefined),
    setNameFilter: (value: string) => filterActions.setFilter("name", value || undefined),
    setCnpjFilter: (value: string) => filterActions.setFilter("cnpj", value || undefined),
    setSort: filterActions.setSort,
    setPage: filterActions.setPage,
    clearFilters: () => {
      setSearchInput("");
      filterActions.clearAll();
    },
    hasActiveFilters: filterActions.hasActiveFilters,
  };
}
