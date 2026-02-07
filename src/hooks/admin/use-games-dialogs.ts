"use client";

import { useState } from "react";
import type { GameWithCreator } from "@/hooks/admin/use-games";

/**
 * Dialog state for games management
 * Consolidates 6 separate state variables into a single hook (Finding #10)
 */
export interface GamesDialogState {
  // Form dialog
  showFormDialog: boolean;
  editingGameId: string | null;
  existingCoverUrl: string | null;

  // Delete confirmation
  deleteGameId: string | null;
}

/**
 * Hook to manage all game dialog states and their open/close handlers
 * Reduces modal state complexity from 6 separate useState calls to 1 hook
 */
export function useGamesDialogs() {
  // Form dialog state
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null);

  // Delete dialog state
  const [deleteGameId, setDeleteGameId] = useState<string | null>(null);

  return {
    // State
    dialogs: {
      showFormDialog,
      editingGameId,
      existingCoverUrl,
      deleteGameId,
    },

    // State setters (for controlled components)
    setExistingCoverUrl,

    // Create dialog actions
    openCreateDialog: () => {
      setEditingGameId(null);
      setExistingCoverUrl(null);
      setShowFormDialog(true);
    },

    // Edit dialog actions
    openEditDialog: (game: GameWithCreator) => {
      setExistingCoverUrl(game.coverImage);
      setEditingGameId(game.id);
      setShowFormDialog(true);
    },

    closeFormDialog: () => {
      setShowFormDialog(false);
      setEditingGameId(null);
      setExistingCoverUrl(null);
    },

    // Delete confirmation actions
    openDeleteConfirm: (gameId: string) => setDeleteGameId(gameId),
    closeDeleteConfirm: () => setDeleteGameId(null),

    // Close all dialogs (utility)
    closeAll: () => {
      setShowFormDialog(false);
      setEditingGameId(null);
      setDeleteGameId(null);
      setExistingCoverUrl(null);
    },
  };
}
