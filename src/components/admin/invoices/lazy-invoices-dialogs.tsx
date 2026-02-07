"use client";

import dynamic from "next/dynamic";
import type { InvoiceDeleteDialogProps } from "./invoice-delete-dialog.tsx";
import type { InvoiceFormDialogProps } from "./invoice-form-dialog.tsx";

/**
 * Lazy-loaded InvoiceFormDialog.
 * The actual dialog component is loaded on-demand when it's first opened.
 * This reduces the initial JavaScript bundle for the invoices page.
 */
export const LazyInvoiceFormDialog = dynamic<InvoiceFormDialogProps>(
  () => import("./invoice-form-dialog").then((mod) => mod.InvoiceFormDialog),
  { ssr: false },
);

/**
 * Lazy-loaded InvoiceDeleteDialog.
 * The actual dialog component is loaded on-demand when it's first opened.
 * This reduces the initial JavaScript bundle for the invoices page.
 */
export const LazyInvoiceDeleteDialog = dynamic<InvoiceDeleteDialogProps>(
  () => import("./invoice-delete-dialog").then((mod) => mod.InvoiceDeleteDialog),
  { ssr: false },
);
