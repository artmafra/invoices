"use client";

import { Archive, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { PaginationSize } from "@/lib/preferences";
import type { NoteWithCreator } from "@/hooks/admin/use-notes";
import type { NotePermissions } from "@/hooks/admin/use-resource-permissions";
import { NoteCard } from "@/components/admin/notes/note-card";
import { DataPagination } from "@/components/shared/data-pagination";
import { EmptyState } from "@/components/shared/empty-state";

export interface NotesListViewProps {
  // Data
  notes: NoteWithCreator[];
  notesData:
    | {
        data: NoteWithCreator[];
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
  permissions: NotePermissions;

  // Filter state
  hasActiveFilters: boolean;
  isArchived?: boolean;

  // Handlers
  onPageChange: (page: number) => void;
  onEdit: (noteId: string) => void;
  onDelete: (noteId: string) => void;
  onTogglePin?: (noteId: string) => void;
  onArchive: (noteId: string) => void;

  // For archived page - create action
  onCreateNote?: () => void;
}

/**
 * Presentation component for notes list view
 * Renders note cards with pinned/regular sections, pagination, and empty states
 * Shared between notes/page.tsx and notes/archived/page.tsx
 */
export function NotesListView({
  notes,
  notesData,
  page,
  limit,
  permissions,
  hasActiveFilters,
  isArchived = false,
  onPageChange,
  onEdit,
  onDelete,
  onTogglePin,
  onArchive,
  onCreateNote,
}: NotesListViewProps) {
  const t = useTranslations("apps/notes");

  // Separate pinned and regular notes
  const pinnedNotes = notes.filter((note) => note.isPinned);
  const regularNotes = notes.filter((note) => !note.isPinned);

  return (
    <>
      {/* Notes List */}
      {notes.length === 0 ? (
        <EmptyState
          icon={isArchived ? Archive : undefined}
          title={
            isArchived
              ? t("empty.noArchivedNotes")
              : hasActiveFilters
                ? t("empty.noSearchResults")
                : t("empty.noNotes")
          }
          action={
            !isArchived && !hasActiveFilters && permissions.canCreate && onCreateNote
              ? {
                  label: t("createButton"),
                  onClick: onCreateNote,
                  icon: Plus,
                }
              : undefined
          }
          showAction={!isArchived && !hasActiveFilters && permissions.canCreate && !!onCreateNote}
        />
      ) : (
        <div className="space-y-section">
          {/* Pinned Notes Section */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-space-lg">
              <h2 className="text-lg font-semibold">{t("pinnedNotes")}</h2>
              <div className="flex flex-col gap-space-lg">
                {pinnedNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onEdit={() => onEdit(note.id)}
                    onDelete={() => onDelete(note.id)}
                    onTogglePin={onTogglePin ? () => onTogglePin(note.id) : undefined}
                    onArchive={() => onArchive(note.id)}
                    canEdit={permissions.canEdit}
                    canDelete={permissions.canDelete}
                    isArchived={isArchived}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Regular Notes Section */}
          {regularNotes.length > 0 && (
            <div className="space-y-space-lg">
              {pinnedNotes.length > 0 && (
                <h2 className="text-lg font-semibold">{t("otherNotes")}</h2>
              )}
              <div className="flex flex-col gap-space-lg">
                {regularNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onEdit={() => onEdit(note.id)}
                    onDelete={() => onDelete(note.id)}
                    onTogglePin={onTogglePin ? () => onTogglePin(note.id) : undefined}
                    onArchive={() => onArchive(note.id)}
                    canEdit={permissions.canEdit}
                    canDelete={permissions.canDelete}
                    isArchived={isArchived}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {notesData && (
        <DataPagination
          page={page}
          totalPages={notesData.totalPages}
          total={notesData.total}
          limit={limit}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
}
