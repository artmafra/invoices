"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarIcon, X } from "lucide-react";
import type { useTranslations } from "next-intl";
import { useTranslations as useT } from "next-intl";
import { formatCnpj } from "@/lib/cnpj-service-code";
import { cn } from "@/lib/utils";
import { LazyCalendar } from "@/components/shared/lazy-calendar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface InvoicesFiltersProps {
  onIssueDateRange: (value: DateRange) => void;
  onSupplierCnpj?: (value: string) => void;

  taxFilters: string[];
  onTaxFilter: (taxes: string[]) => void;

  hasActiveFilters?: boolean;
  onClear?: () => void;

  t: ReturnType<typeof useTranslations<"apps/invoices">>;
}

export function InvoicesFilters({
  onIssueDateRange,
  onSupplierCnpj,
  taxFilters,
  onTaxFilter,
  hasActiveFilters,
  onClear,
  t,
}: InvoicesFiltersProps) {
  const tCommon = useT("common");
  const [issueDateOpen, setIssueDateOpen] = useState(false);
  const [issueDateRange, setIssueDateRange] = useState<DateRange>({});
  const [cnpjOpen, setCnpjOpen] = useState(false);
  const [cnpjValue, setCnpjValue] = useState("");
  const cnpjDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (cnpjDebounceRef.current) clearTimeout(cnpjDebounceRef.current);
    };
  }, []);

  const handleClear = () => {
    setIssueDateRange({});
    onIssueDateRange({});
    onTaxFilter([]);
    setCnpjValue("");
    onSupplierCnpj?.("");
    onClear?.();
  };

  const toggleTax = (tax: string) => {
    onTaxFilter(
      taxFilters.includes(tax) ? taxFilters.filter((t) => t !== tax) : [...taxFilters, tax],
    );
  };

  return (
    <div className="flex flex-col w-full gap-space-md">
      {/* ROW 1: filter buttons */}
      <div className="flex flex-wrap items-end gap-space-md">
        {/* ISSUE DATE */}
        <Button
          size="sm"
          variant={issueDateOpen ? "default" : "outline"}
          onClick={() => setIssueDateOpen((v) => !v)}
        >
          {t("fields.issueDate")}
        </Button>

        {/* CNPJ */}
        {onSupplierCnpj && (
          <Button
            size="sm"
            variant={cnpjOpen ? "default" : "outline"}
            onClick={() => setCnpjOpen((v) => !v)}
          >
            CNPJ
          </Button>
        )}

        {/* TAX TOGGLES */}
        {(["issqn", "inss", "cs", "irrf"] as const).map((tax) => (
          <Button
            key={tax}
            size="sm"
            variant={taxFilters.includes(tax) ? "default" : "outline"}
            onClick={() => toggleTax(tax)}
          >
            {tax.toUpperCase()}
          </Button>
        ))}

        {/* CLEAR */}
        {hasActiveFilters && onClear && (
          <Button size="sm" variant="outline" onClick={handleClear}>
            <X className="h-4 w-4" />
            {tCommon("buttons.clear")}
          </Button>
        )}
      </div>

      {/* ROW 2: issue date pickers */}
      <Collapsible open={issueDateOpen}>
        <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
          <div className="flex flex-wrap items-center gap-space-md pt-space-sm">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full pl-space-md text-left font-normal sm:w-64",
                    !issueDateRange.from && "text-muted-foreground",
                  )}
                >
                  {issueDateRange.from ? (
                    issueDateRange.from.toLocaleDateString("pt-BR")
                  ) : (
                    <span>{t("dates.from")}</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <LazyCalendar
                  mode="single"
                  selected={issueDateRange.from}
                  onSelect={(date) => {
                    const next = { ...issueDateRange, from: date };
                    setIssueDateRange(next);
                    onIssueDateRange(next);
                  }}
                  disabled={(date) => date < new Date("1900-01-01")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full pl-space-md text-left font-normal sm:w-64",
                    !issueDateRange.to && "text-muted-foreground",
                  )}
                >
                  {issueDateRange.to ? (
                    issueDateRange.to.toLocaleDateString("pt-BR")
                  ) : (
                    <span>{t("dates.to")}</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <LazyCalendar
                  mode="single"
                  selected={issueDateRange.to}
                  onSelect={(date) => {
                    const next = { ...issueDateRange, to: date };
                    setIssueDateRange(next);
                    onIssueDateRange(next);
                  }}
                  disabled={(date) => date < new Date("1900-01-01")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ROW 3: CNPJ input */}
      {onSupplierCnpj && (
        <Collapsible open={cnpjOpen}>
          <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
            <div className="pt-space-sm">
              <Input
                placeholder={t("fields.supplierCnpjPlaceholder")}
                inputMode="numeric"
                value={formatCnpj(cnpjValue)}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 14);
                  setCnpjValue(val);
                  if (cnpjDebounceRef.current) clearTimeout(cnpjDebounceRef.current);
                  cnpjDebounceRef.current = setTimeout(() => onSupplierCnpj(val), 400);
                }}
                className="w-full sm:w-64"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
