"use client";

import dynamic from "next/dynamic";
import type { CreateUserDialogProps } from "./create-user-dialog";
import type { EditUserDialogProps } from "./edit-user-dialog";
import type { InviteUserDialogProps } from "./invite-user-dialog";

/**
 * Lazy-loaded CreateUserDialog.
 * The actual dialog component is loaded on-demand when it's first opened.
 * This reduces the initial JavaScript bundle for the users page.
 */
export const LazyCreateUserDialog = dynamic<CreateUserDialogProps>(
  () => import("./create-user-dialog").then((mod) => mod.CreateUserDialog),
  { ssr: false },
);

/**
 * Lazy-loaded EditUserDialog.
 * The actual dialog component is loaded on-demand when it's first opened.
 * This reduces the initial JavaScript bundle for the users page.
 */
export const LazyEditUserDialog = dynamic<EditUserDialogProps>(
  () => import("./edit-user-dialog").then((mod) => mod.EditUserDialog),
  { ssr: false },
);

/**
 * Lazy-loaded InviteUserDialog.
 * The actual dialog component is loaded on-demand when it's first opened.
 * This reduces the initial JavaScript bundle for the users page.
 */
export const LazyInviteUserDialog = dynamic<InviteUserDialogProps>(
  () => import("./invite-user-dialog").then((mod) => mod.InviteUserDialog),
  { ssr: false },
);
