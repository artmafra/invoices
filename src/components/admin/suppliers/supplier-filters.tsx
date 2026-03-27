"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { useTranslations } from "next-intl";
import { useTranslations as useT } from "next-intl";
import { useDebounce } from "@/hooks/use-debounce";
import { SearchBarFilterSelect } from "@/components/shared/search-bar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";

export interface SupplierFiltersProps {
  taxRegimeFilter: string;
  onTaxRegimeFilterChange: (value: string) => void;

  onNameFilter: (value: string) => void;
  onCityFilter: (value: string) => void;
  onCnpjFilter: (value: string) => void;

  t: ReturnType<typeof useTranslations<"apps/suppliers">>;

  hasActiveFilters?: boolean;
  onClear?: () => void;
}

export function SupplierFilters({
  taxRegimeFilter,
  onTaxRegimeFilterChange,
  onNameFilter,
  onCityFilter,
  onCnpjFilter,
  t,
  hasActiveFilters,
  onClear,
}: SupplierFiltersProps) {
  const tCommon = useT("common");
  const [activeFilter, setActiveFilter] = useState<"name" | "city" | "cnpj" | null>(null);
  const lastActiveFilter = useRef<"name" | "city" | "cnpj" | null>(null);
  if (activeFilter !== null) lastActiveFilter.current = activeFilter;
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

  const handleClear = () => {
    setNameInput("");
    setCityInput("");
    setCnpjInput("");
    setActiveFilter(null);
    onClear?.();
  };

  const handleFilterToggle = (filter: "name" | "city" | "cnpj") => {
    if (activeFilter === filter) {
      if (filter === "name") {
        if (nameInput) onNameFilter("");
        setNameInput("");
      }
      if (filter === "city") {
        if (cityInput) onCityFilter("");
        setCityInput("");
      }
      if (filter === "cnpj") {
        if (cnpjInput) onCnpjFilter("");
        setCnpjInput("");
      }
      setActiveFilter(null);
    } else {
      setActiveFilter(filter);
    }
  };

  return (
    <div className="flex flex-col w-full gap-space-md">
      {/* ROW 1: Buttons / selects */}
      <div className="flex flex-wrap items-end gap-space-md">
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
      </div>

      {/* ROW 2: Active filter input + clear button */}
      <Collapsible open={activeFilter !== null}>
        <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
          <div className="pt-space-sm">
            {lastActiveFilter.current === "name" && (
              <div className="flex items-center gap-space-md">
                <Input
                  autoFocus
                  placeholder={t("fields.namePlaceholder")}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full sm:w-64"
                />
                {nameInput.length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => setNameInput("")}>
                    <X className="h-4 w-4 mr-1" />
                    {tCommon("buttons.clear")}
                  </Button>
                )}
              </div>
            )}

            {lastActiveFilter.current === "city" && (
              <div className="flex items-center gap-space-md">
                <Input
                  autoFocus
                  placeholder={t("fields.cityPlaceholder")}
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  className="w-full sm:w-64"
                />
                {cityInput.length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => setCityInput("")}>
                    <X className="h-4 w-4 mr-1" />
                    {tCommon("buttons.clear")}
                  </Button>
                )}
              </div>
            )}

            {lastActiveFilter.current === "cnpj" && (
              <div className="flex items-center gap-space-md">
                <Input
                  autoFocus
                  placeholder={t("fields.cnpjPlaceholder")}
                  value={cnpjInput}
                  onChange={(e) => setCnpjInput(e.target.value)}
                  className="w-full sm:w-64"
                  maxLength={14}
                />
                {cnpjInput.length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => setCnpjInput("")}>
                    <X className="h-4 w-4 mr-1" />
                    {tCommon("buttons.clear")}
                  </Button>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
