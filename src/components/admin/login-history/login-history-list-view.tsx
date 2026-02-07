"use client";

import type { useTranslations } from "next-intl";
import type { LoginHistoryResponse } from "@/types/auth/login-history.types";
import { PaginationSize } from "@/lib/preferences";
import { LoginHistoryCard } from "@/components/admin/login-history/login-history-card";
import { DataPagination } from "@/components/shared/data-pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { Section, SectionContent } from "@/components/ui/section";

export interface LoginHistoryListViewProps {
  // Data
  entries: LoginHistoryResponse[];
  historyData:
    | {
        data: LoginHistoryResponse[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }
    | undefined;

  // Pagination
  page: number;
  limit: PaginationSize;

  // Handlers
  onPageChange: (page: number) => void;

  // Translations
  t: ReturnType<typeof useTranslations<"profile.loginHistory">>;
}

/**
 * Presentation component for login history list view
 * Renders login history cards, pagination, and empty states
 * Used in profile/login-history/page.tsx
 */
export function LoginHistoryListView({
  entries,
  historyData,
  page,
  limit,
  onPageChange,
  t,
}: LoginHistoryListViewProps) {
  return (
    <>
      {/* Login History List */}
      <Section>
        <SectionContent>
          {entries.length > 0 ? (
            entries.map((entry) => <LoginHistoryCard key={entry.id} entry={entry} />)
          ) : (
            <EmptyState title={t("noHistory")} padding="medium" />
          )}
        </SectionContent>
      </Section>

      {/* Pagination */}
      {historyData && historyData.totalPages > 1 && (
        <DataPagination
          page={page}
          totalPages={historyData.totalPages}
          total={historyData.total}
          limit={limit}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
}
