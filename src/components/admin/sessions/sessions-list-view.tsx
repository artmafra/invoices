"use client";

import { useMemo } from "react";
import { Trash2 } from "lucide-react";
import type { useTranslations } from "next-intl";
import type { UserSessionResponse } from "@/types/sessions/sessions.types";
import { PaginationSize } from "@/lib/preferences";
import type { SessionPermissions } from "@/hooks/admin/use-resource-permissions";
import { SessionCard } from "@/components/admin/sessions/session-card";
import { DataPagination } from "@/components/shared/data-pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Section,
  SectionAction,
  SectionContent,
  SectionDescription,
  SectionHeader,
  SectionTitle,
} from "@/components/ui/section";

type GroupedSession = {
  user: { id: string; name: string | null; email: string };
  sessions: UserSessionResponse[];
};

export interface SessionsListViewProps {
  // Data
  sessions: UserSessionResponse[];
  sessionsData:
    | {
        sessions: UserSessionResponse[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }
    | undefined;

  // Pagination
  page: number;
  limit: PaginationSize;

  // Permissions
  permissions: SessionPermissions;

  // Filter state
  hasActiveFilters: boolean;

  // Handlers
  onPageChange: (page: number) => void;
  onRevokeSession: (session: UserSessionResponse) => void;
  onRevokeAllSessions: (user: {
    id: string;
    name: string | null;
    email: string;
    sessionCount: number;
  }) => void;

  // Translations
  t: ReturnType<typeof useTranslations<"system.sessions">>;
}

/**
 * Presentation component for sessions list view with user grouping
 * Renders session cards grouped by user, pagination, and empty states
 * Used in system/sessions/page.tsx
 */
export function SessionsListView({
  sessions,
  sessionsData,
  page,
  limit,
  permissions,
  hasActiveFilters,
  onPageChange,
  onRevokeSession,
  onRevokeAllSessions,
  t,
}: SessionsListViewProps) {
  // Group sessions by user
  const groupedSessions = useMemo(() => {
    const grouped = new Map<string, GroupedSession>();

    for (const session of sessions) {
      if (!grouped.has(session.userId)) {
        grouped.set(session.userId, {
          user: { id: session.userId, name: session.userName, email: session.userEmail },
          sessions: [],
        });
      }
      grouped.get(session.userId)!.sessions.push(session);
    }

    return Array.from(grouped.values());
  }, [sessions]);

  return (
    <>
      {/* Session Sections by User */}
      {groupedSessions.length > 0 ? (
        <div className="flex flex-col gap-section">
          {groupedSessions.map(({ user, sessions: userSessions }) => (
            <Section key={user.id}>
              <SectionHeader>
                <div>
                  <div className="flex items-center gap-space-sm flex-wrap">
                    <SectionTitle className="text-base">
                      {user.name || t("unknownUser")}
                    </SectionTitle>
                    <Badge variant="secondary">
                      {t("sessionCount", { count: userSessions.length })}
                    </Badge>
                  </div>
                  <SectionDescription className="truncate">{user.email}</SectionDescription>
                </div>
                {permissions.canRevoke && userSessions.length > 1 && (
                  <SectionAction>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        onRevokeAllSessions({
                          ...user,
                          sessionCount: userSessions.length,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {t("revokeAll", { count: userSessions.length })}
                      </span>
                    </Button>
                  </SectionAction>
                )}
              </SectionHeader>
              <SectionContent>
                {userSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    translationNamespace="system.sessions"
                    canRevoke={permissions.canRevoke}
                    onRevoke={() => onRevokeSession(session)}
                  />
                ))}
              </SectionContent>
            </Section>
          ))}
        </div>
      ) : (
        <EmptyState title={hasActiveFilters ? t("noSessionsFiltered") : t("noSessions")} />
      )}

      {/* Pagination */}
      {sessionsData && (
        <DataPagination
          page={page}
          totalPages={sessionsData.totalPages}
          total={sessionsData.total}
          limit={limit}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
}
