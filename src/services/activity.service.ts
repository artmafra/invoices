import type { ActivityNew } from "@/schema/activities.schema";
import type {
  ActivityChange,
  ActivityDetails,
  ActivityTarget,
} from "@/types/common/activity.types";
import type { SessionInfo } from "@/types/common/geolocation.types";
// Import from types-only module to avoid circular dependency
import type { ActivityScope, CoreAction, CoreResource } from "@/types/permissions/permissions";
import { APPS_REGISTRY } from "@/config/apps.registry";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  computeContentHash,
  GENESIS_HASH,
  signActivityLog,
  verifyActivitySignature,
} from "@/lib/security";
import { deepEqual } from "@/lib/utils";
import { ActivityFilterOptions, ActivityWithUser } from "@/storage/activity.storage";
import { activityStorage } from "@/storage/runtime/activity";
import { userSessionStorage } from "@/storage/runtime/user-session";
import type { PaginatedResult, PaginationOptions } from "@/storage/types";

// Re-export types for convenience
export type { ActivityChange, ActivityDetails, ActivityTarget };

/**
 * Minimal session shape for activity logging (to avoid tight coupling)
 */
export interface ActivitySession {
  /** Session ID for fetching session context (device, browser, OS, IP, location) */
  sessionId?: string;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    impersonatedBy?: {
      id: string;
      name: string | null;
      email: string;
    };
  };
}

function isActivitySession(value: ActivitySession | string | null): value is ActivitySession {
  return value !== null && typeof value === "object" && "user" in value;
}

/**
 * Options for activity log helper functions
 */
export interface ActivityOptions {
  /** Additional metadata to include */
  metadata?: Record<string, unknown>;
  /** Related entities affected by this action (e.g., session owner, invitation recipient) */
  relatedTargets?: ActivityTarget[];
}

/**
 * Determine scope and appId from resource name
 * If resource matches a registered app ID, it's an app scope
 */
function detectScope(resource: string): { scope: ActivityScope; appId?: string } {
  const appIds = APPS_REGISTRY.map((a) => a.id);
  if (appIds.includes(resource as (typeof appIds)[number])) {
    return { scope: "app", appId: resource };
  }
  return { scope: "system" };
}

export class ActivityService {
  /**
   * Build session info snapshot from a session record
   */
  private buildSessionInfo(session: {
    deviceType: string | null;
    browser: string | null;
    os: string | null;
    ipAddress: string | null;
    city: string | null;
    country: string | null;
    countryCode: string | null;
    region: string | null;
  }): SessionInfo {
    return {
      deviceType: session.deviceType,
      browser: session.browser,
      os: session.os,
      ipAddress: session.ipAddress,
      city: session.city,
      country: session.country,
      countryCode: session.countryCode,
      region: session.region,
    };
  }

  /**
   * Internal method to write a log entry to the database with integrity protection.
   * Use the public helper methods (logCreate, logUpdate, logDelete, logAction) instead.
   *
   * Uses a database transaction with row locking to ensure sequential chain integrity.
   */
  private async writeLog(
    sessionOrUserId: ActivitySession | string | null,
    action: string,
    resource: string,
    resourceId: string | null,
    details: ActivityDetails,
  ): Promise<void> {
    // Handle both session object and plain userId string
    const userId = isActivitySession(sessionOrUserId)
      ? (sessionOrUserId.user?.id ?? null)
      : (sessionOrUserId as string | null);

    // Fetch session info if sessionId is provided
    let sessionInfo: SessionInfo | null = null;
    if (isActivitySession(sessionOrUserId) && sessionOrUserId.sessionId) {
      const session = await userSessionStorage.findById(sessionOrUserId.sessionId);
      if (session) {
        sessionInfo = this.buildSessionInfo(session);
      }
    }

    // Enrich details with impersonation context (metadata-only, no schema change)
    const enrichedDetails: ActivityDetails = (() => {
      if (!isActivitySession(sessionOrUserId)) return details;

      const sessionUser = sessionOrUserId.user;
      const actor = sessionUser?.impersonatedBy;
      const effectiveUserId = sessionUser?.id;

      if (!actor || !effectiveUserId) return details;

      // Avoid clobbering if a caller explicitly set it.
      if (details.impersonation) return details;

      return {
        ...details,
        impersonation: {
          actor: {
            id: actor.id,
            name: actor.name,
            email: actor.email,
          },
          effective: {
            id: effectiveUserId,
            name: sessionUser?.name ?? null,
            email: sessionUser?.email ?? null,
          },
        },
      };
    })();

    // Get the previous entry's content hash for chain linking
    const previousHash = (await activityStorage.getLastContentHash()) ?? GENESIS_HASH;

    // Set timestamp explicitly so it's included in the content hash
    // Truncate to seconds for consistent hashing across write/verify cycles
    // (PostgreSQL timestamp has microsecond precision, JS Date has millisecond)
    const createdAt = new Date(Math.floor(Date.now() / 1000) * 1000);

    // Build the content to hash (includes sessionInfo for integrity)
    const contentToHash = JSON.stringify({
      userId,
      action,
      resource,
      resourceId,
      details: enrichedDetails,
      sessionInfo,
      createdAt: createdAt.toISOString(),
      previousHash,
    });

    // Compute content hash
    const contentHash = computeContentHash(contentToHash);

    // Sign the chain link (contentHash + previousHash)
    const signatureContent = `${contentHash}:${previousHash}`;
    const signature = signActivityLog(signatureContent);

    // Build the complete log entry
    const logEntry: ActivityNew = {
      userId,
      action,
      resource,
      resourceId,
      details: enrichedDetails,
      sessionInfo,
      createdAt,
      contentHash,
      previousHash,
      signature,
    };

    // Use storage layer method that handles transaction and row locking
    await activityStorage.createWithIntegrityChain(logEntry);
  }

  // ===========================================================================
  // Public Helper Methods - Use these for all activity logging
  // ===========================================================================

  /**
   * Log a create action.
   *
   * @example
   * await activityService.logCreate(
   *   session,
   *   "users",
   *   { type: "user", id: user.id, name: user.email },
   * );
   */
  async logCreate(
    session: ActivitySession | string | null,
    resource: CoreResource | (string & {}),
    target: ActivityTarget,
    options: ActivityOptions = {},
  ): Promise<void> {
    const { scope, appId } = detectScope(resource);
    const details: ActivityDetails = {
      scope,
      appId,
      target,
      relatedTargets: options.relatedTargets,
      metadata: options.metadata,
    };
    await this.writeLog(session, `${resource}.create`, resource, target.id ?? null, details);
  }

  /**
   * Log an update action with field-level changes.
   * Automatically filters out changes where from === to (unless it's an added/removed array change).
   * Skips logging entirely if no actual changes remain after filtering.
   *
   * @example
   * await activityService.logUpdate(
   *   session,
   *   "users",
   *   { type: "user", id: user.id, name: user.name },
   *   [{ field: "name", from: "John", to: "Johnny" }],
   * );
   */
  async logUpdate(
    session: ActivitySession | string | null,
    resource: CoreResource | (string & {}),
    target: ActivityTarget,
    changes: ActivityChange[],
    options: ActivityOptions = {},
  ): Promise<void> {
    // Filter out changes where from === to (unless it's an added/removed array change)
    const filteredChanges = changes.filter((change) => {
      // Array changes (added/removed) are always included if they have items
      if (change.added?.length || change.removed?.length) return true;
      // For from/to changes, only include if values actually differ
      return !deepEqual(change.from, change.to);
    });

    // Skip logging if no actual changes
    if (filteredChanges.length === 0) return;

    const { scope, appId } = detectScope(resource);
    const details: ActivityDetails = {
      scope,
      appId,
      target,
      relatedTargets: options.relatedTargets,
      changes: filteredChanges,
      metadata: options.metadata,
    };
    await this.writeLog(session, `${resource}.update`, resource, target.id ?? null, details);
  }

  /**
   * Log a delete action.
   *
   * @example
   * await activityService.logDelete(
   *   session,
   *   "users",
   *   { type: "user", id: user.id, name: user.email },
   * );
   */
  async logDelete(
    session: ActivitySession | string | null,
    resource: CoreResource | (string & {}),
    target: ActivityTarget,
    options: ActivityOptions = {},
  ): Promise<void> {
    const { scope, appId } = detectScope(resource);
    const details: ActivityDetails = {
      scope,
      appId,
      target,
      relatedTargets: options.relatedTargets,
      metadata: options.metadata,
    };
    await this.writeLog(session, `${resource}.delete`, resource, target.id ?? null, details);
  }

  /**
   * Log a custom action (for non-CRUD operations like pin, revoke, enable, etc.).
   *
   * @example
   * await activityService.logAction(
   *   session,
   *   "pin",
   *   "notes",
   *   { type: "note", id: note.id, name: note.title },
   * );
   *
   * @example
   * await activityService.logAction(
   *   session,
   *   "revoke",
   *   "sessions",
   *   { type: "session", id: sessionId, name: "Chrome on Windows" },
   *   { metadata: { browser: "Chrome", os: "Windows" } }
   * );
   */
  async logAction(
    session: ActivitySession | string | null,
    action: CoreAction | (string & {}),
    resource: CoreResource | (string & {}),
    target: ActivityTarget,
    options: ActivityOptions & { changes?: ActivityChange[] } = {},
  ): Promise<void> {
    const { scope, appId } = detectScope(resource);
    const details: ActivityDetails = {
      scope,
      appId,
      target,
      relatedTargets: options.relatedTargets,
      changes: options.changes,
      metadata: options.metadata,
    };
    await this.writeLog(session, `${resource}.${action}`, resource, target.id ?? null, details);
  }

  /**
   * Log a login failure with rate limiting.
   * Returns true if logged, false if rate limited.
   * Uses Redis-backed rate limiting when available.
   *
   * Note: Login failures don't have a session yet, so sessionInfo will be null.
   * IP address for rate limiting can be passed via ipAddress parameter.
   */
  async logLoginFailure(identifier: string, reason: string, ipAddress?: string): Promise<boolean> {
    // Use Redis rate limiting if IP is available
    if (ipAddress) {
      const result = await checkRateLimit("auth", `login-failure:${ipAddress}`);
      // If rate limit check succeeded and we're over limit, don't log
      if (result && !result.success) {
        return false;
      }
    }

    const details: ActivityDetails = {
      scope: "system",
      target: { type: "auth", name: identifier },
      identifier,
      reason,
      // Store IP in metadata since we don't have a session
      metadata: ipAddress ? { ipAddress } : undefined,
    };

    await this.writeLog(null, "auth.login_failed", "auth", null, details);
    return true;
  }

  /**
   * Get paginated activities
   */
  async getActivities(
    filters: ActivityFilterOptions = {},
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<ActivityWithUser>> {
    return activityStorage.findManyPaginated(filters, options);
  }

  /**
   * Get distinct actions for filtering
   */
  async getDistinctActions(): Promise<string[]> {
    return activityStorage.getDistinctActions();
  }

  /**
   * Get distinct resources for filtering
   */
  async getDistinctResources(): Promise<string[]> {
    return activityStorage.getDistinctResources();
  }

  /**
   * Get version info for activity filters ETag.
   */
  async getFiltersVersion(): Promise<{ maxCreatedAt: Date | null; count: number }> {
    return activityStorage.getFiltersVersion();
  }

  /**
   * Get activity summary for dashboard
   */
  async getActivitySummary(days: number = 7): Promise<{ action: string; count: number }[]> {
    return activityStorage.getActivitySummary(days);
  }

  /**
   * Get recent activity for a user
   */
  async getRecentByUser(userId: string, limit: number = 10) {
    return activityStorage.getRecentByUser(userId, limit);
  }

  /**
   * Delete old activities (for retention policy)
   */
  async deleteOlderThan(days: number): Promise<number> {
    return activityStorage.deleteOlderThan(days);
  }

  // ===========================================================================
  // Chain Integrity Verification
  // ===========================================================================

  /**
   * Result of chain verification
   */

  /**
   * Verify the integrity of the activity log chain.
   *
   * Checks:
   * 1. Chain continuity (each entry's previousHash matches prior entry's contentHash)
   * 2. Signature validity (HMAC signature is correct for each entry)
   *
   * @param options.mode "quick" for recent entries only, "full" for entire chain
   * @param options.limit Number of entries to check in quick mode (default: 100)
   * @returns Verification result with details
   */
  async verifyChain(options: {
    mode: "quick" | "full";
    limit?: number;
  }): Promise<ChainVerificationResult> {
    const totalEntries = await activityStorage.getTotalCount();

    if (totalEntries === 0) {
      return {
        valid: true,
        totalEntries: 0,
        checkedEntries: 0,
        mode: options.mode,
      };
    }

    const batchSize = 1000;
    let checkedCount = 0;
    let previousContentHash: string | null = null;

    if (options.mode === "quick") {
      // Quick mode: verify the last N entries
      const limit = options.limit ?? 100;
      const entries = await activityStorage.findRecentForVerification(limit);

      if (entries.length === 0) {
        return {
          valid: true,
          totalEntries,
          checkedEntries: 0,
          mode: "quick",
        };
      }

      // Get the entry before our batch to verify the first entry's previousHash
      const firstEntry = entries[0];
      if (firstEntry.previousHash !== GENESIS_HASH) {
        const priorEntry = await activityStorage.findPreviousEntry(firstEntry.sequenceNumber);
        if (priorEntry) {
          previousContentHash = priorEntry.contentHash;
        } else {
          // First entry in batch should link to genesis if no prior entry exists
          // This means the batch starts from the beginning
          previousContentHash = GENESIS_HASH;
        }
      } else {
        previousContentHash = GENESIS_HASH;
      }

      // Verify the batch
      for (const entry of entries) {
        checkedCount++;

        // Recompute content hash from actual row data to detect modifications
        // Note: New entries use sessionInfo, old entries used ipAddress/userAgent
        const recomputedContent = JSON.stringify({
          userId: entry.userId,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          details: entry.details,
          sessionInfo: entry.sessionInfo,
          createdAt: entry.createdAt.toISOString(),
          previousHash: entry.previousHash,
        });
        const recomputedHash = computeContentHash(recomputedContent);

        if (recomputedHash !== entry.contentHash) {
          return {
            valid: false,
            totalEntries,
            checkedEntries: checkedCount,
            mode: "quick",
            brokenAt: {
              id: entry.id,
              sequenceNumber: entry.sequenceNumber,
              reason: "content_modified",
            },
          };
        }

        // Check chain link
        const expectedPreviousHash = previousContentHash ?? GENESIS_HASH;
        if (entry.previousHash !== expectedPreviousHash) {
          return {
            valid: false,
            totalEntries,
            checkedEntries: checkedCount,
            mode: "quick",
            brokenAt: {
              id: entry.id,
              sequenceNumber: entry.sequenceNumber,
              reason: "chain_break",
              expected: expectedPreviousHash,
              actual: entry.previousHash,
            },
          };
        }

        // Verify signature
        const signatureContent = `${entry.contentHash}:${entry.previousHash}`;
        if (!verifyActivitySignature(signatureContent, entry.signature)) {
          return {
            valid: false,
            totalEntries,
            checkedEntries: checkedCount,
            mode: "quick",
            brokenAt: {
              id: entry.id,
              sequenceNumber: entry.sequenceNumber,
              reason: "invalid_signature",
            },
          };
        }

        previousContentHash = entry.contentHash;
      }

      return {
        valid: true,
        totalEntries,
        checkedEntries: checkedCount,
        mode: "quick",
      };
    } else {
      // Full mode: verify entire chain in batches
      let startSequence = 0;
      previousContentHash = GENESIS_HASH;

      while (true) {
        const entries = await activityStorage.findForVerification({
          startSequence,
          limit: batchSize,
        });

        if (entries.length === 0) break;

        for (const entry of entries) {
          checkedCount++;

          // Recompute content hash from actual row data to detect modifications
          // Note: New entries use sessionInfo, old entries used ipAddress/userAgent
          // We need to check which format this entry uses
          const recomputedContent = JSON.stringify({
            userId: entry.userId,
            action: entry.action,
            resource: entry.resource,
            resourceId: entry.resourceId,
            details: entry.details,
            sessionInfo: entry.sessionInfo,
            createdAt: entry.createdAt.toISOString(),
            previousHash: entry.previousHash,
          });
          const recomputedHash = computeContentHash(recomputedContent);

          if (recomputedHash !== entry.contentHash) {
            return {
              valid: false,
              totalEntries,
              checkedEntries: checkedCount,
              mode: "full",
              brokenAt: {
                id: entry.id,
                sequenceNumber: entry.sequenceNumber,
                reason: "content_modified",
              },
            };
          }

          // Check chain link
          if (entry.previousHash !== previousContentHash) {
            return {
              valid: false,
              totalEntries,
              checkedEntries: checkedCount,
              mode: "full",
              brokenAt: {
                id: entry.id,
                sequenceNumber: entry.sequenceNumber,
                reason: "chain_break",
                expected: previousContentHash,
                actual: entry.previousHash,
              },
            };
          }

          // Verify signature
          const signatureContent = `${entry.contentHash}:${entry.previousHash}`;
          if (!verifyActivitySignature(signatureContent, entry.signature)) {
            return {
              valid: false,
              totalEntries,
              checkedEntries: checkedCount,
              mode: "full",
              brokenAt: {
                id: entry.id,
                sequenceNumber: entry.sequenceNumber,
                reason: "invalid_signature",
              },
            };
          }

          previousContentHash = entry.contentHash;
          startSequence = entry.sequenceNumber + 1;
        }

        // If we got fewer entries than the batch size, we're done
        if (entries.length < batchSize) break;
      }

      return {
        valid: true,
        totalEntries,
        checkedEntries: checkedCount,
        mode: "full",
      };
    }
  }
}

/**
 * Result of activity log chain verification
 */
export interface ChainVerificationResult {
  /** Whether the chain is valid */
  valid: boolean;
  /** Total number of entries in the activity log */
  totalEntries: number;
  /** Number of entries that were checked */
  checkedEntries: number;
  /** Verification mode used */
  mode: "quick" | "full";
  /** Details about where the chain broke (if invalid) */
  brokenAt?: {
    /** ID of the entry where the break was detected */
    id: string;
    /** Sequence number of the broken entry */
    sequenceNumber: number;
    /** Reason for the break */
    reason: "chain_break" | "invalid_signature" | "content_modified";
    /** Expected previous hash (for chain_break) */
    expected?: string;
    /** Actual previous hash found (for chain_break) */
    actual?: string;
  };
}
