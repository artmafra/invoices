"use client";

import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useServices, type Service } from "@/hooks/admin/use-services";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ServiceSelectProps {
  value: string | null;
  onChange: (serviceCode: string | null) => void;
  onBlur?: () => void;
  onServiceSelect?: (service: Service) => void;
  label?: string;
  placeholder?: string;
  description?: string;
  disabled?: boolean;
  companyId?: string | null;
}

export function ServiceSelect({
  value,
  onChange,
  onBlur: onBlurProp,
  onServiceSelect,
  label,
  placeholder,
  description,
  disabled = false,
  companyId,
}: ServiceSelectProps) {
  const t = useTranslations("common.components.serviceSelect");
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(inputValue, 300);

  // Avoid showing stale results while debounce is pending
  const isSearchPending = inputValue !== debouncedSearch;

  const { data: services, isFetching } = useServices({
    search: debouncedSearch || undefined,
    companyId: companyId ?? undefined,
  });

  const servicesList = services?.data ?? [];
  const showResults = !isSearchPending && !isFetching;

  // Sync input value when the prop value changes from outside
  useEffect(() => {
    if (value) {
      const match = servicesList.find((s) => s.code === value);
      if (match) {
        setInputValue(match.code);
      } else if (inputValue !== value) {
        setInputValue(value);
      }
    } else if (value === null && inputValue === "") {
      setInputValue("");
    }
  }, [value]);

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
    const input = e.target.value;
    setInputValue(input);
    setShowSuggestions(true);
    setSelectedIndex(-1);

    if (input.trim() === "") {
      onChange(null);
    }
  };

  const handleSelectService = (service: Service) => {
    setInputValue(service.code);
    onChange(service.code);
    onServiceSelect?.(service);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleBlur = () => {
    const match = servicesList.find((s) => s.code.toLowerCase() === inputValue.toLowerCase());
    if (match) {
      onChange(match.code);
      onServiceSelect?.(match);
    }
    onBlurProp?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || servicesList.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < servicesList.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && servicesList[selectedIndex]) {
          handleSelectService(servicesList[selectedIndex]);
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
          <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={handleBlur}
            placeholder={placeholder || t("placeholder")}
            disabled={disabled}
            className="pl-10"
          />
        </div>

        {showSuggestions && inputValue && showResults && servicesList.length > 0 && (
          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover shadow-md">
            <div className="p-1">
              {servicesList.map((service, index) => (
                <button
                  key={service.id}
                  type="button"
                  className={cn(
                    "flex w-full cursor-pointer flex-col rounded-sm px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                    index === selectedIndex && "bg-accent text-accent-foreground",
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectService(service);
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="font-medium">{service.code}</span>
                  <span className="text-xs text-muted-foreground">{service.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {showSuggestions &&
          inputValue &&
          showResults &&
          servicesList.length === 0 &&
          debouncedSearch && (
            <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover p-3 shadow-md">
              <p className="text-sm text-muted-foreground">{t("noResults")}</p>
            </div>
          )}
      </div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
