"use client";

import { useTranslations } from "next-intl";
import type { LoginHistoryResponse } from "@/types/auth/login-history.types";
import { useDateFormat } from "@/hooks/use-date-format";
import { formatLocation, getDeviceIcon, type BaseSessionFields } from "@/components/admin/sessions";
import { LabeledField, LabeledFieldGroup } from "@/components/shared/labeled-field";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export interface LoginHistoryCardProps {
  /** Login history entry to display */
  entry: LoginHistoryResponse;
  /** Optional class name for the container */
  className?: string;
}

/**
 * Card displaying a single login history entry with success/failure status,
 * device info, location, and timestamp
 */
export function LoginHistoryCard({ entry, className = "" }: LoginHistoryCardProps) {
  const t = useTranslations("profile.loginHistory");
  const tCommon = useTranslations("common");
  const { formatRelativeTime } = useDateFormat();

  // Adapt LoginHistoryResponse to BaseSessionFields for utility functions
  const sessionFields: BaseSessionFields = {
    id: entry.id,
    deviceType: entry.deviceType,
    browser: entry.browser,
    os: entry.os,
    ipAddress: entry.ipAddress,
    city: entry.city,
    country: entry.country,
    countryCode: entry.countryCode,
    region: entry.region,
    createdAt: entry.createdAt,
    lastActivityAt: entry.createdAt, // Use createdAt as lastActivityAt for login history
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center gap-space-md">
        {/* Device Icon */}
        <div className="shrink-0 mt-space-xs">{getDeviceIcon(entry.deviceType, "h-5 w-5")}</div>

        {/* Browser/OS with success/failure badge */}
        <div className="flex items-center gap-space-md flex-wrap">
          <CardTitle>
            {t("browserOnOs", {
              browser: entry.browser || t("unknownBrowser"),
              os: entry.os || t("unknownOS"),
            })}
          </CardTitle>
          {entry.success ? (
            <Badge variant="success">{t("successful")}</Badge>
          ) : (
            <Badge variant="destructive">{t("failed")}</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <LabeledFieldGroup>
          {/* IP Address */}
          <LabeledField label={t("ipAddressLabel")}>
            <span className="truncate max-w-32 sm:max-w-none inline-block align-bottom">
              {entry.ipAddress || tCommon("labels.unknown")}
            </span>
          </LabeledField>

          {/* Login Method */}
          <LabeledField label={t("loginMethodLabel")}>
            <span className="truncate max-w-32 sm:max-w-none inline-block align-bottom">
              {entry.authMethod ? t(`authMethods.${entry.authMethod}`) : tCommon("labels.unknown")}
            </span>
          </LabeledField>

          {/* Failure reason if applicable */}
          {!entry.success && (
            <LabeledField label={t("failureReasonLabel")}>
              <span className="truncate max-w-32 sm:max-w-none inline-block align-bottom text-destructive">
                {entry.failureReason
                  ? t(`failureReasons.${entry.failureReason}`, {
                      defaultValue: entry.failureReason,
                    })
                  : tCommon("labels.unknown")}
              </span>
            </LabeledField>
          )}
        </LabeledFieldGroup>
      </CardContent>

      <CardFooter className="flex text-sm text-muted-foreground">
        <div>
          {formatLocation(sessionFields) ? formatLocation(sessionFields) : t("unknownLocation")}
        </div>
        <div>{" • "}</div>
        <div>{formatRelativeTime(entry.createdAt)}</div>
      </CardFooter>
    </Card>
  );
}
