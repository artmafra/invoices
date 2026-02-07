"use client";

import { forwardRef, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarIcon,
  Check,
  Filter,
  Search,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { Matcher } from "react-day-picker";
import { LazyCalendar } from "@/components/shared/lazy-calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface SearchBarSortOption {
  value: string;
  label: string;
}

export type SortOrder = "asc" | "desc";

interface SearchBarProps {
  /** Placeholder text for the search input */
  searchPlaceholder?: string;
  /** Current search value */
  searchValue: string;
  /** Callback when search value changes */
  onSearchChange: (value: string) => void;
  /** Filter components to render in the collapsible filter area */
  children?: ReactNode;
  /** Whether there are any active filters (including search) */
  hasActiveFilters?: boolean;
  /** Callback to clear all filters */
  onClear?: () => void;
  /** Whether to show the filter toggle button (default: true if children provided) */
  showFilterToggle?: boolean;
  /** Available sort options */
  sortOptions?: SearchBarSortOption[];
  /** Current sort field */
  sortBy?: string;
  /** Current sort order */
  sortOrder?: SortOrder;
  /** Callback when sort changes */
  onSortChange?: (sortBy: string, sortOrder: SortOrder) => void;
}

/**
 * Reusable search and filter bar component for admin pages.
 * Provides a consistent search bar with optional collapsible filters.
 *
 * Supports ref forwarding to focus the search input programmatically.
 * Use with useShortcut("focus-search", () => ref.current?.focus())
 */
export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar(
  {
    searchPlaceholder,
    searchValue,
    onSearchChange,
    children,
    hasActiveFilters = false,
    onClear,
    showFilterToggle,
    sortOptions,
    sortBy,
    sortOrder = "desc",
    onSortChange,
  },
  ref,
) {
  const t = useTranslations("common.buttons");
  const [showFilters, setShowFilters] = useState(false);
  const hasFilters = showFilterToggle ?? !!children;
  const hasSorting = sortOptions && sortOptions.length > 0 && onSortChange;
  const placeholder = searchPlaceholder ?? t("searchPlaceholder");

  const handleSortFieldChange = (value: string) => {
    onSortChange?.(value, sortOrder);
  };

  const handleSortOrderChange = (order: SortOrder) => {
    if (sortBy) {
      onSortChange?.(sortBy, order);
    }
  };

  return (
    <Card>
      <CardContent>
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <div className="flex flex-col">
            {/* Search Bar */}
            <div className="flex gap-space-sm">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={ref}
                  placeholder={placeholder}
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  // eslint-disable-next-line no-restricted-syntax
                  className="pl-10"
                  aria-label={placeholder}
                />
              </div>
              {hasSorting && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <ArrowUpDown className="h-4 w-4" />
                      <span className="hidden sm:inline">{t("sort")}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>{t("sorting")}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={sortBy} onValueChange={handleSortFieldChange}>
                      {sortOptions.map((option) => (
                        <DropdownMenuRadioItem key={option.value} value={option.value}>
                          {option.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleSortOrderChange("asc")}
                      className="flex items-center justify-between"
                    >
                      <span className="flex items-center gap-space-sm">
                        <ArrowUp className="h-4 w-4" />
                        {t("sortAscending")}
                      </span>
                      {sortOrder === "asc" && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleSortOrderChange("desc")}
                      className="flex items-center justify-between"
                    >
                      <span className="flex items-center gap-space-sm">
                        <ArrowDown className="h-4 w-4" />
                        {t("sortDescending")}
                      </span>
                      {sortOrder === "desc" && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {hasFilters && (
                <CollapsibleTrigger asChild>
                  <Button variant="outline">
                    <Filter className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("filters")}</span>
                  </Button>
                </CollapsibleTrigger>
              )}
            </div>

            {/* Filters */}
            {hasFilters && (
              <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
                <div className="flex flex-wrap flex-col sm:flex-row sm:items-end gap-space-md pt-space-lg border-t mt-card">
                  {children}

                  {hasActiveFilters && onClear && (
                    <Button variant="secondary" onClick={onClear}>
                      <X className="h-4 w-4" />
                      {t("clear")}
                    </Button>
                  )}
                </div>
              </CollapsibleContent>
            )}
          </div>
        </Collapsible>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// Filter Components
// ============================================================================

export interface SearchBarSelectOption {
  value: string;
  label: string | ReactNode;
}

interface SearchBarFilterSelectProps {
  /** Label for the filter */
  label: string;
  /** Current value (or "any" if no selection) */
  value: string | undefined;
  /** Callback when value changes (undefined for "any") */
  onValueChange: (value: string | undefined) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Label for "any" option */
  anyLabel?: string;
  /** Available options */
  options: SearchBarSelectOption[];
}

/**
 * Reusable select filter component with consistent styling and density support.
 * Uses density-aware spacing tokens and standard filter layout.
 */
export function SearchBarFilterSelect({
  label,
  value,
  onValueChange,
  placeholder,
  anyLabel = "Any",
  options,
}: SearchBarFilterSelectProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-space-sm)" }}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select
        value={value || "any"}
        onValueChange={(v) => onValueChange(v === "any" ? undefined : v)}
      >
        <SelectTrigger className="w-full sm:min-w-40">
          <SelectValue placeholder={placeholder ?? label} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">{anyLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface SearchBarFilterDateProps {
  /** Label for the filter */
  label: string;
  /** Current date value */
  value: Date | undefined;
  /** Callback when date changes */
  onValueChange: (date: Date | undefined) => void;
  /** Placeholder text when no date selected */
  placeholder?: string;
  /** Function to format the date for display */
  formatDate?: (date: Date) => string;
  /** Disabled dates matcher */
  disabled?: Matcher | Matcher[];
}

/**
 * Reusable date filter component with consistent styling and density support.
 * Uses density-aware spacing tokens and standard filter layout.
 */
export function SearchBarFilterDate({
  label,
  value,
  onValueChange,
  placeholder = "Any",
  formatDate,
  disabled,
}: SearchBarFilterDateProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-space-sm)" }}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="select" className="w-full sm:min-w-40 justify-between">
            <span className="truncate">
              {value && formatDate ? formatDate(value) : placeholder}
            </span>
            <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <LazyCalendar
            mode="single"
            selected={value}
            onSelect={onValueChange}
            disabled={disabled}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
