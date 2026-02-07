import type { UserSession } from "@/schema/user-session.schema";
import type {
  ProfileSessionsListResponse,
  SessionsListResponse,
  UserSessionResponse,
} from "@/types/sessions/sessions.types";
import type { PaginatedResult } from "@/storage/types";
import type { UserSessionWithUser } from "@/storage/user-session.storage";

/**
 * User Session DTO
 * Transforms raw UserSession entities to API response shapes
 */
export class UserSessionDTO {
  /**
   * Transform raw UserSession entity to admin API response
   */
  static toAdminResponse(
    session: UserSession,
  ): Omit<UserSessionResponse, "userName" | "userEmail"> {
    return {
      id: session.id,
      userId: session.userId,
      deviceType: session.deviceType,
      browser: session.browser,
      os: session.os,
      ipAddress: session.ipAddress,
      city: session.city,
      country: session.country,
      countryCode: session.countryCode,
      region: session.region,
      createdAt: session.createdAt.toISOString(),
      lastActivityAt: session.lastActivityAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    };
  }

  /**
   * Transform UserSessionWithUser to detailed admin response
   */
  static toAdminDetailResponse(session: UserSessionWithUser): UserSessionResponse {
    return {
      ...this.toAdminResponse(session),
      userName: session.userName,
      userEmail: session.userEmail,
    };
  }

  /**
   * Transform paginated result to admin list response
   */
  static toPaginatedResponse(result: PaginatedResult<UserSessionWithUser>): SessionsListResponse {
    return {
      sessions: result.data.map((session) => this.toAdminDetailResponse(session)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * Transform array of sessions for profile endpoint (excludes user info)
   */
  static toProfileSessionsResponse(sessions: UserSession[]): ProfileSessionsListResponse {
    return {
      sessions: sessions.map((session) => ({
        id: session.id,
        deviceType: session.deviceType,
        browser: session.browser,
        os: session.os,
        ipAddress: session.ipAddress,
        city: session.city,
        country: session.country,
        countryCode: session.countryCode,
        region: session.region,
        createdAt: session.createdAt.toISOString(),
        lastActivityAt: session.lastActivityAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      })),
    };
  }
}
