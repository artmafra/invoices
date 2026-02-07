"use client";

import dynamic from "next/dynamic";
import type { RevokeAllSessionsDialogProps } from "./revoke-all-sessions-dialog";
import type { RevokeSessionDialogProps } from "./revoke-session-dialog";

/**
 * Lazy-loaded RevokeSessionDialog.
 * The actual dialog component is loaded on-demand when it's first opened.
 * This reduces the initial JavaScript bundle for the sessions page.
 */
export const LazyRevokeSessionDialog = dynamic<RevokeSessionDialogProps>(
  () => import("./revoke-session-dialog").then((mod) => mod.RevokeSessionDialog),
  { ssr: false },
);

/**
 * Lazy-loaded RevokeAllSessionsDialog.
 * The actual dialog component is loaded on-demand when it's first opened.
 * This reduces the initial JavaScript bundle for the sessions page.
 */
export const LazyRevokeAllSessionsDialog = dynamic<RevokeAllSessionsDialogProps>(
  () => import("./revoke-all-sessions-dialog").then((mod) => mod.RevokeAllSessionsDialog),
  { ssr: false },
);
