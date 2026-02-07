"use client";

import type { useTranslations } from "next-intl";
import type { ActivityEntry } from "@/types/common/activity.types";
import { PaginationSize } from "@/lib/preferences";
import { ActivityTimelineItem } from "@/components/admin/activity/activity-timeline-item";
import { DataPagination } from "@/components/shared/data-pagination";
import { EmptyState } from "@/components/shared/empty-state";

export interface ActivityListViewProps {
  // Data
  logs: ActivityEntry[];
  activityData:
    | {
        data: ActivityEntry[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }
    | undefined;

  // Pagination
  page: number;
  limit: PaginationSize;

  // Filter state
  hasActiveFilters: boolean;

  // Handlers
  onPageChange: (page: number) => void;

  // Translations
  t: ReturnType<typeof useTranslations<"system.activity">>;
}

/**
 * Presentation component for activity log list view
 * Renders activity timeline items, pagination, and empty states
 * Used in system/activity/page.tsx
 */
export function ActivityListView({
  logs,
  activityData,
  page,
  limit,
  hasActiveFilters,
  onPageChange,
  t,
}: ActivityListViewProps) {
  return (
    <>
      {/* Activity Timeline */}
      {logs.length > 0 ? (
        logs.map((log) => <ActivityTimelineItem key={log.id} log={log} />)
      ) : (
        <EmptyState title={hasActiveFilters ? t("noActivityFiltered") : t("noActivity")} />
      )}

      {/* Pagination */}
      {activityData && (
        <DataPagination
          page={page}
          totalPages={activityData.totalPages}
          total={activityData.total}
          limit={limit}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
}
