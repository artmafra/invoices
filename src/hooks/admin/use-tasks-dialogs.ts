"use client";

import { useState } from "react";
import type { TaskFormValues } from "@/components/admin/tasks/task-form-dialog";

/**
 * Dialog state for tasks management
 * Consolidates 4 separate state variables into a single hook (Finding #10)
 */
export interface TasksDialogState {
  // Form dialog
  showFormDialog: boolean;
  editingTaskId: string | null;
  initialData: Partial<TaskFormValues> | undefined;

  // Delete confirmation
  deleteTaskId: string | null;
}

/**
 * Hook to manage all task dialog states and their open/close handlers
 * Reduces modal state complexity from 4 separate useState calls to 1 hook
 */
export function useTasksDialogs() {
  // Form dialog state
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<Partial<TaskFormValues> | undefined>(undefined);

  // Delete dialog state
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  return {
    // State
    dialogs: {
      showFormDialog,
      editingTaskId,
      initialData,
      deleteTaskId,
    },

    // Create dialog actions
    openCreateDialog: () => {
      setEditingTaskId(null);
      setInitialData(undefined);
      setShowFormDialog(true);
    },

    // Edit dialog actions
    openEditDialog: (taskId: string, data: Partial<TaskFormValues>) => {
      setInitialData(data);
      setEditingTaskId(taskId);
      setShowFormDialog(true);
    },

    closeFormDialog: () => {
      setShowFormDialog(false);
      setEditingTaskId(null);
      setInitialData(undefined);
    },

    // Delete confirmation actions
    openDeleteConfirm: (taskId: string) => setDeleteTaskId(taskId),
    closeDeleteConfirm: () => setDeleteTaskId(null),

    // Close all dialogs (utility)
    closeAll: () => {
      setShowFormDialog(false);
      setEditingTaskId(null);
      setDeleteTaskId(null);
      setInitialData(undefined);
    },
  };
}
