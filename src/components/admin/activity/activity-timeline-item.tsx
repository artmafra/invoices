"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ActivityEntry } from "@/types/common/activity.types";
import { formatIdForDisplay, generateSummary, getScopeBadge } from "@/lib/activity/utils";
import { useDateFormat } from "@/hooks/use-date-format";
import { UserHoverCard } from "@/components/shared/user-hover-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ActivityContent } from "./activity-content";
import { ActivityDetailsSheet } from "./activity-details-sheet";

interface ActivityTimelineItemProps {
  log: ActivityEntry;
}

/**
 * Renders a user display with optional hover card for the header
 */
function UserDisplay({
  userId,
  displayName,
  showId = false,
  idClassName = "font-mono text-[10px] bg-muted px-space-xs py-space-xs rounded",
}: {
  userId: string | undefined | null;
  displayName: string;
  showId?: boolean;
  idClassName?: string;
}) {
  if (!userId || displayName === "System") {
    return (
      <>
        <span>{displayName}</span>
        {showId && userId && (
          <>
            {" "}
            <code className={idClassName}>{formatIdForDisplay(userId)}</code>
          </>
        )}
      </>
    );
  }

  return (
    <UserHoverCard userId={userId} side="bottom" align="start">
      <span className="cursor-pointer hover:underline">
        {displayName}
        {showId && (
          <>
            {" "}
            <code className={idClassName}>{formatIdForDisplay(userId)}</code>
          </>
        )}
      </span>
    </UserHoverCard>
  );
}

/**
 * Activity Timeline Item Component with Sheet for details
 * Uses a timeline layout with scope icon on the left rail
 */
export function ActivityTimelineItem({ log }: ActivityTimelineItemProps) {
  const t = useTranslations("system.activity");
  const { formatDateTime } = useDateFormat();
  const [sheetOpen, setSheetOpen] = useState(false);
  const scopeBadge = getScopeBadge(log.details);
  const ScopeIcon = scopeBadge.icon;

  const impersonation = log.details?.impersonation;
  const effectiveDisplay = log.userName || log.userEmail || "System";
  const effectiveId = impersonation?.effective.id || log.userId;
  const actorDisplay = impersonation
    ? impersonation.actor.name || impersonation.actor.email || impersonation.actor.id
    : effectiveDisplay;
  const actorId = impersonation?.actor.id;

  return (
    <div className="relative flex gap-space-lg">
      {/* Timeline rail - hidden on mobile, visible on sm+ */}
      <div className="mb-space-lg hidden sm:flex flex-col items-center w-10 shrink-0">
        {/* Dot marker */}
        <div className="mt-space-lg relative z-10 flex h-10 w-10 items-center justify-center rounded-full border bg-background">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <ScopeIcon className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>
                  {log.details?.scope === "app" ? t("scope.appModule") : t("scope.systemFeature")} •{" "}
                  {scopeBadge.label}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {/* Connecting line - hide for last item */}
        <div className="flex-1 w-px bg-border" />
      </div>

      {/* Content card */}
      <div className="flex-1 min-w-0">
        <Card className="gap-0 pt-0">
          <CardHeader className="gap-0 border-b bg-card-section">
            {/* Top row: Summary, scope badge (mobile), and timestamp + performer (desktop) */}
            <div className="flex items-start gap-space-sm">
              {/* Mobile scope icon */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="sm:hidden flex h-8 w-8 items-center justify-center rounded-full border bg-background shrink-0 mt-space-xs">
                      <ScopeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {log.details?.scope === "app"
                        ? t("scope.appModule")
                        : t("scope.systemFeature")}{" "}
                      • {scopeBadge.label}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="flex-1 min-w-0">
                {/* Desktop: title + performer + timestamp inline */}
                <div className="hidden sm:flex items-center justify-between gap-space-sm">
                  <CardTitle>{generateSummary(log, t)}</CardTitle>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {impersonation ? (
                      <>
                        <UserDisplay userId={actorId} displayName={actorDisplay} showId />{" "}
                        {t("labels.as")}{" "}
                        <UserDisplay userId={effectiveId} displayName={effectiveDisplay} showId />
                      </>
                    ) : (
                      <UserDisplay userId={effectiveId} displayName={actorDisplay} showId />
                    )}{" "}
                    · {formatDateTime(log.createdAt)}
                  </span>
                </div>
                {/* Mobile: title on first line, performer + date on second line */}
                <div className="sm:hidden">
                  <CardTitle>{generateSummary(log, t)}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-space-xs">
                    {impersonation ? (
                      <>
                        <UserDisplay userId={actorId} displayName={actorDisplay} showId />{" "}
                        {t("labels.as")}{" "}
                        <UserDisplay userId={effectiveId} displayName={effectiveDisplay} showId />
                      </>
                    ) : (
                      <UserDisplay userId={effectiveId} displayName={actorDisplay} showId />
                    )}{" "}
                    · {formatDateTime(log.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>

          {/* Content area */}
          <CardContent>
            <div className="flex">
              <div className="flex-1 space-y-space-md">
                <ActivityContent
                  log={log}
                  sections={{
                    affectedTarget: true,
                    authMethod: true,
                    authEmail: true,
                    relatedTargets: true,
                    values: true,
                    changes: true,
                  }}
                />
              </div>
              {/* Details button - always show for full overview */}
              <div className="flex items-end sm:justify-end">
                <Button
                  size="sm"
                  className="w-full sm:w-auto text-xs"
                  onClick={() => setSheetOpen(true)}
                >
                  {t("showDetails")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Sheet */}
        <ActivityDetailsSheet log={log} open={sheetOpen} onOpenChange={setSheetOpen} />
      </div>
    </div>
  );
}
