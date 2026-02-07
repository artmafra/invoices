"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Loader2, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionFromUrl } from "@/hooks/admin/use-action-from-url";
import { useTaskListPermissions } from "@/hooks/admin/use-resource-permissions";
import {
  useCreateTaskList,
  useDeleteTaskList,
  useTaskLists,
  useUpdateTaskList,
  type TaskListWithCount,
} from "@/hooks/admin/use-tasks";
import { useDebounce } from "@/hooks/use-debounce";
import { AdminHeader } from "@/components/admin/admin-header";
import { useShortcut } from "@/components/admin/keyboard-shortcuts-provider";
import { AdminErrorFallback } from "@/components/shared/admin-error-fallback";
import { ColorPicker } from "@/components/shared/color-picker";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { LoadingTransition } from "@/components/shared/loading-transition";
import { PageContainer } from "@/components/shared/page-container";
import { PageDescription } from "@/components/shared/page-description";
import { RequirePermission } from "@/components/shared/require-permission";
import { SearchBar } from "@/components/shared/search-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidebarInset } from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";

const TASK_LIST_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#6b7280", // gray
];

interface ListFormData {
  name: string;
  description: string;
  color: string;
}

function TaskListCard({
  list,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  t,
  tc,
}: {
  list: TaskListWithCount;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
  canDelete: boolean;
  t: ReturnType<typeof useTranslations<"system.taskLists">>;
  tc: ReturnType<typeof useTranslations<"common">>;
}) {
  const showDropdown = canEdit || canDelete;

  return (
    <Card>
      <CardHeader className="pb-space-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-space-sm">
            {list.color && (
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: list.color }} />
            )}
            <CardTitle>{list.name}</CardTitle>
          </div>
          {showDropdown && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onClick={onEdit}>{tc("buttons.edit")}</DropdownMenuItem>
                )}
                {canEdit && canDelete && <DropdownMenuSeparator />}
                {canDelete && (
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                    {tc("buttons.delete")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {list.description && (
          <CardDescription className="line-clamp-2">{list.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">{t("taskCount", { count: list.taskCount })}</p>
      </CardContent>
    </Card>
  );
}

export default function TaskListsPage() {
  return (
    <RequirePermission resource="tasks">
      <ErrorBoundary fallback={AdminErrorFallback}>
        <TaskListsPageContent />
      </ErrorBoundary>
    </RequirePermission>
  );
}

function TaskListsPageContent() {
  // Permissions
  const { canCreate, canEdit, canDelete } = useTaskListPermissions();

  // Translations
  const t = useTranslations("system.taskLists");
  const tc = useTranslations("common");

  const searchRef = useRef<HTMLInputElement>(null);
  useShortcut("focus-search", () => searchRef.current?.focus());

  const { data: lists, isLoading } = useTaskLists();
  const createList = useCreateTaskList();
  const updateList = useUpdateTaskList();
  const deleteList = useDeleteTaskList();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingList, setEditingList] = useState<TaskListWithCount | null>(null);
  const [deleteListId, setDeleteListId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ListFormData>({
    name: "",
    description: "",
    color: "",
  });

  const resetForm = useCallback(() => {
    setFormData({ name: "", description: "", color: "" });
    setEditingList(null);
  }, []);

  const handleOpenCreate = useCallback(() => {
    resetForm();
    setShowFormDialog(true);
  }, [resetForm]);

  const handleOpenEdit = useCallback((list: TaskListWithCount) => {
    setEditingList(list);
    setFormData({
      name: list.name,
      description: list.description || "",
      color: list.color || "",
    });
    setShowFormDialog(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowFormDialog(false);
    resetForm();
  }, [resetForm]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name.trim()) return;

      if (editingList) {
        // Close form immediately for instant feedback
        handleCloseForm();

        // Fire mutation (optimistic update handles the rest)
        updateList.mutate({
          listId: editingList.id,
          data: {
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            color: formData.color || null,
          },
        });
      } else {
        // Create operations still need await (server generates ID)
        createList
          .mutateAsync({
            name: formData.name.trim(),
            description: formData.description.trim() || undefined,
            color: formData.color || undefined,
          })
          .then(() => {
            handleCloseForm();
          })
          .catch(() => {
            // Error handled by mutation
          });
      }
    },
    [formData, editingList, createList, updateList, handleCloseForm],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteListId) return;
    try {
      await deleteList.mutateAsync(deleteListId);
      setDeleteListId(null);
    } catch {
      // Error handled by mutation
    }
  }, [deleteListId, deleteList]);

  const filteredLists = useMemo(() => {
    if (!lists) return [];
    if (!debouncedSearch) return lists;

    const searchLower = debouncedSearch.toLowerCase();
    return lists.filter(
      (list) =>
        list.name.toLowerCase().includes(searchLower) ||
        list.description?.toLowerCase().includes(searchLower),
    );
  }, [lists, debouncedSearch]);

  const isSaving = createList.isPending || updateList.isPending;

  // Handle action from URL (e.g., from command palette)
  useActionFromUrl("create", handleOpenCreate);

  return (
    <SidebarInset>
      <AdminHeader
        title={t("title")}
        actions={
          canCreate && (
            <Button size="sm" variant="outline" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t("new")}</span>
            </Button>
          )
        }
      />
      <PageContainer>
        <PageDescription>{t("description")}</PageDescription>
        <div className="space-y-section">
          {/* Search */}
          <SearchBar
            ref={searchRef}
            searchPlaceholder={t("searchPlaceholder")}
            searchValue={search}
            onSearchChange={setSearch}
          />

          <LoadingTransition isLoading={isLoading && !lists} loadingMessage={tc("loading.default")}>
            {filteredLists?.length === 0 ? (
              <EmptyState
                title={search ? t("noListsFiltered") : t("noLists")}
                action={{
                  label: t("createList"),
                  onClick: handleOpenCreate,
                  icon: Plus,
                }}
                showAction={!search && canCreate}
              />
            ) : (
              <div className="grid gap-space-lg sm:grid-cols-2 lg:grid-cols-3">
                {filteredLists?.map((list) => (
                  <TaskListCard
                    key={list.id}
                    list={list}
                    onEdit={() => handleOpenEdit(list)}
                    onDelete={() => setDeleteListId(list.id)}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    t={t}
                    tc={tc}
                  />
                ))}
              </div>
            )}
          </LoadingTransition>
        </div>
      </PageContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={showFormDialog} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingList ? t("editTitle") : t("createTitle")}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <DialogDescription>
              {editingList ? t("editDescription") : t("createDescription")}
            </DialogDescription>
            <form id="task-list-form" onSubmit={handleSubmit}>
              <div className="space-y-space-lg">
                <div className="space-y-space-sm">
                  <Label htmlFor="name">{t("form.name")}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder={t("form.namePlaceholder")}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-space-sm">
                  <Label htmlFor="description">{t("form.description")}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder={t("form.descriptionPlaceholder")}
                    rows={2}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-space-sm">
                  <Label>{t("form.color")}</Label>
                  <ColorPicker
                    value={formData.color || null}
                    onChange={(color) => setFormData((prev) => ({ ...prev, color: color || "" }))}
                    colors={TASK_LIST_COLORS}
                    disabled={isSaving}
                  />
                </div>
              </div>
            </form>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseForm} disabled={isSaving}>
              {tc("buttons.cancel")}
            </Button>
            <Button
              type="submit"
              form="task-list-form"
              disabled={!formData.name.trim() || isSaving}
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingList ? t("saveChanges") : t("createList")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteListId} onOpenChange={(open) => !open && setDeleteListId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <DialogDescription>{t("deleteDescription")}</DialogDescription>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteListId(null)}>
              {tc("buttons.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteList.isPending}>
              {deleteList.isPending ? t("deleting") : tc("buttons.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarInset>
  );
}
