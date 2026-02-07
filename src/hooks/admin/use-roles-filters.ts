import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useListFilters } from "./use-list-filters";

/**
 * Custom hook for managing roles filters, search, and sorting
 */
export function useRolesFilters() {
  const tc = useTranslations("common");

  const sortOptions = useMemo(
    () => [
      { value: "name", label: tc("table.name") },
      { value: "createdAt", label: tc("table.createdAt") },
      { value: "updatedAt", label: tc("table.updatedAt") },
    ],
    [tc],
  );

  return useListFilters({
    filterKeys: [],
    defaultSortBy: "name",
    defaultSortOrder: "asc",
    sortOptions,
  });
}
