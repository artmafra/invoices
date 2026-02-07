"use client";

import { useState } from "react";
import { InvoiceFormValues } from "@/components/admin/invoices/invoice-form-dialog";

/**
 * Dialog state for invoices management
 * Consolidates separate state variables into a single hook
 */
export interface InvoicesDialogState {
  // Form dialog (create/edit)
  showFormDialog: boolean;
  editingInvoiceId: string | null;

  // Confirmation dialogs
  deleteInvoiceId: string | null;
}

/**
 * Hook to manage all note dialog states and their open/close handlers
 * Reduces modal state complexity
 */
export function useInvoicesDialogs() {
  // Form dialog state (handles both create and edit)
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<Partial<InvoiceFormValues> | undefined>(undefined);

  // Confirmation dialog states
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null);

  return {
    // State
    dialogs: {
      showFormDialog,
      editingInvoiceId,
      initialData,
      deleteInvoiceId,
    },

    // Form dialog actions
    openCreateDialog: () => {
      setEditingInvoiceId(null);
      setInitialData(undefined);
      setShowFormDialog(true);
    },
    openEditDialog: (invoiceId: string, data: Partial<InvoiceFormValues>) => {
      setInitialData(data);
      setEditingInvoiceId(invoiceId);
      setShowFormDialog(true);
    },
    closeFormDialog: () => {
      setShowFormDialog(false);
      setEditingInvoiceId(null);
      setInitialData(undefined);
    },

    // Delete dialog actions
    openDeleteConfirm: (invoiceId: string) => setDeleteInvoiceId(invoiceId),
    closeDeleteConfirm: () => setDeleteInvoiceId(null),

    // Close all dialogs (utility)
    closeAll: () => {
      setShowFormDialog(false);
      setEditingInvoiceId(null);
      setDeleteInvoiceId(null);
      setInitialData(undefined);
    },
  };
}
