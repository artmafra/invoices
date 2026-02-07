"use client";

import dynamic from "next/dynamic";
import type { GameDeleteDialogProps } from "./game-delete-dialog";
import type { GameFormDialogProps } from "./game-form-dialog";

/**
 * Lazy-loaded GameFormDialog.
 * The actual dialog component is loaded on-demand when it's first opened.
 * This reduces the initial JavaScript bundle for the games page.
 */
export const LazyGameFormDialog = dynamic<GameFormDialogProps>(
  () => import("./game-form-dialog").then((mod) => mod.GameFormDialog),
  { ssr: false },
);

/**
 * Lazy-loaded GameDeleteDialog.
 * The actual dialog component is loaded on-demand when it's first opened.
 * This reduces the initial JavaScript bundle for the games page.
 */
export const LazyGameDeleteDialog = dynamic<GameDeleteDialogProps>(
  () => import("./game-delete-dialog").then((mod) => mod.GameDeleteDialog),
  { ssr: false },
);
