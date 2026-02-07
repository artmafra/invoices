"use client";

import { useTranslations } from "next-intl";
import { LoadingButton } from "@/components/shared/loading-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface RevokeAllSessionsDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when dialog should close */
  onClose: () => void;
  /** Called when revoke is confirmed */
  onRevoke: () => void;
  /** Whether the revoke mutation is pending */
  isRevoking: boolean;
  /** Number of sessions to revoke */
  sessionCount: number;
  /** Translation namespace */
  translationNamespace: "system.sessions" | "profile.sessions";
  /** For admin: target user info (name/email) */
  targetUserName?: string | null;
}

/**
 * Confirmation dialog for revoking all sessions
 * - Admin context: revokes all sessions for a specific user
 * - Profile context: revokes all other sessions for current user
 */
export function RevokeAllSessionsDialog({
  open,
  onClose,
  onRevoke,
  isRevoking,
  sessionCount,
  translationNamespace,
  targetUserName,
}: RevokeAllSessionsDialogProps) {
  const t = useTranslations(translationNamespace);
  const tc = useTranslations("common");

  const isAdminContext = translationNamespace === "system.sessions";

  // Admin uses "revokeAllTitle" / "revokeAllDescription" with name and count
  // Profile uses "revokeOtherTitle" / "revokeOtherDescription"
  const title = isAdminContext ? t("revokeAllTitle") : t("revokeOtherTitle");
  const description = isAdminContext
    ? t("revokeAllDescription", { name: targetUserName || "", count: sessionCount })
    : t("revokeOtherDescription");

  // Admin uses "revokeAll" button, Profile uses "revokeOtherCount"
  const buttonLabel = isAdminContext
    ? t("revokeAll", { count: sessionCount })
    : t("revokeOtherCount", { count: sessionCount });

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <DialogDescription>{description}</DialogDescription>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {tc("buttons.cancel")}
          </Button>
          <LoadingButton
            variant="destructive"
            onClick={onRevoke}
            loading={isRevoking}
            loadingText={tc("buttons.processing")}
          >
            {buttonLabel}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
