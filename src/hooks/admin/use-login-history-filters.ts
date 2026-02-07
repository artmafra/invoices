"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useListFilters } from "./use-list-filters";

/**
 * Hook to manage login history filters with URL persistence and debounced search
 */
export function useLoginHistoryFilters() {
  const t = useTranslations("profile.loginHistory");

  const sortOptions = useMemo(() => [{ value: "createdAt", label: t("sorting.createdAt") }], [t]);

  const result = useListFilters({
    filterKeys: ["success", "authMethod"],
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    sortOptions,
  });

  // Parse success filter from string to boolean
  const successFilter = result.filters.success as string;
  let successValue: boolean | undefined;
  if (successFilter === "true") {
    successValue = true;
  } else if (successFilter === "false") {
    successValue = false;
  }

  return {
    ...result,
    filters: {
      ...result.filters,
      success: successValue,
      authMethod: result.filters.authMethod as "password" | "google" | "passkey" | undefined,
    },
    setSuccessFilter: (value: string) =>
      result.setFilter("success", value === "any" ? undefined : value),
    setAuthMethodFilter: (value: string) =>
      result.setFilter("authMethod", value === "any" ? undefined : value),
  };
}
