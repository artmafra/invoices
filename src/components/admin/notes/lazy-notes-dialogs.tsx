"use client";

import dynamic from "next/dynamic";
import type { NoteFormDialogProps } from "./note-form-dialog";

/**
 * Lazy-loaded NoteFormDialog.
 * The actual dialog component is loaded on-demand when it's first opened.
 * This reduces the initial JavaScript bundle for the notes page.
 */
export const LazyNoteFormDialog = dynamic<NoteFormDialogProps>(
  () => import("./note-form-dialog").then((mod) => mod.NoteFormDialog),
  { ssr: false },
);
