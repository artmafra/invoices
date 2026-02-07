"use client";

import type { useTranslations } from "next-intl";
import type { ProfileSessionResponse } from "@/types/sessions/sessions.types";
import { SessionCard } from "@/components/admin/sessions/session-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Section, SectionContent } from "@/components/ui/section";

export interface ProfileSessionsListViewProps {
  // Data
  sessions: ProfileSessionResponse[];

  // Current session
  currentSessionId: string | undefined;

  // Filter state
  hasActiveFilters: boolean;

  // Handlers
  onRevokeSession: (session: ProfileSessionResponse) => void;

  // Translations
  t: ReturnType<typeof useTranslations<"profile.sessions">>;
}

/**
 * Presentation component for profile sessions list view
 * Renders session cards for the current user's sessions
 * Used in profile/sessions/page.tsx
 */
export function ProfileSessionsListView({
  sessions,
  currentSessionId,
  hasActiveFilters,
  onRevokeSession,
  t,
}: ProfileSessionsListViewProps) {
  return (
    <Section>
      <SectionContent>
        {sessions.length > 0 ? (
          sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              translationNamespace="profile.sessions"
              isCurrent={session.id === currentSessionId}
              canRevoke={session.id !== currentSessionId}
              onRevoke={() => onRevokeSession(session)}
            />
          ))
        ) : (
          <EmptyState
            title={hasActiveFilters ? t("noSessionsFiltered") : t("noOtherSessions")}
            padding="medium"
          />
        )}
      </SectionContent>
    </Section>
  );
}
