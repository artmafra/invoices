"use client";

import { useState } from "react";
import type { useTranslations } from "next-intl";
import { SearchBarFilterSelect } from "@/components/shared/search-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface InvoicesFiltersProps {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;

  onSupplierCnpjFilter: (value: string) => void;
  onServiceCodeFilter: (value: string) => void;
  onIssueDateRange: (value: DateRange) => void;
  onDueDateRange: (value: DateRange) => void;

  t: ReturnType<typeof useTranslations<"apps/invoices">>;
}

export function InvoicesFilters({
  statusFilter,
  onStatusFilterChange,
  onSupplierCnpjFilter,
  onServiceCodeFilter,
  onIssueDateRange,
  onDueDateRange,
  t,
}: InvoicesFiltersProps) {
  const [activeFilter, setActiveFilter] = useState<
    "supplierCnpj" | "serviceCode" | "issueDate" | "dueDate" | null
  >(null);

  return (
    <>
      {/* STATUS */}
      <SearchBarFilterSelect
        label={t("fields.status")}
        value={statusFilter === "all" ? undefined : statusFilter}
        onValueChange={(v) => onStatusFilterChange(v ?? "all")}
        anyLabel={t("allStatus")}
        options={[
          { value: "draft", label: t("status.draft") },
          { value: "issued", label: t("status.issued") },
          { value: "paid", label: t("status.paid") },
          { value: "cancelled", label: t("status.cancelled") },
        ]}
      />

      {/* SUPPLIER CNPJ */}
      <Button
        size="sm"
        variant={activeFilter === "supplierCnpj" ? "default" : "outline"}
        onClick={() => setActiveFilter((f) => (f === "supplierCnpj" ? null : "supplierCnpj"))}
      >
        {t("supplierCnpjFilter")}
      </Button>

      {/* SERVICE CODE */}
      <Button
        size="sm"
        variant={activeFilter === "serviceCode" ? "default" : "outline"}
        onClick={() => setActiveFilter((f) => (f === "serviceCode" ? null : "serviceCode"))}
      >
        {t("serviceCodeFilter")}
      </Button>

      {/* ISSUE DATE */}
      <Button
        size="sm"
        variant={activeFilter === "issueDate" ? "default" : "outline"}
        onClick={() => setActiveFilter((f) => (f === "issueDate" ? null : "issueDate"))}
      >
        {t("issueDateFilter")}
      </Button>

      {/* DUE DATE */}
      <Button
        size="sm"
        variant={activeFilter === "dueDate" ? "default" : "outline"}
        onClick={() => setActiveFilter((f) => (f === "dueDate" ? null : "dueDate"))}
      >
        {t("dueDateFilter")}
      </Button>

      {/* ACTIVE FILTER INPUT */}
      {activeFilter === "supplierCnpj" && (
        <Input
          autoFocus
          placeholder={t("placeholders.supplierCnpj")}
          onChange={(e) => onSupplierCnpjFilter(e.target.value)}
          className="w-full sm:w-64"
        />
      )}

      {activeFilter === "serviceCode" && (
        <Input
          autoFocus
          placeholder={t("placeholders.serviceCode")}
          onChange={(e) => onServiceCodeFilter(e.target.value)}
          className="w-full sm:w-64"
        />
      )}

      {activeFilter === "issueDate" && (
        <div className="flex gap-2">
          <input
            type="date"
            onChange={(e) =>
              onIssueDateRange({
                from: e.target.value ? new Date(e.target.value) : undefined,
                to: undefined,
              })
            }
          />

          <input
            type="date"
            onChange={(e) =>
              onIssueDateRange({
                from: undefined,
                to: e.target.value ? new Date(e.target.value) : undefined,
              })
            }
          />
        </div>
      )}

      {activeFilter === "dueDate" && (
        <div className="flex gap-2">
          <input
            type="date"
            onChange={(e) =>
              onDueDateRange({
                from: e.target.value ? new Date(e.target.value) : undefined,
                to: undefined,
              })
            }
          />

          <input
            type="date"
            onChange={(e) =>
              onDueDateRange({
                from: undefined,
                to: e.target.value ? new Date(e.target.value) : undefined,
              })
            }
          />
        </div>
      )}
    </>
  );
}
