"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useListFilters } from "./use-list-filters";

/**
 * Hook to manage invoice list filters with URL persistence
 */
export function useInvoicesFilters() {
  const tc = useTranslations("common");

  const sortOptions = useMemo(
    () => [
      { value: "issueDate", label: "Issue Date" },
      { value: "dueDate", label: "Due Date" },
      { value: "invoiceNumber", label: "Invoice Number" },
      { value: "valueCents", label: "Value" },
      { value: "createdAt", label: tc("table.createdAt") },
      { value: "updatedAt", label: tc("table.updatedAt") },
    ],
    [tc],
  );

  const result = useListFilters({
    filterKeys: [
      "status",
      "supplierCnpj",
      "serviceCode",
      "issueDateFrom",
      "issueDateTo",
      "dueDateFrom",
      "dueDateTo",
      "includePaid",
    ],
    defaultSortBy: "issueDate",
    defaultSortOrder: "desc",
    sortOptions,
  });

  const includePaid = result.filters.includePaid === "true";

  return {
    ...result,

    filters: {
      ...result.filters,
      status: (result.filters.status as string) || "all",
      supplierCnpj: result.filters.supplierCnpj as string | undefined,
      serviceCode: result.filters.serviceCode as string | undefined,
      issueDateFrom: result.filters.issueDateFrom as string | undefined,
      issueDateTo: result.filters.issueDateTo as string | undefined,
      dueDateFrom: result.filters.dueDateFrom as string | undefined,
      dueDateTo: result.filters.dueDateTo as string | undefined,
      includePaid,
    },

    // Status
    setStatusFilter: (value: string | "all") =>
      result.setFilter("status", value === "all" ? undefined : value),

    // Supplier
    setSupplierCnpjFilter: (value?: string) => result.setFilter("supplierCnpj", value || undefined),

    // Service
    setServiceCodeFilter: (value?: string) => result.setFilter("serviceCode", value || undefined),

    // Dates
    setIssueDateRange: (from?: string, to?: string) => {
      result.setFilters({ issueDateFrom: from, issueDateTo: to });
    },

    setDueDateRange: (from?: string, to?: string) => {
      result.setFilters({ dueDateFrom: from, dueDateTo: to });
    },
  };
}
