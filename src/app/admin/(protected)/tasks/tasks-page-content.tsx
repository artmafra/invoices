"use client";

import { useCallback, useRef } from "react";
import type { TaskStatus } from "@/schema/tasks.schema";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionFromUrl } from "@/hooks/admin/use-action-from-url";
import { useTaskPermissions } from "@/hooks/admin/use-resource-permissions";
import {
  useCreateTask,
  useDeleteTask,
  useTaskLists,
  useTasks,
  useUpdateTask,
} from "@/hooks/admin/use-tasks";
import { useTasksActions } from "@/hooks/admin/use-tasks-actions";
import { useTasksDialogs } from "@/hooks/admin/use-tasks-dialogs";
import { useTasksFilters } from "@/hooks/admin/use-tasks-filters";
import { usePaginationSize } from "@/hooks/use-pagination-size";
import { AdminHeader } from "@/components/admin/admin-header";
import { useShortcut } from "@/components/admin/keyboard-shortcuts-provider";
import {
  LazyTaskDeleteDialog,
  LazyTaskFormDialog,
} from "@/components/admin/tasks/lazy-tasks-dialogs";
import { type TaskFormValues } from "@/components/admin/tasks/task-form-dialog";
import { TasksFilters } from "@/components/admin/tasks/tasks-filters";
import { TasksListView } from "@/components/admin/tasks/tasks-list-view";
import { AdminErrorFallback } from "@/components/shared/admin-error-fallback";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { LoadingTransition } from "@/components/shared/loading-transition";
import { PageContainer } from "@/components/shared/page-container";
import { PageDescription } from "@/components/shared/page-description";
import { SearchBar } from "@/components/shared/search-bar";
import { Button } from "@/components/ui/button";
import { SidebarInset } from "@/components/ui/sidebar";

export function TasksPageContent() {
  const t = useTranslations("apps/tasks");
  const tc = useTranslations("common");
  const permissions = useTaskPermissions();

  const searchRef = useRef<HTMLInputElement>(null);
  useShortcut("focus-search", () => searchRef.current?.focus());

  const limit = usePaginationSize();

  // Filter management with URL persistence
  const {
    filters,
    searchInput,
    animationRef,
    setSearchInput,
    setStatusFilter,
    setShowOverdueOnly,
    setPage,
    clearFilters,
    hasActiveFilters,
  } = useTasksFilters();

  // Dialog state management
  const {
    dialogs,
    openCreateDialog,
    openEditDialog,
    closeFormDialog,
    openDeleteConfirm,
    closeDeleteConfirm,
  } = useTasksDialogs();

  // Data fetching
  const { data: listsData } = useTaskLists();
  const { data, isLoading } = useTasks(
    {
      search: filters.search || undefined,
      status: filters.status !== "all" ? (filters.status as TaskStatus) : undefined,
      includeCompleted: filters.includeCompleted || filters.status === "done",
    },
    filters.page,
    limit,
  );

  // Mutations
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  // Action handlers
  const actions = useTasksActions({
    permissions,
    createMutation: createTask,
    updateMutation: updateTask,
    deleteMutation: deleteTask,
    onCreateSuccess: closeFormDialog,
    onUpdateSuccess: closeFormDialog,
    onDeleteSuccess: closeDeleteConfirm,
  });

  const handleOpenEdit = useCallback(
    (taskId: string) => {
      const task = data?.data.find((t) => t.id === taskId);
      if (task) {
        openEditDialog(taskId, {
          title: task.title,
          description: task.description || "",
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
          listId: task.listId || null,
          assigneeId: task.assigneeId || null,
          checklistItems: task.checklistItems || [],
        });
      }
    },
    [data?.data, openEditDialog],
  );

  const handleSubmit = useCallback(
    async (data: TaskFormValues) => {
      const taskData = {
        title: data.title.trim(),
        description: data.description?.trim() || undefined,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        listId: data.listId || null,
        assigneeId: data.assigneeId || null,
        checklistItems:
          data.checklistItems && data.checklistItems.length > 0 ? data.checklistItems : undefined,
      };

      if (dialogs.editingTaskId) {
        await actions.handleUpdate({ taskId: dialogs.editingTaskId, data: taskData });
      } else {
        await actions.handleCreate(taskData);
      }
    },
    [dialogs.editingTaskId, actions],
  );

  const handleDelete = useCallback(async () => {
    if (!dialogs.deleteTaskId) return;
    await actions.handleDelete(dialogs.deleteTaskId);
  }, [dialogs.deleteTaskId, actions]);

  // Handle action from URL (e.g., from command palette)
  useActionFromUrl("create", openCreateDialog);

  return (
    <ErrorBoundary fallback={AdminErrorFallback}>
      <SidebarInset>
        <AdminHeader
          title={t("title")}
          actions={
            permissions.canCreate && (
              <Button size="sm" variant="outline" onClick={openCreateDialog}>
                <Plus className="h-4" />
                <span className="hidden sm:inline">{t("new")}</span>
              </Button>
            )
          }
        />
        <PageContainer>
          <PageDescription>{t("description")}</PageDescription>
          <div className="space-y-section">
            {/* Search & Filters */}
            <SearchBar
              ref={searchRef}
              searchPlaceholder={t("searchPlaceholder")}
              searchValue={searchInput}
              onSearchChange={setSearchInput}
              hasActiveFilters={hasActiveFilters}
              onClear={clearFilters}
            >
              <TasksFilters
                statusFilter={filters.status}
                onStatusFilterChange={(value) => setStatusFilter(value)}
                showOverdueOnly={filters.showOverdueOnly}
                onOverdueToggle={() => setShowOverdueOnly(!filters.showOverdueOnly)}
                t={t}
              />
            </SearchBar>

            <LoadingTransition
              ref={animationRef}
              isLoading={isLoading && !data}
              loadingMessage={tc("loading.tasks")}
            >
              <TasksListView
                tasks={data?.data || []}
                tasksData={data}
                page={filters.page}
                limit={limit}
                permissions={permissions}
                hasActiveFilters={hasActiveFilters}
                showOverdueOnly={filters.showOverdueOnly}
                onPageChange={setPage}
                onStatusChange={actions.handleStatusChange}
                onCreate={openCreateDialog}
                onEdit={handleOpenEdit}
                onDelete={openDeleteConfirm}
              />
            </LoadingTransition>
          </div>
        </PageContainer>

        {/* Create/Edit Task Dialog */}
        <LazyTaskFormDialog
          open={dialogs.showFormDialog}
          onOpenChange={(open) => !open && closeFormDialog()}
          initialData={dialogs.initialData}
          onSubmit={handleSubmit}
          isEditing={!!dialogs.editingTaskId}
          isSaving={actions.isCreating || actions.isUpdating}
          lists={listsData || []}
        />

        {/* Delete Confirmation Dialog */}
        <LazyTaskDeleteDialog
          open={!!dialogs.deleteTaskId}
          onOpenChange={(open) => !open && closeDeleteConfirm()}
          onConfirm={handleDelete}
          isPending={actions.isDeleting}
        />
      </SidebarInset>
    </ErrorBoundary>
  );
}
