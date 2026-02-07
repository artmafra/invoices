import type { LoginHistory } from "@/schema/login-history.schema";
import type {
  LoginHistoryListResponse,
  LoginHistoryResponse,
  RecentLoginHistoryResponse,
} from "@/types/auth/login-history.types";
import type { PaginatedResult } from "@/storage/types";
import { transformPaginatedResult } from "./base-dto.helper";

/**
 * Login History DTO
 * Transforms raw LoginHistory entities to API response shapes
 */
export class LoginHistoryDTO {
  /**
   * Transform raw LoginHistory entity to API response
   */
  static toResponse(entry: LoginHistory): LoginHistoryResponse {
    return {
      id: entry.id,
      success: entry.success,
      authMethod: entry.authMethod,
      failureReason: entry.failureReason,
      ipAddress: entry.ipAddress,
      deviceType: entry.deviceType,
      browser: entry.browser,
      os: entry.os,
      city: entry.city,
      country: entry.country,
      countryCode: entry.countryCode,
      region: entry.region,
      createdAt: entry.createdAt.toISOString(),
    };
  }

  /**
   * Transform paginated result to list response
   */
  static toPaginatedResponse(result: PaginatedResult<LoginHistory>): LoginHistoryListResponse {
    return transformPaginatedResult(result, (entry) => this.toResponse(entry));
  }

  /**
   * Transform array to recent login history response
   */
  static toRecentResponse(entries: LoginHistory[]): RecentLoginHistoryResponse {
    return {
      data: entries.map((entry) => this.toResponse(entry)),
    };
  }
}
