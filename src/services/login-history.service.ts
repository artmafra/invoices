import { LoginHistoryDTO } from "@/dtos/login-history.dto";
import type { AuthMethod, LoginHistory, LoginHistoryNew } from "@/schema/login-history.schema";
import type {
  LoginHistoryListResponse,
  RecentLoginHistoryResponse,
} from "@/types/auth/login-history.types";
import { parseUserAgent } from "@/lib/user-agent";
import type { LoginHistoryFilterOptions } from "@/storage/login-history.storage";
import { loginHistoryStorage } from "@/storage/runtime/login-history";
import type { PaginationOptions } from "@/storage/types";
import type { ActivityService } from "@/services/activity.service";
import type { GeolocationService } from "@/services/geolocation.service";

/**
 * Parameters for recording a login attempt
 */
export interface RecordAttemptParams {
  /** User ID (null for failed attempts where user doesn't exist) */
  userId?: string | null;
  /** User's display name (for successful logins) */
  userName?: string | null;
  /** Email/identifier used in login attempt */
  identifier?: string | null;
  /** Whether the login was successful */
  success: boolean;
  /** Authentication method used */
  authMethod: AuthMethod;
  /** Reason for failure (for failed attempts) */
  failureReason?: string | null;
  /** Client IP address */
  ipAddress?: string | null;
  /** Client user agent string */
  userAgent?: string | null;
  /** Session ID for activity logging (only for successful logins) */
  sessionId?: string;
}

export class LoginHistoryService {
  private activityService: ActivityService;
  private geolocationService: GeolocationService;

  constructor(activityService: ActivityService, geolocationService: GeolocationService) {
    this.activityService = activityService;
    this.geolocationService = geolocationService;
  }

  /**
   * Record a login attempt (success or failure)
   *
   * - Parses user agent for device/browser/OS info
   * - Fetches geolocation data from IP
   * - Creates login history entry
   * - For successful logins: also logs to Activity Log
   */
  async recordAttempt(params: RecordAttemptParams): Promise<LoginHistory> {
    const {
      userId,
      userName,
      identifier,
      success,
      authMethod,
      failureReason,
      ipAddress,
      userAgent,
      sessionId,
    } = params;

    // Parse user agent for device info
    const { browser, os, deviceType } = parseUserAgent(userAgent);

    // Fetch geolocation (async, non-blocking for login flow)
    const geo = await this.geolocationService.getLocation(ipAddress ?? null);

    // Create login history entry
    const entry: LoginHistoryNew = {
      userId: userId ?? null,
      identifier: identifier ?? null,
      success,
      authMethod,
      failureReason: failureReason ?? null,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      deviceType,
      browser,
      os,
      city: geo?.city ?? null,
      country: geo?.country ?? null,
      countryCode: geo?.countryCode ?? null,
      region: geo?.region ?? null,
    };

    const created = await loginHistoryStorage.create(entry);

    // For successful logins, also log to Activity Log
    if (success && userId) {
      await this.activityService.logAction(
        sessionId ? { sessionId, user: { id: userId, email: identifier ?? undefined } } : userId,
        "login_success",
        "auth",
        {
          type: "user",
          id: userId,
          name: userName ?? identifier ?? "Unknown",
        },
        {
          metadata: {
            authMethod,
            email: identifier,
            ipAddress,
            browser,
            os,
            deviceType,
            city: geo?.city,
            country: geo?.country,
          },
        },
      );
    }

    return created;
  }

  /**
   * Get paginated login history for a user
   */
  async getHistory(
    userId: string,
    filters: Omit<LoginHistoryFilterOptions, "userId"> = {},
    options: PaginationOptions = {},
  ): Promise<LoginHistoryListResponse> {
    const result = await loginHistoryStorage.findManyPaginated({ ...filters, userId }, options);
    return LoginHistoryDTO.toPaginatedResponse(result);
  }

  /**
   * Get recent login history for a user
   */
  async getRecent(userId: string, limit: number = 5): Promise<RecentLoginHistoryResponse> {
    const items = await loginHistoryStorage.findRecent(userId, limit);
    return LoginHistoryDTO.toRecentResponse(items);
  }

  /**
   * Delete login history entries older than specified days
   * Used by cleanup cron job for 90-day retention
   */
  async deleteOlderThan(days: number): Promise<number> {
    return loginHistoryStorage.deleteOlderThan(days);
  }

  /**
   * Get login attempt counts for security analysis
   */
  async getAttemptCounts(
    userId: string,
    since?: Date,
  ): Promise<{ total: number; successful: number; failed: number }> {
    const [total, successful, failed] = await Promise.all([
      loginHistoryStorage.countAttempts(userId, { since }),
      loginHistoryStorage.countAttempts(userId, { success: true, since }),
      loginHistoryStorage.countAttempts(userId, { success: false, since }),
    ]);

    return { total, successful, failed };
  }
}
