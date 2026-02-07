"use client";

import dynamic from "next/dynamic";
import type { TaskDeleteDialogProps } from "./task-delete-dialog";
import type { TaskFormDialogProps } from "./task-form-dialog";

/**
 * Lazy-loaded TaskFormDialog.
 * The actual dialog component is loaded on-demand when it's first opened.
 * This reduces the initial JavaScript bundle for the tasks page.
 */
export const LazyTaskFormDialog = dynamic<TaskFormDialogProps>(
  () => import("./task-form-dialog").then((mod) => mod.TaskFormDialog),
  { ssr: false },
);

/**
 * Lazy-loaded TaskDeleteDialog.
 * The actual dialog component is loaded on-demand when it's first opened.
 * This reduces the initial JavaScript bundle for the tasks page.
 */
export const LazyTaskDeleteDialog = dynamic<TaskDeleteDialogProps>(
  () => import("./task-delete-dialog").then((mod) => mod.TaskDeleteDialog),
  { ssr: false },
);
