import type { Role } from "@/schema/roles.schema";
import type { PaginatedRolesResponse, RoleResponse } from "@/types/common/roles.types";
import type { RoleWithPermissions } from "@/storage/role.storage";
import type { PaginatedResult } from "@/storage/types";

/**
 * Role DTO
 * Transforms raw Role entities to API response shapes
 */
export class RoleDTO {
  /**
   * Transform raw Role entity to admin API response
   */
  static toAdminResponse(role: Role, userCount: number = 0): Omit<RoleResponse, "permissions"> {
    return {
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      isProtected: role.isProtected,
      isSystem: role.isSystem,
      userCount,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    };
  }

  /**
   * Transform RoleWithPermissions to detailed admin response
   */
  static toAdminDetailResponse(role: RoleWithPermissions, userCount: number = 0): RoleResponse {
    return {
      ...this.toAdminResponse(role, userCount),
      permissions: role.permissions,
    };
  }

  /**
   * Transform paginated result to admin list response
   * @param userCounts Map of roleId -> user count
   */
  static toPaginatedResponse(
    result: PaginatedResult<RoleWithPermissions>,
    userCounts: Record<string, number> = {},
  ): PaginatedRolesResponse {
    return {
      roles: result.data.map((role) => this.toAdminDetailResponse(role, userCounts[role.id] || 0)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * Transform array of roles (assignable-only mode)
   * @param userCounts Map of roleId -> user count
   */
  static toAssignableRolesResponse(
    roles: RoleWithPermissions[],
    userCounts: Record<string, number> = {},
  ): RoleResponse[] {
    return roles.map((role) => this.toAdminDetailResponse(role, userCounts[role.id] || 0));
  }

  /**
   * Transform array of roles to paginated response (assignable-only mode)
   * Wraps in pagination envelope for consistent API contract
   * @param userCounts Map of roleId -> user count
   */
  static toAssignableRolesPaginatedResponse(
    roles: RoleWithPermissions[],
    userCounts: Record<string, number> = {},
  ): PaginatedRolesResponse {
    const transformedRoles = roles.map((role) =>
      this.toAdminDetailResponse(role, userCounts[role.id] || 0),
    );
    return {
      roles: transformedRoles,
      total: roles.length,
      page: 1,
      limit: roles.length,
      totalPages: 1,
    };
  }
}
