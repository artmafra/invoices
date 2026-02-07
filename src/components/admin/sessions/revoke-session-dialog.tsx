"use client";

import { useTranslations } from "next-intl";
import { useDateFormat } from "@/hooks/use-date-format";
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
import type { BaseSessionFields } from "./session-utils";

interface SessionWithUser extends BaseSessionFields {
  userName?: string | null;
  userEmail?: string;
}

export interface RevokeSessionDialogProps {
  /** Session to revoke (null = dialog closed) */
  session: SessionWithUser | null;
  /** Called when dialog should close */
  onClose: () => void;
  /** Called when revoke is confirmed */
  onRevoke: () => void;
  /** Whether the revoke mutation is pending */
  isRevoking: boolean;
  /** Translation namespace */
  translationNamespace: "system.sessions" | "profile.sessions";
  /** Whether to show user info (admin view) */
  showUserInfo?: boolean;
}

/**
 * Confirmation dialog for revoking a single session
 */
export function RevokeSessionDialog({
  session,
  onClose,
  onRevoke,
  isRevoking,
  translationNamespace,
  showUserInfo = false,
}: RevokeSessionDialogProps) {
  const t = useTranslations(translationNamespace);
  const tc = useTranslations("common");
  const { formatRelativeTime } = useDateFormat();

  return (
    <Dialog open={!!session} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("revokeTitle")}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <DialogDescription>{t("revokeDescription")}</DialogDescription>
          {session && (
            <div className="space-y-space-sm text-sm">
              {showUserInfo && "userName" in session && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("user")}:</span>
                  <span>{session.userName || session.userEmail}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {showUserInfo ? t("device") : tc("fields.device")}:
                </span>
                <span>
                  {t("browserOnOs", {
                    browser: session.browser || t("unknownBrowser"),
                    os: session.os || t("unknownOS"),
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {showUserInfo ? t("ip") : tc("fields.ip")}:
                </span>
                <span className="font-mono">{session.ipAddress || "—"}</span>
              </div>
              {!showUserInfo && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{tc("fields.lastActivity")}:</span>
                  <span>{formatRelativeTime(session.lastActivityAt)}</span>
                </div>
              )}
            </div>
          )}
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
            {t("revokeSession")}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
