"use client";

import type { TaskStatus } from "@/schema/tasks.schema";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { PaginationSize } from "@/lib/preferences";
import type { TaskPermissions } from "@/hooks/admin/use-resource-permissions";
import type { TaskWithRelations } from "@/hooks/admin/use-tasks";
import { TaskCard } from "@/components/admin/tasks/task-card";
import { DataPagination } from "@/components/shared/data-pagination";
import { EmptyState } from "@/components/shared/empty-state";

export interface TasksListViewProps {
  // Data
  tasks: TaskWithRelations[];
  tasksData:
    | {
        data: TaskWithRelations[];
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
  permissions: TaskPermissions & { currentUserId: string | undefined; isLoading: boolean };

  // Filter state
  hasActiveFilters: boolean;
  showOverdueOnly: boolean;

  // Mutation states (for future use)
  _isUpdating?: boolean;
  _isDeleting?: boolean;

  // Handlers
  onPageChange: (page: number) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onCreate: () => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

/**
 * Presentation component for tasks list view
 * Renders task cards, pagination, and empty states
 */
export function TasksListView({
  tasks,
  tasksData,
  page,
  limit,
  permissions,
  hasActiveFilters,
  showOverdueOnly,
  _isUpdating,
  _isDeleting,
  onPageChange,
  onStatusChange,
  onCreate,
  onEdit,
  onDelete,
}: TasksListViewProps) {
  const t = useTranslations("apps/tasks");

  // Filter for overdue tasks if needed
  const filteredTasks = tasks.filter((task) => {
    if (!showOverdueOnly) return true;
    return task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";
  });

  return (
    <>
      {/* Task Cards */}
      {filteredTasks.length > 0 ? (
        <div className="space-y-space-md">
          <div className="flex flex-col gap-space-md">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                canEdit={permissions.canEdit}
                canDelete={permissions.canDelete}
                onStatusChange={onStatusChange}
                onEdit={() => onEdit(task.id)}
                onDelete={() => onDelete(task.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          title={
            hasActiveFilters || showOverdueOnly ? t("empty.noFilterResults") : t("empty.noTasks")
          }
          action={{
            label: t("createButton"),
            onClick: onCreate,
            icon: Plus,
          }}
          showAction={!hasActiveFilters && !showOverdueOnly && permissions.canCreate}
        />
      )}

      {/* Pagination */}
      {tasksData && (
        <DataPagination
          page={page}
          totalPages={tasksData.totalPages}
          total={tasksData.total}
          limit={limit}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
}
