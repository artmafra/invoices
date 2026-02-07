"use client";

import dynamic from "next/dynamic";
import type { AvatarUploadModalProps } from "./avatar-upload-modal";
import type { EmailManageDialogProps } from "./email-manage-dialog";

/**
 * Lazy-loaded EmailManageDialog.
 * The actual dialog component is loaded on-demand when it's first opened.
 * This reduces the initial JavaScript bundle for the profile page.
 */
export const LazyEmailManageDialog = dynamic<EmailManageDialogProps>(
  () => import("./email-manage-dialog").then((mod) => mod.EmailManageDialog),
  { ssr: false },
);

/**
 * Lazy-loaded AvatarUploadModal.
 * The actual dialog component is loaded on-demand when it's first opened.
 * This reduces the initial JavaScript bundle for the profile page.
 */
export const LazyAvatarUploadModal = dynamic<AvatarUploadModalProps>(
  () => import("./avatar-upload-modal").then((mod) => mod.AvatarUploadModal),
  { ssr: false },
);
