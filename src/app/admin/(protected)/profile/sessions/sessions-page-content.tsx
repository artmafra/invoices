"use client";

import { useMemo, useRef, useState } from "react";
import { useSessionContext } from "@/contexts/session-context";
import { useTranslations } from "next-intl";
import type { ProfileSessionResponse } from "@/types/sessions/sessions.types";
import { useSessionsFilters } from "@/hooks/admin/use-sessions-filters";
import {
  useRevokeAllOtherSessions,
  useRevokeUserSession,
  useUserSessions,
} from "@/hooks/public/use-user-sessions";
import { AdminHeader } from "@/components/admin/admin-header";
import { useShortcut } from "@/components/admin/keyboard-shortcuts-provider";
import {
  ProfileSessionsListView,
  RevokeAllSessionsDialog,
  RevokeSessionDialog,
} from "@/components/admin/sessions";
import { AdminErrorFallback } from "@/components/shared/admin-error-fallback";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { LoadingTransition } from "@/components/shared/loading-transition";
import { PageContainer } from "@/components/shared/page-container";
import { PageDescription } from "@/components/shared/page-description";
import { SearchBar, SearchBarFilterSelect } from "@/components/shared/search-bar";
import { Section, SectionContent } from "@/components/ui/section";
import { SidebarInset } from "@/components/ui/sidebar";

export function ProfileSessionsPageContent() {
  const t = useTranslations("profile.sessions");
  const tc = useTranslations("common");
  const { session: authSession } = useSessionContext();

  // Search ref for keyboard shortcut
  const searchRef = useRef<HTMLInputElement>(null);
  useShortcut("focus-search", () => searchRef.current?.focus());

  // Filters with URL persistence (Finding #9: eliminates dual state)
  const {
    filters,
    searchInput,
    animationRef,
    setSearchInput,
    setDeviceTypeFilter,
    setSort,
    clearFilters,
    hasActiveFilters,
  } = useSessionsFilters();

  // Sort options with profile.sessions translations
  const sortOptions = useMemo(
    () => [
      { value: "lastActivityAt", label: t("sorting.lastActivityAt") },
      { value: "createdAt", label: t("sorting.createdAt") },
    ],
    [t],
  );

  // Build query from filter state
  const queryFilters = useMemo(
    () => ({
      search: filters.search || undefined,
      deviceType: (filters.deviceType as "desktop" | "mobile" | "tablet") || undefined,
      sortBy: (filters.sortBy as "lastActivityAt" | "createdAt") || "lastActivityAt",
      sortOrder: filters.sortOrder,
    }),
    [filters.search, filters.deviceType, filters.sortBy, filters.sortOrder],
  );

  // Fetch user's sessions
  const { data, isLoading } = useUserSessions(queryFilters);
  const revokeSession = useRevokeUserSession();
  const revokeAllOther = useRevokeAllOtherSessions();

  // Dialog states
  const [sessionToRevoke, setSessionToRevoke] = useState<ProfileSessionResponse | null>(null);
  const [showRevokeAllDialog, setShowRevokeAllDialog] = useState(false);

  const sessions = data?.sessions || [];

  const handleRevokeSession = () => {
    if (!sessionToRevoke) return;

    // Close dialog immediately for instant feedback
    setSessionToRevoke(null);

    // Fire mutation (optimistic update removes session immediately)
    revokeSession.mutate(sessionToRevoke.id);
  };

  const handleRevokeAllOther = () => {
    if (!authSession?.sessionId) return;

    // Close dialog immediately for instant feedback
    setShowRevokeAllDialog(false);

    // Fire mutation (optimistic update keeps only current session)
    revokeAllOther.mutate(authSession.sessionId);
  };

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
                  label={t("filters.deviceType")}
                  value={filters.deviceType}
                  onValueChange={(v) => setDeviceTypeFilter(v === undefined ? "any" : v)}
                  anyLabel={t("filters.any")}
                  options={[
                    { value: "desktop", label: t("deviceTypes.desktop") },
                    { value: "mobile", label: t("deviceTypes.mobile") },
                    { value: "tablet", label: t("deviceTypes.tablet") },
                  ]}
                />
              </SearchBar>

              <LoadingTransition
                ref={animationRef}
                isLoading={isLoading && sessions.length === 0}
                loadingMessage={tc("loading.sessions")}
              >
                <ProfileSessionsListView
                  sessions={sessions}
                  currentSessionId={authSession?.sessionId}
                  hasActiveFilters={hasActiveFilters}
                  onRevokeSession={setSessionToRevoke}
                  t={t}
                />
              </LoadingTransition>
            </SectionContent>
          </Section>

          {/* Revoke Single Session Dialog */}
          <RevokeSessionDialog
            session={sessionToRevoke}
            onClose={() => setSessionToRevoke(null)}
            onRevoke={handleRevokeSession}
            isRevoking={revokeSession.isPending}
            translationNamespace="profile.sessions"
          />

          {/* Revoke All Other Sessions Dialog */}
          <RevokeAllSessionsDialog
            open={showRevokeAllDialog}
            onClose={() => setShowRevokeAllDialog(false)}
            onRevoke={handleRevokeAllOther}
            isRevoking={revokeAllOther.isPending}
            sessionCount={sessions.length - 1}
            translationNamespace="profile.sessions"
          />
        </PageContainer>
      </SidebarInset>
    </ErrorBoundary>
  );
}
