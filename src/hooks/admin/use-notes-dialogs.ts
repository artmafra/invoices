"use client";

import { useState } from "react";

/**
 * Dialog state for notes management
 * Consolidates separate state variables into a single hook
 */
export interface NotesDialogState {
  // Form dialog (create/edit)
  showFormDialog: boolean;
  editingNoteId: string | null;

  // Confirmation dialogs
  deleteNoteId: string | null;
}

/**
 * Hook to manage all note dialog states and their open/close handlers
 * Reduces modal state complexity
 */
export function useNotesDialogs() {
  // Form dialog state (handles both create and edit)
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Confirmation dialog states
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  return {
    // State
    dialogs: {
      showFormDialog,
      editingNoteId,
      deleteNoteId,
    },

    // Form dialog actions
    openCreateDialog: () => {
      setEditingNoteId(null);
      setShowFormDialog(true);
    },
    openEditDialog: (noteId: string) => {
      setEditingNoteId(noteId);
      setShowFormDialog(true);
    },
    closeFormDialog: () => {
      setShowFormDialog(false);
      setEditingNoteId(null);
    },

    // Delete dialog actions
    openDeleteConfirm: (noteId: string) => setDeleteNoteId(noteId),
    closeDeleteConfirm: () => setDeleteNoteId(null),
  };
}
