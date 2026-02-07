"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { useAdminSettings, useSettingsCategories } from "@/hooks/admin/use-admin-settings";
import { useSettingsPermissions } from "@/hooks/admin/use-resource-permissions";
import { useSettingsFilters } from "@/hooks/admin/use-settings-filters";
import { AdminHeader } from "@/components/admin/admin-header";
import { useShortcut } from "@/components/admin/keyboard-shortcuts-provider";
import { AdminErrorFallback } from "@/components/shared/admin-error-fallback";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { LoadingTransition } from "@/components/shared/loading-transition";
import { PageContainer } from "@/components/shared/page-container";
import { PageDescription } from "@/components/shared/page-description";
import { SearchBar, SearchBarFilterSelect } from "@/components/shared/search-bar";
import { SidebarInset } from "@/components/ui/sidebar";
import { SettingCard } from "./setting-card";

export function AdminSettingsPageContent() {
  const permissions = useSettingsPermissions();
  const canEdit = permissions.canEdit;

  // Translations
  const t = useTranslations("system.settings");
  const tc = useTranslations("common");

  const searchRef = useRef<HTMLInputElement>(null);
  useShortcut("focus-search", () => searchRef.current?.focus());

  // Filters and search
  const {
    filters,
    searchInput,
    setSearchInput,
    categoryFilter,
    setCategoryFilter,
    clearFilters,
    hasActiveFilters,
    animationRef,
  } = useSettingsFilters();

  // Data fetching
  const { data: settings = [], isLoading } = useAdminSettings({
    category: filters.category,
    search: filters.search || undefined,
  });

  const { data: availableCategories = [] } = useSettingsCategories();

  // Helper to get category name from translations
  const getCategoryName = (category: string): string => {
    const key = `categories.${category}` as const;
    const translated = t.raw(key);
    return typeof translated === "string"
      ? translated
      : category.charAt(0).toUpperCase() + category.slice(1);
  };

  return (
    <ErrorBoundary fallback={AdminErrorFallback}>
      <SidebarInset>
        <AdminHeader title={t("title")} />
        <PageContainer>
          <PageDescription>{t("description")}</PageDescription>
          {/* Search and Filters */}
          <SearchBar
            ref={searchRef}
            searchPlaceholder={t("searchPlaceholder")}
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            hasActiveFilters={hasActiveFilters}
            onClear={clearFilters}
          >
            <SearchBarFilterSelect
              label={t("filters.category")}
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              anyLabel={t("filters.any")}
              options={availableCategories.map((category) => ({
                value: category,
                label: getCategoryName(category),
              }))}
            />
          </SearchBar>

          <LoadingTransition
            ref={animationRef}
            isLoading={isLoading}
            loadingMessage={tc("loading.default")}
          >
            {settings.length === 0 ? (
              <EmptyState
                title={hasActiveFilters ? t("noResults") : t("noSettings")}
                asCard={false}
              />
            ) : (
              settings.map((setting) => (
                <SettingCard key={setting.id} setting={setting} canEdit={canEdit} />
              ))
            )}
          </LoadingTransition>
        </PageContainer>
      </SidebarInset>
    </ErrorBoundary>
  );
}
