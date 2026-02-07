"use client";

import dynamic from "next/dynamic";

/**
 * Lazy-loaded Command Palette wrapper.
 * The actual CommandPalette is loaded on-demand when the user opens it (Ctrl+K).
 * This reduces the initial JavaScript bundle for admin pages.
 */
export const LazyCommandPalette = dynamic(
  () => import("@/components/admin/command-palette").then((mod) => mod.CommandPalette),
  { ssr: false },
);
