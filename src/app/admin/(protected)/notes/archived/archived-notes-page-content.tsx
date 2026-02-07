"use client";

import { useTranslations } from "next-intl";
import { type CreateNoteInput } from "@/validations/note.validations";
import {
  useArchiveNote,
  useCreateNote,
  useDeleteNote,
  useNotes,
  useUpdateNote,
} from "@/hooks/admin/use-notes";
import { useNotesDialogs } from "@/hooks/admin/use-notes-dialogs";
import { useNotesFilters } from "@/hooks/admin/use-notes-filters";
import { usePaginationSize } from "@/hooks/use-pagination-size";
import { AdminHeader } from "@/components/admin/admin-header";
import { NotesListView } from "@/components/admin/notes";
import { LazyNoteFormDialog } from "@/components/admin/notes/lazy-notes-dialogs";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorAlert } from "@/components/shared/error-alert";
import { LoadingTransition } from "@/components/shared/loading-transition";
import { PageContainer } from "@/components/shared/page-container";
import { PageDescription } from "@/components/shared/page-description";
import { SearchBar } from "@/components/shared/search-bar";
import { SidebarInset } from "@/components/ui/sidebar";

export function ArchivedNotesPageContent() {
  const t = useTranslations("apps/notes");
  const tc = useTranslations("common");

  // Filters with URL persistence (Finding #9: eliminates dual state)
  const {
    filters,
    searchInput,
    animationRef,
    setSearchInput,
    setPage,
    clearFilters,
    hasActiveFilters,
  } = useNotesFilters(true);

  const limit = usePaginationSize();

  // Dialog state
  const { dialogs, openEditDialog, closeFormDialog, openDeleteConfirm, closeDeleteConfirm } =
    useNotesDialogs();

  // Queries
  const { data, isLoading, error } = useNotes(
    {
      search: filters.search || undefined,
      color: filters.color,
      isArchived: true,
    },
    filters.page,
    limit,
  );

  // Mutations
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const archiveNote = useArchiveNote();

  // Permissions
  const canEdit = true;
  const canDelete = true;

  const handleSave = async (data: CreateNoteInput) => {
    if (dialogs.editingNoteId) {
      await updateNote.mutateAsync({ noteId: dialogs.editingNoteId, data });
    } else {
      await createNote.mutateAsync(data);
    }

    closeFormDialog();
  };

  const handleConfirmDelete = async () => {
    if (dialogs.deleteNoteId) {
      await deleteNote.mutateAsync(dialogs.deleteNoteId);
      closeDeleteConfirm();
    }
  };

  const handleArchive = async (id: string) => {
    await archiveNote.mutateAsync(id);
  };

  const notes = data?.data ?? [];

  const isSaving = createNote.isPending || updateNote.isPending;
  const isDeleting = deleteNote.isPending;

  const permissions = {
    canCreate: false, // Can't create archived notes
    canEdit,
    canDelete,
  };

  const editingNote = notes.find((n) => n.id === dialogs.editingNoteId);
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
    <SidebarInset>
      <AdminHeader title={t("archivedTitle")} />
      <PageContainer>
        <PageDescription>{t("archivedDescription")}</PageDescription>

        <SearchBar
          searchPlaceholder={t("searchPlaceholder")}
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          hasActiveFilters={hasActiveFilters}
          onClear={clearFilters}
        />

        {error && <ErrorAlert message={error.message} />}

        <LoadingTransition
          ref={animationRef}
          isLoading={isLoading && !data}
          loadingMessage={tc("loading.notes")}
        >
          <NotesListView
            notes={notes}
            notesData={data}
            page={filters.page}
            limit={limit}
            permissions={permissions}
            hasActiveFilters={hasActiveFilters}
            isArchived
            onPageChange={setPage}
            onEdit={openEditDialog}
            onDelete={openDeleteConfirm}
            onArchive={handleArchive}
          />
        </LoadingTransition>
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
      <ConfirmDialog
        open={!!dialogs.deleteNoteId}
        onOpenChange={(open) => !open && closeDeleteConfirm()}
        onConfirm={handleConfirmDelete}
        title={t("deleteTitle")}
        description={t("deleteDescription")}
        confirmText={tc("buttons.delete")}
        loading={isDeleting}
      />
    </SidebarInset>
  );
}
