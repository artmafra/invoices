"use client";

import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { PAGINATION_SIZE_OPTIONS, type PaginationSize } from "@/lib/preferences";
import { generatePaginationItems } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePaginationSizeWithSetter } from "@/hooks/use-pagination-size";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface DataPaginationProps {
  /** Current page number (1-indexed) */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items */
  total: number;
  /** Current page size / items per page */
  limit: PaginationSize;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Whether to show the page size selector (default: true) */
  showPageSize?: boolean;
  /** Whether to show item count "Showing X-Y of Z" (default: true) */
  showItemCount?: boolean;
}

/**
 * Unified pagination component with smart ellipsis, page size selector,
 * and item count display.
 *
 * Features:
 * - Responsive sibling count: 1 on mobile, 2 on tablet+
 * - Always shows first and last page
 * - Smart ellipsis for large page counts
 * - Page size selector that updates device preferences (localStorage)
 * - "Showing X-Y of Z items" display
 *
 * Layout:
 * - Large screens: Single row - status | items/page | pagination (right)
 * - Medium/Small: Two rows - status + items/page on top, pagination below
 */
export function DataPagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  showPageSize = true,
  showItemCount = true,
}: DataPaginationProps) {
  const t = useTranslations("common.pagination");
  const isMobile = useIsMobile();
  const { setPaginationSize } = usePaginationSizeWithSetter();

  // Responsive sibling count: 1 on mobile, 2 on tablet+
  const siblingCount = isMobile ? 1 : 2;

  // Calculate the range of items being shown
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  // Handle page size change - saves to cookie (device-bound preference)
  const handlePageSizeChange = (value: string) => {
    const newSize = Number(value) as PaginationSize;
    setPaginationSize(newSize);
    // Reset to page 1 when page size changes
    onPageChange(1);
  };

  // Don't render if there's only one page and no need to show item count
  if (totalPages <= 1 && !showItemCount) {
    return null;
  }

  const paginationItems = generatePaginationItems(page, totalPages, siblingCount);

  // Only show page size selector when there are multiple pages
  const pageSizeSelector = showPageSize && totalPages > 1 && (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">{t("options")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-space-md" align="end">
        <label className="mb-space-xs block text-sm font-medium">{t("itemsPerPage")}</label>
        <Select value={String(limit)} onValueChange={handlePageSizeChange}>
          <SelectTrigger size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGINATION_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PopoverContent>
    </Popover>
  );

  const paginationControls = totalPages > 1 && (
    <Pagination className="mx-0 w-full lg:w-auto lg:justify-end">
      <PaginationContent className="w-full justify-between gap-space-xs lg:w-auto lg:justify-center">
        <PaginationItem>
          <PaginationPrevious
            onClick={() => page > 1 && onPageChange(page - 1)}
            className={`pl-0! ${page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
            aria-disabled={page === 1}
          />
        </PaginationItem>

        {paginationItems.map((item, index) => (
          <PaginationItem key={index}>
            {item === "ellipsis" ? (
              <PaginationEllipsis className="w-6" />
            ) : (
              <PaginationLink
                onClick={() => onPageChange(item)}
                isActive={page === item}
                className="cursor-pointer"
              >
                {item}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            onClick={() => page < totalPages && onPageChange(page + 1)}
            className={`pr-0! ${page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
            aria-disabled={page === totalPages}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );

  return (
    <div className="flex flex-col gap-space-md lg:flex-row lg:items-center">
      {/* Status and items/page selector - grouped together */}
      <div className="flex items-center justify-between gap-space-lg lg:justify-start pl-space-xs">
        {showItemCount && total > 0 && (
          <span className="text-sm text-muted-foreground">
            {t("showing", { start: startItem, end: endItem, total })}
          </span>
        )}
        {pageSizeSelector}
      </div>

      {/* Pagination - takes remaining space on large screens */}
      <div className="lg:flex-1">{paginationControls}</div>
    </div>
  );
}
