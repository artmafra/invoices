"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import type { useTranslations } from "next-intl";
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

  const [issueDateRange, setIssueDateRange] = useState<DateRange>({});
  const [dueDateRange, setDueDateRange] = useState<DateRange>({});

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
    <>
      {/* STATUS */}
      <SearchBarFilterSelect
        label={"Status da Nota Fiscal"}
        value={statusFilter === "all" ? undefined : statusFilter}
        onValueChange={(v) => onStatusFilterChange(v ?? "all")}
        anyLabel={"Todos"}
        options={[
          { value: "Emitida", label: "Emitida" },
          { value: "Paga", label: "Paga" },
          { value: "Cancelada", label: "Cancelada" },
        ]}
      />

      {/* SUPPLIER CNPJ */}
      <Button
        size="sm"
        variant={activeFilter === "supplierCnpj" ? "default" : "outline"}
        onClick={() => setActiveFilter((f) => (f === "supplierCnpj" ? null : "supplierCnpj"))}
      >
        {"CNPJ do Fornecedor"}
      </Button>

      {/* SERVICE CODE */}
      <Button
        size="sm"
        variant={activeFilter === "serviceCode" ? "default" : "outline"}
        onClick={() => setActiveFilter((f) => (f === "serviceCode" ? null : "serviceCode"))}
      >
        {"Código de Serviço"}
      </Button>

      {/* ISSUE DATE */}
      <Button
        size="sm"
        variant={activeFilter === "issueDate" ? "default" : "outline"}
        onClick={() => setActiveFilter((f) => (f === "issueDate" ? null : "issueDate"))}
      >
        {"Data de Emissão"}
      </Button>

      {/* DUE DATE */}
      <Button
        size="sm"
        variant={activeFilter === "dueDate" ? "default" : "outline"}
        onClick={() => setActiveFilter((f) => (f === "dueDate" ? null : "dueDate"))}
      >
        {"Data de Vencimento"}
      </Button>

      {/* ACTIVE FILTER INPUT */}
      {activeFilter === "supplierCnpj" && (
        <Input
          autoFocus
          placeholder={"Digite o CNPJ do Fornecedor"}
          onChange={(e) => onSupplierCnpjFilter(e.target.value)}
          className="w-full sm:w-64"
        />
      )}

      {activeFilter === "serviceCode" && (
        <Input
          autoFocus
          placeholder={"Digite o Código de Serviço"}
          onChange={(e) => onServiceCodeFilter(e.target.value)}
          className="w-full sm:w-64"
        />
      )}

      {activeFilter === "issueDate" && (
        <div className="flex gap-space-md">
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
        </div>
      )}

      {activeFilter === "dueDate" && (
        <div className="flex gap-space-md">
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
                  <span>{"De"}</span>
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
                  <span>{"Até"}</span>
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
        </div>
      )}
    </>
  );
}
