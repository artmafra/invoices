"use client";

import { useMemo, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DeviceType } from "@/types/sessions/sessions.types";
import { useSessionPermissions } from "@/hooks/admin/use-resource-permissions";
import {
  useAdminSessions,
  useRevokeAllUserSessions,
  useRevokeSession,
} from "@/hooks/admin/use-sessions";
import { useSessionsActions } from "@/hooks/admin/use-sessions-actions";
import { useSessionsDialogs } from "@/hooks/admin/use-sessions-dialogs";
import { useSessionsFilters } from "@/hooks/admin/use-sessions-filters";
import { usePaginationSize } from "@/hooks/use-pagination-size";
import { AdminHeader } from "@/components/admin/admin-header";
import { useShortcut } from "@/components/admin/keyboard-shortcuts-provider";
import { SessionsListView } from "@/components/admin/sessions";
import {
  LazyRevokeAllSessionsDialog,
  LazyRevokeSessionDialog,
} from "@/components/admin/sessions/lazy-sessions-dialogs";
import { SessionsFilters } from "@/components/admin/sessions/sessions-filters";
import { AdminErrorFallback } from "@/components/shared/admin-error-fallback";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { LoadingState } from "@/components/shared/loading-state";
import { LoadingTransition } from "@/components/shared/loading-transition";
import { PageContainer } from "@/components/shared/page-container";
import { PageDescription } from "@/components/shared/page-description";
import { RequirePermission } from "@/components/shared/require-permission";
import { SearchBar } from "@/components/shared/search-bar";
import { Button } from "@/components/ui/button";
import { SidebarInset } from "@/components/ui/sidebar";

export function SessionsPageContent() {
  const permissions = useSessionPermissions();
  const revokeSessionMutation = useRevokeSession();
  const revokeAllUserSessionsMutation = useRevokeAllUserSessions();

  // Translations
  const t = useTranslations("system.sessions");
  const tc = useTranslations("common");

  // Dialog state management
  const dialogState = useSessionsDialogs();
  const {
    dialogs,
    openRevokeSession,
    closeRevokeSession,
    openRevokeAllSessions,
    closeRevokeAllSessions,
  } = dialogState;

  // Actions hook
  const { handleRevokeSession: revokeSession, handleRevokeAllUserSessions: revokeAllUserSessions } =
    useSessionsActions({
      permissions,
      revokeSessionMutation,
      revokeAllUserSessionsMutation,
      onRevokeSuccess: closeRevokeSession,
      onRevokeAllSuccess: closeRevokeAllSessions,
    });

  const {
    filters,
    searchInput,
    animationRef,
    setSearchInput,
    setDeviceTypeFilter,
    setSort,
    setPage,
    clearFilters,
    hasActiveFilters,
  } = useSessionsFilters();

  const limit = usePaginationSize();

  // Sort options with common translations
  const sortOptions = useMemo(
    () => [
      { value: "lastActivityAt", label: tc("table.lastActivity") },
      { value: "createdAt", label: tc("table.createdAt") },
    ],
    [tc],
  );

  const searchRef = useRef<HTMLInputElement>(null);
  useShortcut("focus-search", () => searchRef.current?.focus());

  // Fetch sessions with server-side filtering and pagination
  const { data, isLoading, refetch } = useAdminSessions({
    search: filters.search || undefined,
    deviceType: filters.deviceType as DeviceType | undefined,
    page: filters.page,
    limit,
  });

  const sessions = useMemo(() => data?.sessions || [], [data?.sessions]);

  const handleRevokeSessionClick = () => {
    if (!dialogs.sessionToRevoke) return;
    revokeSession(dialogs.sessionToRevoke.id);
  };

  const handleRevokeAllSessionsClick = async () => {
    if (!dialogs.userToRevokeAll) return;
    await revokeAllUserSessions(dialogs.userToRevokeAll.id);
  };

  // Loading state
  if (permissions.isLoading) {
    return (
      <ErrorBoundary fallback={AdminErrorFallback}>
        <RequirePermission resource="sessions">
          <SidebarInset>
            <AdminHeader title={t("title")} />
            <PageContainer>
              <LoadingState />
            </PageContainer>
          </SidebarInset>
        </RequirePermission>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary fallback={AdminErrorFallback}>
      <SidebarInset>
        <AdminHeader
          title={t("title")}
          actions={
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">{t("refresh")}</span>
            </Button>
          }
        />
        <PageContainer>
          <PageDescription>{t("description")}</PageDescription>
          {/* Search and Filters */}
          <SearchBar
            ref={searchRef}
            searchPlaceholder={t("searchPlaceholder")}
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            sortOptions={sortOptions}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            onSortChange={setSort}
            hasActiveFilters={hasActiveFilters}
            onClear={clearFilters}
          >
            <SessionsFilters
              deviceFilter={filters.deviceType as "desktop" | "mobile" | "tablet" | undefined}
              onDeviceFilterChange={setDeviceTypeFilter}
              t={t}
            />
          </SearchBar>

          <LoadingTransition
            ref={animationRef}
            isLoading={isLoading && sessions.length === 0}
            loadingMessage={tc("loading.sessions")}
          >
            <SessionsListView
              sessions={sessions}
              sessionsData={data}
              page={filters.page}
              limit={limit}
              permissions={permissions}
              hasActiveFilters={hasActiveFilters}
              onPageChange={setPage}
              onRevokeSession={openRevokeSession}
              onRevokeAllSessions={openRevokeAllSessions}
              t={t}
            />

            {/* Revoke Single Session Dialog */}
            <LazyRevokeSessionDialog
              session={dialogs.sessionToRevoke}
              onClose={closeRevokeSession}
              onRevoke={handleRevokeSessionClick}
              isRevoking={revokeSessionMutation.isPending}
              translationNamespace="system.sessions"
              showUserInfo
            />

            {/* Revoke All Sessions Dialog */}
            <LazyRevokeAllSessionsDialog
              open={!!dialogs.userToRevokeAll}
              onClose={closeRevokeAllSessions}
              onRevoke={handleRevokeAllSessionsClick}
              isRevoking={revokeAllUserSessionsMutation.isPending}
              sessionCount={dialogs.userToRevokeAll?.sessionCount || 0}
              translationNamespace="system.sessions"
              targetUserName={dialogs.userToRevokeAll?.name || dialogs.userToRevokeAll?.email}
            />
          </LoadingTransition>
        </PageContainer>
      </SidebarInset>
    </ErrorBoundary>
  );
}
