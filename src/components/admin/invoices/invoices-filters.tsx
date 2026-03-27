"use client";

import { useState } from "react";
import { CalendarIcon, X } from "lucide-react";
import type { useTranslations } from "next-intl";
import { useTranslations as useT } from "next-intl";
import { cn } from "@/lib/utils";
import { LazyCalendar } from "@/components/shared/lazy-calendar";
import { SearchBarFilterSelect } from "@/components/shared/search-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

  hasActiveFilters?: boolean;
  onClear?: () => void;

  t: ReturnType<typeof useTranslations<"apps/invoices">>;
}

export function InvoicesFilters({
  statusFilter,
  onStatusFilterChange,
  onSupplierCnpjFilter,
  onServiceCodeFilter,
  onIssueDateRange,
  onDueDateRange,
  hasActiveFilters,
  onClear,
  t,
}: InvoicesFiltersProps) {
  const tCommon = useT("common");
  const [activeFilter, setActiveFilter] = useState<
    "supplierCnpj" | "serviceCode" | "issueDate" | "dueDate" | null
  >(null);

  const [issueDateRange, setIssueDateRange] = useState<DateRange>({});
  const [dueDateRange, setDueDateRange] = useState<DateRange>({});
  const [supplierCnpjValue, setSupplierCnpjValue] = useState("");
  const [serviceCodeValue, setServiceCodeValue] = useState("");

  const handleClear = () => {
    setSupplierCnpjValue("");
    setServiceCodeValue("");
    setIssueDateRange({});
    setDueDateRange({});
    onClear?.();
  };

  const handleIssueDateSelect = (date: Date | undefined) => {
    if (!issueDateRange.from) {
      setIssueDateRange({ from: date });
      onIssueDateRange({ from: date });
    } else if (!issueDateRange.to) {
      setIssueDateRange({ from: issueDateRange.from, to: date });
      onIssueDateRange({ from: issueDateRange.from, to: date });
    } else {
      setIssueDateRange({ from: date });
      onIssueDateRange({ from: date });
    }
  };

  const handleDueDateSelect = (date: Date | undefined) => {
    if (!dueDateRange.from) {
      setDueDateRange({ from: date });
      onDueDateRange({ from: date });
    } else if (!dueDateRange.to) {
      setDueDateRange({ from: dueDateRange.from, to: date });
      onDueDateRange({ from: dueDateRange.from, to: date });
    } else {
      setDueDateRange({ from: date });
      onDueDateRange({ from: date });
    }
  };

  return (
    <div className="flex flex-col w-full gap-space-md">
      {/* ROW 1: filter buttons */}
      <div className="flex flex-wrap items-end gap-space-md">
        {/* STATUS */}
        <SearchBarFilterSelect
          label={t("fields.status")}
          value={statusFilter === "all" ? undefined : statusFilter}
          onValueChange={(v) => onStatusFilterChange(v ?? "all")}
          anyLabel={t("allStatus")}
          options={[
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
          {t("fields.supplierCnpj")}
        </Button>

        {/* SERVICE CODE */}
        <Button
          size="sm"
          variant={activeFilter === "serviceCode" ? "default" : "outline"}
          onClick={() => setActiveFilter((f) => (f === "serviceCode" ? null : "serviceCode"))}
        >
          {t("fields.serviceCode")}
        </Button>

        {/* ISSUE DATE */}
        <Button
          size="sm"
          variant={activeFilter === "issueDate" ? "default" : "outline"}
          onClick={() => setActiveFilter((f) => (f === "issueDate" ? null : "issueDate"))}
        >
          {t("fields.issueDate")}
        </Button>

        {/* DUE DATE */}
        <Button
          size="sm"
          variant={activeFilter === "dueDate" ? "default" : "outline"}
          onClick={() => setActiveFilter((f) => (f === "dueDate" ? null : "dueDate"))}
        >
          {t("fields.dueDate")}
        </Button>
      </div>

      {/* ROW 2: active filter input + clear button */}
      {activeFilter === "supplierCnpj" && (
        <div className="flex items-center gap-space-md">
          <Input
            autoFocus
            placeholder={t("fields.supplierCnpjPlaceholder")}
            value={supplierCnpjValue}
            onChange={(e) => {
              setSupplierCnpjValue(e.target.value);
              onSupplierCnpjFilter(e.target.value);
            }}
            maxLength={14}
            className="w-full sm:w-64"
          />
          {hasActiveFilters && onClear && (
            <Button variant="secondary" onClick={handleClear}>
              <X className="h-4 w-4" />
              {tCommon("buttons.clear")}
            </Button>
          )}
        </div>
      )}

      {activeFilter === "serviceCode" && (
        <div className="flex items-center gap-space-md">
          <Input
            autoFocus
            placeholder={t("fields.serviceCodePlaceholder")}
            value={serviceCodeValue}
            onChange={(e) => {
              setServiceCodeValue(e.target.value);
              onServiceCodeFilter(e.target.value);
            }}
            className="w-full sm:w-64"
          />
          {hasActiveFilters && onClear && (
            <Button variant="secondary" onClick={handleClear}>
              <X className="h-4 w-4" />
              {tCommon("buttons.clear")}
            </Button>
          )}
        </div>
      )}

      {activeFilter === "issueDate" && (
        <div className="flex items-center gap-space-md flex-wrap">
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
                  <span>{"De"}</span>
                )}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <LazyCalendar
                mode="single"
                selected={issueDateRange.from}
                onSelect={handleIssueDateSelect}
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
                  <span>{"Até"}</span>
                )}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <LazyCalendar
                mode="single"
                selected={issueDateRange.to}
                onSelect={(date) => {
                  setIssueDateRange({ from: issueDateRange.from, to: date });
                  onIssueDateRange({ from: issueDateRange.from, to: date });
                }}
                disabled={(date) => date < new Date("1900-01-01")}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {hasActiveFilters && onClear && (
            <Button variant="secondary" onClick={handleClear}>
              <X className="h-4 w-4" />
              {tCommon("buttons.clear")}
            </Button>
          )}
        </div>
      )}

      {activeFilter === "dueDate" && (
        <div className="flex items-center gap-space-md flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full pl-space-md text-left font-normal sm:w-64",
                  !dueDateRange.from && "text-muted-foreground",
                )}
              >
                {dueDateRange.from ? (
                  dueDateRange.from.toLocaleDateString("pt-BR")
                ) : (
                  <span>{t("dates.from")}</span>
                )}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <LazyCalendar
                mode="single"
                selected={dueDateRange.from}
                onSelect={handleDueDateSelect}
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
                  !dueDateRange.to && "text-muted-foreground",
                )}
              >
                {dueDateRange.to ? (
                  dueDateRange.to.toLocaleDateString("pt-BR")
                ) : (
                  <span>{t("dates.to")}</span>
                )}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <LazyCalendar
                mode="single"
                selected={dueDateRange.to}
                onSelect={(date) => {
                  setDueDateRange({ from: dueDateRange.from, to: date });
                  onDueDateRange({ from: dueDateRange.from, to: date });
                }}
                disabled={(date) => date < new Date("1900-01-01")}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {hasActiveFilters && onClear && (
            <Button variant="secondary" onClick={handleClear}>
              <X className="h-4 w-4" />
              {tCommon("buttons.clear")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
