"use client";

import { useMemo, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import type { AdminUserResponse } from "@/types/users/users.types";
import { useActivity, useActivityFilterOptions } from "@/hooks/admin/use-activity";
import { useActivityFilters } from "@/hooks/admin/use-activity-filters";
import { useActivityPermissions } from "@/hooks/admin/use-resource-permissions";
import { useUsers } from "@/hooks/admin/use-users";
import { useDateFormat } from "@/hooks/use-date-format";
import { usePaginationSize } from "@/hooks/use-pagination-size";
import { ActivityListView } from "@/components/admin/activity/activity-list-view";
import { VerifyIntegrityDialog } from "@/components/admin/activity/verify-integrity-dialog";
import { AdminHeader } from "@/components/admin/admin-header";
import { useShortcut } from "@/components/admin/keyboard-shortcuts-provider";
import { AdminErrorFallback } from "@/components/shared/admin-error-fallback";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { LoadingTransition } from "@/components/shared/loading-transition";
import { PageContainer } from "@/components/shared/page-container";
import { PageDescription } from "@/components/shared/page-description";
import {
  SearchBar,
  SearchBarFilterDate,
  SearchBarFilterSelect,
} from "@/components/shared/search-bar";
import { Button } from "@/components/ui/button";
import { SidebarInset } from "@/components/ui/sidebar";

export function AdminActivityPageContent() {
  // Search ref for keyboard shortcut
  const searchRef = useRef<HTMLInputElement>(null);
  useShortcut("focus-search", () => searchRef.current?.focus());

  const { formatDate, presets } = useDateFormat();

  // Translations
  const t = useTranslations("system.activity");
  const tc = useTranslations("common");

  // Permissions
  const permissions = useActivityPermissions();
  const canVerify = permissions.canVerify;

  // Verify dialog state
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);

  // Filters with URL persistence (Finding #9: eliminates dual state)
  const {
    filters,
    searchInput,
    animationRef,
    setSearchInput,
    setUserIdFilter,
    setActionFilter,
    setResourceFilter,
    setStartDateFilter,
    setEndDateFilter,
    setPage,
    clearFilters,
    hasActiveFilters,
  } = useActivityFilters();

  const limit = usePaginationSize();

  // Set end date to end of day (23:59:59.999) to include all logs from that day
  const endDateIso = filters.endDate
    ? new Date(
        filters.endDate.getFullYear(),
        filters.endDate.getMonth(),
        filters.endDate.getDate(),
        23,
        59,
        59,
        999,
      ).toISOString()
    : undefined;

  // Data hooks
  const { data: activityData, isLoading } = useActivity({
    page: filters.page,
    limit,
    userId: filters.userId,
    action: filters.action,
    resource: filters.resource,
    startDate: filters.startDate?.toISOString(),
    endDate: endDateIso,
    search: filters.search || undefined,
  });

  const { data: filterOptions } = useActivityFilterOptions();
  const { data: usersData } = useUsers();
  const users = usersData?.users ?? [];

  const logs = useMemo(() => activityData?.data || [], [activityData?.data]);

  return (
    <ErrorBoundary fallback={AdminErrorFallback}>
      <SidebarInset>
        <AdminHeader
          title={t("title")}
          actions={
            <div className="flex items-center gap-space-sm">
              {canVerify && (
                <Button onClick={() => setVerifyDialogOpen(true)} size="sm" variant="outline">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("verifyButton")}</span>
                </Button>
              )}
            </div>
          }
        />

        {/* Verify Integrity Dialog */}
        <VerifyIntegrityDialog
          open={verifyDialogOpen}
          onOpenChange={setVerifyDialogOpen}
          permissions={permissions}
        />

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
              label={t("filters.user")}
              value={filters.userId}
              onValueChange={setUserIdFilter}
              anyLabel={t("filters.any")}
              options={users.map((user: AdminUserResponse) => ({
                value: user.id,
                label: user.name || user.email,
              }))}
            />

            <SearchBarFilterSelect
              label={t("filters.action")}
              value={filters.action}
              onValueChange={setActionFilter}
              anyLabel={t("filters.any")}
              options={
                filterOptions?.actions?.map((a) => ({
                  value: a,
                  label: a,
                })) || []
              }
            />

            <SearchBarFilterSelect
              label={t("filters.resource")}
              value={filters.resource}
              onValueChange={setResourceFilter}
              anyLabel={t("filters.any")}
              options={
                filterOptions?.resources?.map((r) => ({
                  value: r,
                  label: r.charAt(0).toUpperCase() + r.slice(1),
                })) || []
              }
            />

            <SearchBarFilterDate
              label={t("filters.startDate")}
              value={filters.startDate}
              onValueChange={setStartDateFilter}
              placeholder={t("filters.any")}
              formatDate={(date) => formatDate(date, presets.monthDay)}
              disabled={{ after: filters.endDate || new Date() }}
            />

            <SearchBarFilterDate
              label={t("filters.endDate")}
              value={filters.endDate}
              onValueChange={setEndDateFilter}
              placeholder={t("filters.any")}
              formatDate={(date) => formatDate(date, presets.monthDay)}
              disabled={{ before: filters.startDate, after: new Date() }}
            />
          </SearchBar>

          {/* Activity List */}
          <LoadingTransition
            ref={animationRef}
            isLoading={isLoading}
            loadingMessage={tc("loading.data")}
          >
            <ActivityListView
              logs={logs}
              activityData={activityData}
              page={filters.page}
              limit={limit}
              hasActiveFilters={hasActiveFilters}
              onPageChange={setPage}
              t={t}
            />
          </LoadingTransition>
        </PageContainer>
      </SidebarInset>
    </ErrorBoundary>
  );
}
