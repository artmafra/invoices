"use client";

import { useTranslations } from "next-intl";
import type { LoginHistoryResponse } from "@/types/auth/login-history.types";
import { useRecentLoginActivity } from "@/hooks/public/use-login-history";
import { useDateFormat } from "@/hooks/use-date-format";
import { formatLocation, getDeviceIcon, type BaseSessionFields } from "@/components/admin/sessions";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Section,
  SectionContent,
  SectionDescription,
  SectionHeader,
  SectionTitle,
} from "@/components/ui/section";

interface LoginEntryCardProps {
  entry: LoginHistoryResponse;
}

function LoginEntryCard({ entry }: LoginEntryCardProps) {
  const t = useTranslations("profile.loginHistory");
  const { formatRelativeTime } = useDateFormat();

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
    lastActivityAt: entry.createdAt,
  };

  const location = formatLocation(sessionFields);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-space-md">
        <div className="flex items-center gap-space-md">
          {getDeviceIcon(entry.deviceType, "h-5 w-5 text-muted-foreground")}
          <CardTitle>
            {t("browserOnOs", {
              browser: entry.browser || t("unknownBrowser"),
              os: entry.os || t("unknownOS"),
            })}
          </CardTitle>
        </div>
        {entry.success ? (
          <Badge variant="success">{t("successful")}</Badge>
        ) : (
          <Badge variant="destructive">{t("failed")}</Badge>
        )}
      </CardHeader>
      <CardFooter className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex flex-col sm:flex-row sm:gap-space-sm">
          <span>{location ? location : t("unknownLocation")}</span>
          {!entry.success && entry.failureReason && (
            <>
              <span className="hidden sm:inline">{" • "}</span>
              <span>
                <span className="text-destructive">
                  {t(`failureReasons.${entry.failureReason}`, {
                    defaultValue: entry.failureReason,
                  })}
                </span>
              </span>
            </>
          )}
        </div>

        <div>{formatRelativeTime(entry.createdAt)}</div>
      </CardFooter>
    </Card>
  );
}

export interface RecentLoginActivityProps {
  /** Number of recent entries to fetch (shows fewer on mobile via CSS) */
  limit?: number;
  /** Optional class name for the container */
  className?: string;
}

/**
 * Card displaying recent login activity with a link to view full history.
 * Designed to be embedded on the Profile → Security page.
 * Shows 3 entries on mobile, up to `limit` on desktop.
 */
export function RecentLoginActivity({ limit = 5, className = "" }: RecentLoginActivityProps) {
  const t = useTranslations("profile.loginHistory");
  const { data, isLoading, error } = useRecentLoginActivity(limit);

  const entries = data?.data || [];

  return (
    <Section>
      <SectionHeader>
        <SectionTitle>{t("recentActivity")}</SectionTitle>
        <SectionDescription>{t("recentActivityDescription")}</SectionDescription>
      </SectionHeader>
      <SectionContent>
        <div className={className}>
          {isLoading ? (
            <Card>
              <CardContent>
                <LoadingState />
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent>
                <EmptyState title={t("errors.loadFailed")} asCard={false} padding="small" />
              </CardContent>
            </Card>
          ) : entries.length > 0 ? (
            <div className="space-y-space-lg">
              {entries.map((entry) => (
                <LoginEntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent>
                <EmptyState title={t("noHistory")} asCard={false} padding="small" />
              </CardContent>
            </Card>
          )}
        </div>
      </SectionContent>
    </Section>
  );
}
