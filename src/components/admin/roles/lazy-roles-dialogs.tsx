"use client";

import dynamic from "next/dynamic";
import type { CreateRoleDialogProps, EditRoleDialogProps } from "./role-form-dialogs";

/**
 * Lazy-loaded CreateRoleDialog.
 * The actual dialog component is loaded on-demand when it's first opened.
 * This reduces the initial JavaScript bundle for the roles page.
 */
export const LazyCreateRoleDialog = dynamic<CreateRoleDialogProps>(
  () => import("./role-form-dialogs").then((mod) => mod.CreateRoleDialog),
  { ssr: false },
);

/**
 * Lazy-loaded EditRoleDialog.
 * The actual dialog component is loaded on-demand when it's first opened.
 * This reduces the initial JavaScript bundle for the roles page.
 */
export const LazyEditRoleDialog = dynamic<EditRoleDialogProps>(
  () => import("./role-form-dialogs").then((mod) => mod.EditRoleDialog),
  { ssr: false },
);
