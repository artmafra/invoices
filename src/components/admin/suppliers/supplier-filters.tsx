"use client";

import { useState } from "react";
import type { useTranslations } from "next-intl";
import { SearchBarFilterSelect } from "@/components/shared/search-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface SupplierFiltersProps {
  taxRegimeFilter: string;
  onTaxRegimeFilterChange: (value: string) => void;

  onNameFilter: (value: string) => void;
  onCityFilter: (value: string) => void;
  onCnpjFilter: (value: string) => void;

  t: ReturnType<typeof useTranslations<"apps/suppliers">>;
}

export function SupplierFilters({
  taxRegimeFilter,
  onTaxRegimeFilterChange,
  onNameFilter,
  onCityFilter,
  onCnpjFilter,
  t,
}: SupplierFiltersProps) {
  const [activeFilter, setActiveFilter] = useState<"name" | "city" | "cnpj" | null>(null);

  return (
    <>
      {/* TAX REGIME */}
      <SearchBarFilterSelect
        label={t("fields.taxRegime")}
        value={taxRegimeFilter === "all" ? undefined : taxRegimeFilter}
        onValueChange={(v) => onTaxRegimeFilterChange(v ?? "all")}
        anyLabel={t("filters.allRegimes")}
        options={[
          { value: "sn", label: t("taxRegimes.sn") },
          { value: "n", label: t("taxRegimes.n") },
          { value: "mei", label: t("taxRegimes.mei") },
        ]}
      />

      {/* NAME */}
      <Button
        size="sm"
        variant={activeFilter === "name" ? "default" : "outline"}
        onClick={() => setActiveFilter((f) => (f === "name" ? null : "name"))}
      >
        {t("fields.name")}
      </Button>

      {/* CITY */}
      <Button
        size="sm"
        variant={activeFilter === "city" ? "default" : "outline"}
        onClick={() => setActiveFilter((f) => (f === "city" ? null : "city"))}
      >
        {t("fields.city")}
      </Button>

      {/* CNPJ */}
      <Button
        size="sm"
        variant={activeFilter === "cnpj" ? "default" : "outline"}
        onClick={() => setActiveFilter((f) => (f === "cnpj" ? null : "cnpj"))}
      >
        {t("fields.cnpj")}
      </Button>

      {/* ACTIVE FILTER INPUT */}
      {activeFilter === "name" && (
        <Input
          autoFocus
          placeholder={t("fields.namePlaceholder")}
          onChange={(e) => onNameFilter(e.target.value)}
          className="w-full sm:w-64"
        />
      )}

      {activeFilter === "city" && (
        <Input
          autoFocus
          placeholder={t("fields.cityPlaceholder")}
          onChange={(e) => onCityFilter(e.target.value)}
          className="w-full sm:w-64"
        />
      )}

      {activeFilter === "cnpj" && (
        <Input
          autoFocus
          placeholder={t("fields.cnpjPlaceholder")}
          onChange={(e) => onCnpjFilter(e.target.value)}
          className="w-full sm:w-64"
          maxLength={14}
        />
      )}
    </>
  );
}
