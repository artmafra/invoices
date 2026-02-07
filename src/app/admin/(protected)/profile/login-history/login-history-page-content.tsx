"use client";

import { useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { useLoginHistoryFilters } from "@/hooks/admin/use-login-history-filters";
import { useLoginHistory } from "@/hooks/public/use-login-history";
import { usePaginationSize } from "@/hooks/use-pagination-size";
import { AdminHeader } from "@/components/admin/admin-header";
import { useShortcut } from "@/components/admin/keyboard-shortcuts-provider";
import { LoginHistoryListView } from "@/components/admin/login-history";
import { AdminErrorFallback } from "@/components/shared/admin-error-fallback";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { LoadingTransition } from "@/components/shared/loading-transition";
import { PageContainer } from "@/components/shared/page-container";
import { PageDescription } from "@/components/shared/page-description";
import { SearchBar, SearchBarFilterSelect } from "@/components/shared/search-bar";
import { Section, SectionContent } from "@/components/ui/section";
import { SidebarInset } from "@/components/ui/sidebar";

export function LoginHistoryPageContent() {
  const t = useTranslations("profile.loginHistory");
  const tc = useTranslations("common");

  // Search ref for keyboard shortcut
  const searchRef = useRef<HTMLInputElement>(null);
  useShortcut("focus-search", () => searchRef.current?.focus());

  // Pagination state
  const paginationSize = usePaginationSize();

  // Filters with URL persistence (Finding #9: eliminates dual state)
  const {
    filters,
    searchInput,
    sortOptions,
    animationRef,
    setSearchInput,
    setSuccessFilter,
    setAuthMethodFilter,
    setSort,
    setPage,
    clearFilters,
    hasActiveFilters,
  } = useLoginHistoryFilters();

  // Build query from filter state
  const queryFilters = useMemo(
    () => ({
      page: filters.page,
      limit: paginationSize,
      search: filters.search || undefined,
      success: filters.success,
      authMethod: filters.authMethod,
      sortBy: (filters.sortBy as "createdAt") || "createdAt",
      sortOrder: filters.sortOrder,
    }),
    [
      filters.page,
      filters.success,
      filters.authMethod,
      filters.sortBy,
      filters.sortOrder,
      paginationSize,
      filters.search,
    ],
  );

  const { data, isLoading } = useLoginHistory(queryFilters);

  const entries = data?.data || [];

  return (
    <ErrorBoundary fallback={AdminErrorFallback}>
      <SidebarInset>
        <AdminHeader title={t("title")} />
        <PageContainer>
          <PageDescription>{t("description")}</PageDescription>
          <Section>
            <SectionContent className="space-y-section">
              {/* Search and Filter Bar */}
              <SearchBar
                ref={searchRef}
                searchPlaceholder={t("searchPlaceholder")}
                searchValue={searchInput}
                onSearchChange={setSearchInput}
                hasActiveFilters={hasActiveFilters}
                onClear={clearFilters}
                sortOptions={sortOptions}
                sortBy={filters.sortBy}
                sortOrder={filters.sortOrder}
                onSortChange={setSort}
              >
                <SearchBarFilterSelect
                  label={t("filters.status")}
                  value={filters.success === undefined ? undefined : filters.success.toString()}
                  onValueChange={(v) => setSuccessFilter(v === undefined ? "any" : v)}
                  anyLabel={t("filters.any")}
                  options={[
                    { value: "true", label: t("filters.successful") },
                    { value: "false", label: t("filters.failed") },
                  ]}
                />

                <SearchBarFilterSelect
                  label={t("filters.authMethod")}
                  value={filters.authMethod}
                  onValueChange={(v) => setAuthMethodFilter(v === undefined ? "any" : v)}
                  anyLabel={t("authMethods.any")}
                  options={[
                    { value: "password", label: t("authMethods.password") },
                    { value: "google", label: t("authMethods.google") },
                    { value: "passkey", label: t("authMethods.passkey") },
                  ]}
                />
              </SearchBar>

              <LoadingTransition
                ref={animationRef}
                isLoading={isLoading && entries.length === 0}
                loadingMessage={tc("loading.loginHistory")}
              >
                <LoginHistoryListView
                  entries={entries}
                  historyData={data}
                  page={data?.page || 1}
                  limit={paginationSize}
                  onPageChange={setPage}
                  t={t}
                />
              </LoadingTransition>
            </SectionContent>
          </Section>
        </PageContainer>
      </SidebarInset>
    </ErrorBoundary>
  );
}
