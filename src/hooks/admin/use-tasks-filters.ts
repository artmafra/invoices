"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useListFilters } from "./use-list-filters";

/**
 * Hook to manage task list filters with URL persistence and debounced search
 */
export function useTasksFilters() {
  const tc = useTranslations("common");

  const sortOptions = useMemo(
    () => [
      { value: "title", label: "Title" },
      { value: "dueDate", label: "Due Date" },
      { value: "priority", label: "Priority" },
      { value: "createdAt", label: tc("table.createdAt") },
      { value: "updatedAt", label: tc("table.updatedAt") },
    ],
    [tc],
  );

  const result = useListFilters({
    filterKeys: ["status", "overdue", "includeCompleted"],
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    sortOptions,
  });

  // Parse boolean filters from URL
  const showOverdueOnly = result.filters.overdue === "true";
  const includeCompleted = result.filters.includeCompleted === "true";

  return {
    ...result,
    filters: {
      ...result.filters,
      status: (result.filters.status as string) || "all",
      showOverdueOnly,
      includeCompleted,
    },
    setStatusFilter: (value: string) =>
      result.setFilter("status", value === "all" ? undefined : value),
    setShowOverdueOnly: (value: boolean) => result.setFilter("overdue", value ? "true" : undefined),
    setIncludeCompleted: (value: boolean) =>
      result.setFilter("includeCompleted", value ? "true" : undefined),
  };
}
