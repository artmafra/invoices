import type { User } from "@/schema/users.schema";
import type { AdminUserResponse, AdminUsersListResponse } from "@/types/users/users.types";
import type { PaginatedResult } from "@/storage/types";
import type { UserWithRole } from "@/storage/user.storage";
import { serializeDate } from "./base-dto.helper";

/**
 * User DTO
 * Transforms raw User entities to API response shapes
 */
export class UserDTO {
  /**
   * Transform raw User entity to admin API response (without role info)
   */
  static toAdminResponse(
    user: User | UserWithRole,
  ): Omit<AdminUserResponse, "roleName" | "isSystemRole"> {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      roleId: user.roleId,
      isActive: user.isActive,
      lastLoginAt: serializeDate(user.lastLoginAt),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  /**
   * Transform UserWithRole to detailed admin response
   * @param lockStatus Optional lock status to merge into the response
   */
  static toAdminDetailResponse(
    user: UserWithRole,
    lockStatus?: { locked: boolean; remainingSeconds?: number },
  ): AdminUserResponse {
    return {
      ...this.toAdminResponse(user),
      roleName: user.roleName,
      isSystemRole: user.isSystemRole,
      isLocked: lockStatus?.locked,
      lockRemainingSeconds: lockStatus?.remainingSeconds,
    };
  }

  /**
   * Transform paginated result to admin list response
   * @param lockStatuses Optional map of email -> lock status for bulk operations
   */
  static toPaginatedResponse(
    result: PaginatedResult<UserWithRole>,
    lockStatuses?: Map<string, { locked: boolean; remainingSeconds?: number }>,
  ): AdminUsersListResponse {
    return {
      users: result.data.map((user) => {
        const lockStatus = lockStatuses?.get(user.email.toLowerCase());
        return this.toAdminDetailResponse(user, lockStatus);
      }),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }
}
