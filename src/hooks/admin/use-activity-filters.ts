"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useListFilters } from "./use-list-filters";

/**
 * Hook to manage activity log filters with URL persistence and debounced search
 */
export function useActivityFilters() {
  const tc = useTranslations("common");

  const sortOptions = useMemo(() => [{ value: "createdAt", label: tc("table.createdAt") }], [tc]);

  const result = useListFilters({
    filterKeys: ["userId", "action", "resource", "startDate", "endDate"],
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    sortOptions,
  });

  // Parse date filters from URL
  const startDate = result.filters.startDate
    ? new Date(result.filters.startDate as string)
    : undefined;
  const endDate = result.filters.endDate ? new Date(result.filters.endDate as string) : undefined;

  return {
    ...result,
    filters: {
      ...result.filters,
      userId: result.filters.userId as string | undefined,
      action: result.filters.action as string | undefined,
      resource: result.filters.resource as string | undefined,
      startDate,
      endDate,
    },
    setUserIdFilter: (value: string | undefined) => result.setFilter("userId", value),
    setActionFilter: (value: string | undefined) => result.setFilter("action", value),
    setResourceFilter: (value: string | undefined) => result.setFilter("resource", value),
    setStartDateFilter: (date: Date | undefined) =>
      result.setFilter("startDate", date?.toISOString()),
    setEndDateFilter: (date: Date | undefined) => result.setFilter("endDate", date?.toISOString()),
  };
}
