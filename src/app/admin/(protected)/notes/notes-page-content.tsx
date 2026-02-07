"use client";

import { useCallback, useRef } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { type CreateNoteInput } from "@/validations/note.validations";
import { useActionFromUrl } from "@/hooks/admin/use-action-from-url";
import {
  useArchiveNote,
  useCreateNote,
  useDeleteNote,
  useNotes,
  useToggleNotePin,
  useUpdateNote,
} from "@/hooks/admin/use-notes";
import { useNotesDialogs } from "@/hooks/admin/use-notes-dialogs";
import { useNotesFilters } from "@/hooks/admin/use-notes-filters";
import { useNotePermissions } from "@/hooks/admin/use-resource-permissions";
import { usePaginationSize } from "@/hooks/use-pagination-size";
import { AdminHeader } from "@/components/admin/admin-header";
import { useShortcut } from "@/components/admin/keyboard-shortcuts-provider";
import { NotesListView } from "@/components/admin/notes";
import { LazyNoteFormDialog } from "@/components/admin/notes/lazy-notes-dialogs";
import { AdminErrorFallback } from "@/components/shared/admin-error-fallback";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { LoadingTransition } from "@/components/shared/loading-transition";
import { PageContainer } from "@/components/shared/page-container";
import { PageDescription } from "@/components/shared/page-description";
import { SearchBar } from "@/components/shared/search-bar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SidebarInset } from "@/components/ui/sidebar";

export function NotesPageContent() {
  const t = useTranslations("apps/notes");
  const tc = useTranslations("common");
  const permissions = useNotePermissions();

  const searchRef = useRef<HTMLInputElement>(null);
  useShortcut("focus-search", () => searchRef.current?.focus());

  // Filters with URL persistence (Finding #9: eliminates dual state)
  const {
    filters,
    searchInput,
    animationRef,
    setSearchInput,
    setPage,
    clearFilters,
    hasActiveFilters,
  } = useNotesFilters(false);

  const limit = usePaginationSize();

  // Dialog state
  const {
    dialogs,
    openCreateDialog,
    openEditDialog,
    closeFormDialog,
    openDeleteConfirm,
    closeDeleteConfirm,
  } = useNotesDialogs();

  // Queries and mutations
  const { data, isLoading } = useNotes(
    { search: filters.search || undefined, isArchived: false },
    filters.page,
    limit,
  );
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const togglePin = useToggleNotePin();
  const archiveNote = useArchiveNote();

  const handleSave = useCallback(
    async (data: CreateNoteInput) => {
      if (dialogs.editingNoteId) {
        await updateNote.mutateAsync({
          noteId: dialogs.editingNoteId,
          data,
        });
      } else {
        await createNote.mutateAsync(data);
      }

      closeFormDialog();
    },
    [dialogs.editingNoteId, createNote, updateNote, closeFormDialog],
  );

  const handleDelete = useCallback(async () => {
    if (!dialogs.deleteNoteId) return;
    await deleteNote.mutateAsync(dialogs.deleteNoteId);
    closeDeleteConfirm();
  }, [dialogs.deleteNoteId, deleteNote, closeDeleteConfirm]);

  const handleTogglePin = useCallback(
    (noteId: string) => {
      togglePin.mutate(noteId);
    },
    [togglePin],
  );

  const handleArchive = useCallback(
    (noteId: string) => {
      archiveNote.mutate(noteId);
    },
    [archiveNote],
  );

  const isSaving = createNote.isPending || updateNote.isPending;

  // Handle action from URL (e.g., from command palette)
  useActionFromUrl("create", openCreateDialog);

  const editingNote = data?.data.find((n) => n.id === dialogs.editingNoteId);
  const initialData: CreateNoteInput | undefined = editingNote
    ? {
        title: editingNote.title,
        content: editingNote.content,
        isPinned: editingNote.isPinned,
        color: editingNote.color || undefined,
        tags: editingNote.tags.map((t) => t.name),
      }
    : undefined;

  return (
    <ErrorBoundary fallback={AdminErrorFallback}>
      <SidebarInset>
        <AdminHeader
          title={t("title")}
          actions={
            permissions.canCreate && (
              <Button size="sm" variant="outline" onClick={openCreateDialog}>
                <Plus className="h-4 w-4" />
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
            />

            <LoadingTransition
              ref={animationRef}
              isLoading={isLoading && !data}
              loadingMessage={tc("loading.notes")}
            >
              <NotesListView
                notes={data?.data || []}
                notesData={data}
                page={filters.page}
                limit={limit}
                permissions={permissions}
                hasActiveFilters={hasActiveFilters}
                onPageChange={setPage}
                onEdit={openEditDialog}
                onDelete={openDeleteConfirm}
                onTogglePin={handleTogglePin}
                onArchive={handleArchive}
                onCreateNote={openCreateDialog}
              />
            </LoadingTransition>
          </div>
        </PageContainer>

        {/* Create/Edit Note Dialog */}
        <LazyNoteFormDialog
          open={dialogs.showFormDialog}
          onOpenChange={(open) => !open && closeFormDialog()}
          initialData={initialData}
          onSubmit={handleSave}
          isEditing={!!dialogs.editingNoteId}
          isSaving={isSaving}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={!!dialogs.deleteNoteId}
          onOpenChange={(open) => !open && closeDeleteConfirm()}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("deleteTitle")}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <DialogDescription>{t("deleteDescription")}</DialogDescription>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={closeDeleteConfirm}>
                {tc("buttons.cancel")}
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleteNote.isPending}>
                {deleteNote.isPending ? tc("buttons.processing") : tc("buttons.delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </ErrorBoundary>
  );
}
