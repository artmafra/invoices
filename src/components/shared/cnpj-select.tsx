"use client";

import { useEffect, useRef, useState } from "react";
import { Building2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatCnpj } from "@/lib/cnpj-service-code";
import { cn } from "@/lib/utils";
import { useSuppliers } from "@/hooks/admin/use-suppliers";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CnpjSelectProps {
  value: string | null;
  onChange: (cnpj: string | null) => void;
  label?: string;
  placeholder?: string;
  description?: string;
  disabled?: boolean;
}

export function CnpjSelect({
  value,
  onChange,
  label,
  placeholder,
  description,
  disabled = false,
}: CnpjSelectProps) {
  const t = useTranslations("common.components.cnpjSelect");
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(inputValue, 300);

  const { data: suppliers } = useSuppliers({
    search: debouncedSearch || undefined,
  });

  const suppliersList = suppliers ?? [];
  const filteredSuppliers = suppliersList.filter((supplier) => {
    const searchLower = inputValue.toLowerCase();
    return (
      supplier.cnpj.includes(inputValue) ||
      supplier.name.toLowerCase().includes(searchLower) ||
      formatCnpj(supplier.cnpj).includes(inputValue)
    );
  });

  // Sync input value with prop value
  useEffect(() => {
    if (value) {
      const supplier = suppliersList.find((s) => s.cnpj === value);
      if (supplier) {
        setInputValue(formatCnpj(supplier.cnpj));
      }
    } else if (!inputValue) {
      setInputValue("");
    }
  }, [value, suppliersList]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowSuggestions(true);
    setSelectedIndex(-1);

    // If input is empty, clear the selection
    if (!newValue) {
      onChange(null);
    }
  };

  const handleSelectSupplier = (supplier: { cnpj: string; name: string }) => {
    setInputValue(formatCnpj(supplier.cnpj));
    onChange(supplier.cnpj);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredSuppliers.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredSuppliers.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && filteredSuppliers[selectedIndex]) {
          handleSelectSupplier(filteredSuppliers[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div className="space-y-space-sm" ref={containerRef}>
      {label && <Label>{label}</Label>}
      <div className="relative">
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            placeholder={placeholder || t("placeholder")}
            disabled={disabled}
            className="pl-10"
          />
        </div>

        {showSuggestions && inputValue && filteredSuppliers.length > 0 && (
          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover shadow-md">
            <div className="p-1">
              {filteredSuppliers.map((supplier, index) => (
                <button
                  key={supplier.id}
                  type="button"
                  className={cn(
                    "flex w-full cursor-pointer flex-col rounded-sm px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                    index === selectedIndex && "bg-accent text-accent-foreground",
                  )}
                  onClick={() => handleSelectSupplier(supplier)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="font-medium">{supplier.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatCnpj(supplier.cnpj)} • {supplier.city}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {showSuggestions && inputValue && filteredSuppliers.length === 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover p-3 shadow-md">
            <p className="text-sm text-muted-foreground">{t("noResults")}</p>
          </div>
        )}
      </div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
