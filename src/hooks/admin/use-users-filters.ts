"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useListFilters } from "./use-list-filters";

/**
 * Hook to manage user list filters with URL persistence and debounced search
 */
export function useUsersFilters() {
  const tc = useTranslations("common");

  const sortOptions = useMemo(
    () => [
      { value: "name", label: tc("table.name") },
      { value: "email", label: tc("table.email") },
      { value: "createdAt", label: tc("table.createdAt") },
      { value: "updatedAt", label: tc("table.updatedAt") },
    ],
    [tc],
  );

  const result = useListFilters({
    filterKeys: ["roleId", "status"],
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    sortOptions,
  });

  return {
    ...result,
    filters: {
      ...result.filters,
      roleId: result.filters.roleId as string | undefined,
      status: result.filters.status as string | undefined,
    },
    setRoleFilter: (value: string) =>
      result.setFilter("roleId", value === "any" ? undefined : value),
    setStatusFilter: (value: string) =>
      result.setFilter("status", value === "any" ? undefined : value),
  };
}
