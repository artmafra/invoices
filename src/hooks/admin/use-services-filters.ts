"use client";

import { useMemo } from "react";
import { useListFilters } from "./use-list-filters";

/**
 * Hook to manage services list filters with URL persistence
 */
export function useServicesFilters() {
  const sortOptions = useMemo(() => [], []);

  const result = useListFilters({
    filterKeys: [],
    defaultSortBy: "code",
    defaultSortOrder: "asc",
    sortOptions,
  });

  return {
    ...result,
    filters: {
      ...result.filters,
    },
  };
}
