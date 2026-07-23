"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, X } from "lucide-react";
import type { useTranslations } from "next-intl";
import { useTranslations as useT } from "next-intl";
import { formatCnpj } from "@/lib/cnpj-service-code";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";

function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function isValidDateString(s: string): boolean {
  if (s.length < 10) return false;
  const [day, month, year] = s.split("/").map(Number);
  if (!day || !month || !year) return false;
  if (month < 1 || month > 12 || day < 1) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function fromDisplayDate(s: string): Date {
  const [day, month, year] = s.split("/").map(Number);
  return new Date(year, month - 1, day);
}

function toDisplayDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

interface DateTextInputProps {
  placeholder: string;
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
}

function DateTextInput({ placeholder, value, onChange }: DateTextInputProps) {
  const formattedValue = value ? toDisplayDate(value) : "";
  const [text, setText] = useState(formattedValue);
  const [syncedValue, setSyncedValue] = useState(formattedValue);
  if (formattedValue !== syncedValue) {
    setSyncedValue(formattedValue);
    setText(formattedValue);
  }

  return (
    <div className="relative w-full sm:w-40">
      <Input
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          const formatted = next.length >= text.length ? formatDateInput(next) : next;
          setText(formatted);
          if (isValidDateString(formatted)) {
            onChange(fromDisplayDate(formatted));
          } else if (formatted === "") {
            onChange(undefined);
          }
          // enquanto digita (incompleto), não dispara onChange
        }}
        placeholder={placeholder}
        maxLength={10}
        inputMode="numeric"
        className="pl-9"
      />
      <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

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

      {/* ROW 2: issue date inputs */}
      <Collapsible open={issueDateOpen}>
        <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
          <div className="flex flex-wrap items-center gap-space-md pt-space-sm">
            <DateTextInput
              placeholder={t("dates.from")}
              value={issueDateRange.from}
              onChange={(date) => {
                const next = { ...issueDateRange, from: date };
                setIssueDateRange(next);
                onIssueDateRange(next);
              }}
            />
            <DateTextInput
              placeholder={t("dates.to")}
              value={issueDateRange.to}
              onChange={(date) => {
                const next = { ...issueDateRange, to: date };
                setIssueDateRange(next);
                onIssueDateRange(next);
              }}
            />
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
