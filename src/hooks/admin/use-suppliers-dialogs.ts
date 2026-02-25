"use client";

import { useState } from "react";
import type { CreateSupplierInput } from "@/validations/supplier.validations";

/**
 * Dialog state for suppliers management
 * Consolidates separate state variables into a single hook
 */
export interface SuppliersDialogState {
  // Form dialog (create/edit)
  showFormDialog: boolean;
  editingSupplierCnpj: string | null;
  initialData?: Partial<CreateSupplierInput>;

  // Confirmation dialogs
  deleteSupplierCnpj: string | null;
}

/**
 * Hook to manage all supplier dialog states and their open/close handlers
 * Reduces modal state complexity
 */
export function useSuppliersDialogs() {
  // Form dialog state (handles both create and edit)
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingSupplierCnpj, setEditingSupplierCnpj] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<Partial<CreateSupplierInput> | undefined>(
    undefined,
  );

  // Confirmation dialog states
  const [deleteSupplierCnpj, setDeleteSupplierCnpj] = useState<string | null>(null);

  return {
    // State
    dialogs: {
      showFormDialog,
      editingSupplierCnpj,
      initialData,
      deleteSupplierCnpj,
    },

    // Form dialog actions
    openCreateDialog: () => {
      setEditingSupplierCnpj(null);
      setInitialData(undefined);
      setShowFormDialog(true);
    },
    openEditDialog: (cnpj: string, data?: Partial<CreateSupplierInput>) => {
      setEditingSupplierCnpj(cnpj);
      setInitialData(data);
      setShowFormDialog(true);
    },
    closeFormDialog: () => {
      setShowFormDialog(false);
      setEditingSupplierCnpj(null);
      setInitialData(undefined);
    },

    // Delete dialog actions
    openDeleteConfirm: (cnpj: string) => setDeleteSupplierCnpj(cnpj),
    closeDeleteConfirm: () => setDeleteSupplierCnpj(null),
  };
}
