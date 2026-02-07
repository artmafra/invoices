"use client";

import dynamic from "next/dynamic";
import type { PasskeyListDialogProps } from "./passkey-list-dialog";
import type { PasskeySetupDialogProps } from "./passkey-setup-dialog";

/**
 * Lazy-loaded PasskeyListDialog.
 * The actual dialog component is loaded on-demand when it's first opened.
 * This reduces the initial JavaScript bundle for the profile page.
 */
export const LazyPasskeyListDialog = dynamic<PasskeyListDialogProps>(
  () => import("./passkey-list-dialog").then((mod) => mod.PasskeyListDialog),
  { ssr: false },
);

/**
 * Lazy-loaded PasskeySetupDialog.
 * The actual dialog component is loaded on-demand when it's first opened.
 * This reduces the initial JavaScript bundle for the profile page.
 */
export const LazyPasskeySetupDialog = dynamic<PasskeySetupDialogProps>(
  () => import("./passkey-setup-dialog").then((mod) => mod.PasskeySetupDialog),
  { ssr: false },
);
