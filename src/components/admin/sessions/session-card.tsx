"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDateFormat } from "@/hooks/use-date-format";
import { LabeledField, LabeledFieldGroup } from "@/components/shared/labeled-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { BaseSessionFields } from "./session-utils";
import { formatLocation, getDeviceIcon } from "./session-utils";

type SessionTranslationNamespace = "system.sessions" | "profile.sessions";

export interface SessionCardProps {
  /** Session data to display */
  session: BaseSessionFields;
  /** Translation namespace - either "system.sessions" or "profile.sessions" */
  translationNamespace: SessionTranslationNamespace;
  /** Whether this is the current session */
  isCurrent?: boolean;
  /** Whether to show the revoke button */
  canRevoke?: boolean;
  /** Callback when revoke button is clicked */
  onRevoke?: () => void;
  /** Optional class name for the container */
  className?: string;
}

/**
 * Session card displaying device info, location, and timestamps with revoke action
 */
export function SessionCard({
  session,
  translationNamespace,
  isCurrent = false,
  canRevoke = false,
  onRevoke,
  className = "",
}: SessionCardProps) {
  const t = useTranslations(translationNamespace);
  const { formatRelativeTime } = useDateFormat();

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center gap-space-md">
        {/* Device Icon */}
        <div className="shrink-0 mt-space-xs">{getDeviceIcon(session.deviceType, "h-5 w-5")}</div>

        {/* Browser/OS with success/failure badge */}
        <div className="flex items-center gap-space-md flex-wrap">
          <CardTitle>
            {t("browserOnOs", {
              browser: session.browser || t("unknownBrowser"),
              os: session.os || t("unknownOS"),
            })}
          </CardTitle>
          {isCurrent && <Badge variant="success">{t("currentSession")}</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <LabeledFieldGroup>
          {/* Location */}
          <LabeledField label={t("locationLabel")}>
            <span>{formatLocation(session) ? formatLocation(session) : t("unknownLocation")}</span>
          </LabeledField>

          {/* IP Address */}
          <LabeledField label={t("ipAddressLabel")}>
            <span className="font-mono truncate max-w-32 sm:max-w-none">
              {session.ipAddress || "—"}
            </span>
          </LabeledField>
        </LabeledFieldGroup>
      </CardContent>

      <CardFooter className="flex items-center justify-between text-sm text-muted-foreground">
        <div>{formatRelativeTime(session.createdAt)}</div>

        {canRevoke && onRevoke && (
          <Button variant="destructive" size="sm" onClick={onRevoke}>
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t("revokeSession")}</span>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
