"use client";

import { useEffect, useState } from "react";
import type { useTranslations } from "next-intl";
import { useDebounce } from "@/hooks/use-debounce";
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
  const [nameInput, setNameInput] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [cnpjInput, setCnpjInput] = useState("");

  const debouncedName = useDebounce(nameInput, 300);
  const debouncedCity = useDebounce(cityInput, 300);
  const debouncedCnpj = useDebounce(cnpjInput, 300);

  useEffect(() => {
    if (activeFilter === "name") onNameFilter(debouncedName);
  }, [debouncedName]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeFilter === "city") onCityFilter(debouncedCity);
  }, [debouncedCity]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeFilter === "cnpj") onCnpjFilter(debouncedCnpj);
  }, [debouncedCnpj]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterToggle = (filter: "name" | "city" | "cnpj") => {
    if (activeFilter === filter) {
      if (filter === "name") {
        setNameInput("");
        onNameFilter("");
      }
      if (filter === "city") {
        setCityInput("");
        onCityFilter("");
      }
      if (filter === "cnpj") {
        setCnpjInput("");
        onCnpjFilter("");
      }
      setActiveFilter(null);
    } else {
      setActiveFilter(filter);
    }
  };

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
        onClick={() => handleFilterToggle("name")}
      >
        {t("fields.name")}
      </Button>

      {/* CITY */}
      <Button
        size="sm"
        variant={activeFilter === "city" ? "default" : "outline"}
        onClick={() => handleFilterToggle("city")}
      >
        {t("fields.city")}
      </Button>

      {/* CNPJ */}
      <Button
        size="sm"
        variant={activeFilter === "cnpj" ? "default" : "outline"}
        onClick={() => handleFilterToggle("cnpj")}
      >
        {t("fields.cnpj")}
      </Button>

      {/* ACTIVE FILTER INPUT */}
      {activeFilter === "name" && (
        <Input
          autoFocus
          placeholder={t("fields.namePlaceholder")}
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          className="w-full sm:w-64"
        />
      )}

      {activeFilter === "city" && (
        <Input
          autoFocus
          placeholder={t("fields.cityPlaceholder")}
          value={cityInput}
          onChange={(e) => setCityInput(e.target.value)}
          className="w-full sm:w-64"
        />
      )}

      {activeFilter === "cnpj" && (
        <Input
          autoFocus
          placeholder={t("fields.cnpjPlaceholder")}
          value={cnpjInput}
          onChange={(e) => setCnpjInput(e.target.value)}
          className="w-full sm:w-64"
          maxLength={18}
        />
      )}
    </>
  );
}
