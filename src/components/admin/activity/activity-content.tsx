"use client";

import { useTranslations } from "next-intl";
import type { ActivityEntry } from "@/types/common/activity.types";
import { formatIdForDisplay, getEntityTypeKey, getScopeBadge } from "@/lib/activity/utils";
import { useDateFormat } from "@/hooks/use-date-format";
import { LabeledField, LabeledFieldGroup } from "@/components/shared/labeled-field";
import { UserHoverCard } from "@/components/shared/user-hover-card";
import { Badge } from "@/components/ui/badge";
import { ChangeItem } from "./change-item";
import { ValueItem } from "./value-item";

interface ActivityContentProps {
  log: ActivityEntry;
  /** Which sections to show */
  sections?: {
    performer?: boolean;
    when?: boolean;
    affectedTarget?: boolean;
    relatedTargets?: boolean;
    authMethod?: boolean; // For login success events
    authEmail?: boolean; // For login success events
    values?: boolean; // For create actions
    changes?: boolean;
    context?: boolean; // Session, scope, action, etc.
    session?: boolean;
    scope?: boolean;
    action?: boolean;
    identifier?: boolean;
    reason?: boolean;
    error?: boolean;
    metadata?: boolean;
    entryId?: boolean;
  };
}

/**
 * Renders a user display with optional hover card
 */
function UserDisplay({
  userId,
  displayName,
  showId = false,
  idClassName = "font-mono text-xs text-muted-foreground bg-muted px-space-xs py-space-xs rounded",
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
 * Format session info into a human-readable string
 */
function formatSessionInfo(
  sessionInfo: ActivityEntry["sessionInfo"],
): { device: string; location: string | null } | null {
  if (!sessionInfo) return null;

  const parts: string[] = [];
  if (sessionInfo.browser) parts.push(sessionInfo.browser);
  if (sessionInfo.os) parts.push(`on ${sessionInfo.os}`);
  if (sessionInfo.deviceType) parts.push(`(${sessionInfo.deviceType})`);

  const device = parts.length > 0 ? parts.join(" ") : "Unknown device";

  let location: string | null = null;
  if (sessionInfo.city || sessionInfo.country) {
    const locationParts: string[] = [];
    if (sessionInfo.city) locationParts.push(sessionInfo.city);
    if (sessionInfo.region && sessionInfo.region !== sessionInfo.city) {
      locationParts.push(sessionInfo.region);
    }
    if (sessionInfo.country) locationParts.push(sessionInfo.country);
    location = locationParts.join(", ");
  }

  return { device, location };
}

/**
 * Reusable activity content component
 * Renders configurable sections of activity log details
 */
export function ActivityContent({ log, sections = {} }: ActivityContentProps) {
  const t = useTranslations("system.activity");
  const { formatDateTime } = useDateFormat();

  const hasMetadata = log.details?.metadata && Object.keys(log.details.metadata).length > 0;
  const hasChanges = log.details?.changes && log.details.changes.length > 0;
  const sessionDisplay = formatSessionInfo(log.sessionInfo);
  const impersonation = log.details?.impersonation;
  const scopeBadge = getScopeBadge(log.details);

  const effectiveDisplay = log.userName || log.userEmail || "System";
  const effectiveId = impersonation?.effective.id || log.userId;
  const actorDisplay = impersonation
    ? impersonation.actor.name || impersonation.actor.email || impersonation.actor.id
    : effectiveDisplay;
  const actorId = impersonation?.actor.id;

  const targetName = log.details?.target?.name;
  const targetId = log.details?.target?.id;
  const targetType = log.details?.target?.type;
  const entityTypeKey = getEntityTypeKey(targetType);

  const isCreateAction = log.action.includes(".create") || log.action.endsWith("create");
  const isLoginSuccess = log.action === "auth.login_success";
  const authMethod = log.details?.metadata?.authMethod as string | undefined;
  const loginEmail = log.details?.metadata?.email as string | undefined;

  // Determine if we should show the main section or context section
  const hasMainSection =
    sections.performer ||
    sections.when ||
    sections.affectedTarget ||
    sections.relatedTargets ||
    sections.authMethod ||
    sections.authEmail ||
    sections.values ||
    sections.changes;

  const hasContextSection = sections.context;

  return (
    <>
      {/* Main section */}
      {hasMainSection && (
        <LabeledFieldGroup>
          {/* Performer (Who / As) */}
          {sections.performer && (
            <LabeledField label={impersonation ? t("labels.actor") : t("labels.performer")}>
              <div className="text-sm flex items-center gap-space-sm flex-wrap">
                <UserDisplay
                  userId={actorId || effectiveId}
                  displayName={actorDisplay}
                  showId={!!(actorId || (!impersonation && effectiveId))}
                  idClassName="font-mono text-xs text-muted-foreground bg-muted px-space-xs py-space-xs rounded"
                />
                {impersonation && (
                  <>
                    <span className="text-muted-foreground">{t("labels.actingAs")}</span>
                    <UserDisplay
                      userId={effectiveId}
                      displayName={effectiveDisplay}
                      showId={!!effectiveId}
                      idClassName="font-mono text-xs text-muted-foreground bg-muted px-space-xs py-space-xs rounded"
                    />
                  </>
                )}
              </div>
            </LabeledField>
          )}

          {/* When */}
          {sections.when && (
            <LabeledField label={t("labels.when")}>
              <p className="text-sm">{formatDateTime(log.createdAt)}</p>
            </LabeledField>
          )}

          {/* Affected target */}
          {sections.affectedTarget && (targetName || targetId) && (
            <LabeledField label={t("labels.affected", { type: t(`entities.${entityTypeKey}`) })}>
              <div className="flex items-center gap-space-sm">
                {targetType === "user" && targetId ? (
                  <UserDisplay
                    userId={targetId}
                    displayName={targetName || targetId}
                    showId={!!targetId && targetId !== targetName}
                    idClassName="font-mono text-xs text-muted-foreground bg-muted px-space-xs py-space-xs rounded"
                  />
                ) : (
                  <>
                    <span className="text-foreground">{targetName || targetId}</span>
                    {targetId && targetId !== targetName && (
                      <code className="font-mono text-xs text-muted-foreground bg-muted px-space-xs py-space-xs rounded">
                        {formatIdForDisplay(targetId)}
                      </code>
                    )}
                  </>
                )}
              </div>
            </LabeledField>
          )}

          {/* Auth-specific: method */}
          {sections.authMethod && isLoginSuccess && authMethod && (
            <LabeledField label={t("labels.methodUsed")}>
              <span className="text-foreground">{t(`actions.authMethods.${authMethod}`)}</span>
            </LabeledField>
          )}

          {/* Auth-specific: email */}
          {sections.authEmail && isLoginSuccess && loginEmail && (
            <LabeledField label={t("labels.emailUsed")}>
              <span className="text-foreground">{loginEmail}</span>
            </LabeledField>
          )}

          {/* Related targets */}
          {sections.relatedTargets &&
            log.details?.relatedTargets?.map((related, index) => {
              const relatedEntityKey = getEntityTypeKey(related.type);
              const isUserTarget = related.type === "user";
              return (
                <LabeledField
                  key={index}
                  label={t("labels.affected", { type: t(`entities.${relatedEntityKey}`) })}
                >
                  <div className="flex items-center gap-space-sm">
                    {isUserTarget && related.id ? (
                      <UserDisplay
                        userId={related.id}
                        displayName={related.name || related.id}
                        showId={!!related.id && related.id !== related.name}
                        idClassName="font-mono text-xs text-muted-foreground bg-muted px-space-xs py-space-xs rounded"
                      />
                    ) : (
                      <>
                        <span className="text-foreground">{related.name || related.id}</span>
                        {related.id && related.id !== related.name && (
                          <code className="font-mono text-xs text-muted-foreground bg-muted px-space-xs py-space-xs rounded">
                            {formatIdForDisplay(related.id)}
                          </code>
                        )}
                      </>
                    )}
                  </div>
                </LabeledField>
              );
            })}

          {/* Values (for create actions) */}
          {sections.values && isCreateAction && hasMetadata && (
            <LabeledField label={t("labels.values")}>
              <div className="flex flex-col gap-space-sm">
                {Object.entries(log.details!.metadata!).map(([key, value]) => (
                  <ValueItem key={key} field={key} value={value} />
                ))}
              </div>
            </LabeledField>
          )}

          {/* Changes */}
          {sections.changes && hasChanges && (
            <LabeledField label={t("labels.changes")}>
              <div className="space-y-space-xs">
                {log.details!.changes!.map((change, i) => (
                  <ChangeItem key={i} change={change} />
                ))}
              </div>
            </LabeledField>
          )}
        </LabeledFieldGroup>
      )}

      {/* Context section */}
      {hasContextSection && (
        <div className="space-y-space-lg">
          {/* Context section header */}
          <h3 className="text-sm font-semibold">{t("labels.context")}</h3>

          {/* Session */}
          {sections.session && (
            <LabeledField label={t("labels.session")}>
              <div className="text-sm space-y-space-sm">
                <p>{sessionDisplay?.device || t("labels.unknownSession")}</p>
                {sessionDisplay?.location && <p>{sessionDisplay.location}</p>}
                <p>IP: {log.sessionInfo?.ipAddress || t("labels.unknownIP")}</p>
              </div>
            </LabeledField>
          )}

          {/* Scope */}
          {sections.scope && (
            <LabeledField label={t("labels.scope")}>
              <div className="text-sm flex items-center gap-space-sm">
                <Badge variant={scopeBadge.variant}>{scopeBadge.label}</Badge>
                <span>
                  {log.details?.scope === "app" ? t("scope.appModule") : t("scope.systemFeature")}
                </span>
              </div>
            </LabeledField>
          )}

          {/* Action key */}
          {sections.action && (
            <LabeledField label={t("labels.action")}>
              <Badge variant="secondary" className="font-mono">
                {log.action}
              </Badge>
            </LabeledField>
          )}

          {/* Identifier */}
          {sections.identifier && log.details?.identifier && (
            <LabeledField label={t("labels.identifier")}>
              <p className="text-sm">{log.details.identifier}</p>
            </LabeledField>
          )}

          {/* Reason */}
          {sections.reason && log.details?.reason && (
            <LabeledField label={t("labels.reason")}>
              <p className="text-sm text-destructive">{log.details.reason}</p>
            </LabeledField>
          )}

          {/* Error */}
          {sections.error && log.details?.error && (
            <LabeledField label={t("labels.error")}>
              <p className="text-sm text-destructive">{log.details.error}</p>
            </LabeledField>
          )}

          {/* Metadata (for non-create actions) */}
          {sections.metadata && !isCreateAction && hasMetadata && (
            <LabeledField label={t("labels.metadata")}>
              <div className="space-y-space-sm">
                {Object.entries(log.details!.metadata!).map(([key, value]) => (
                  <ValueItem key={key} field={key} value={value} />
                ))}
              </div>
            </LabeledField>
          )}

          {/* Entry ID */}
          {sections.entryId && (
            <LabeledField label={t("labels.entryId")}>
              <Badge variant="secondary" className="font-mono">
                {formatIdForDisplay(log.id)}
              </Badge>
            </LabeledField>
          )}
        </div>
      )}
    </>
  );
}
