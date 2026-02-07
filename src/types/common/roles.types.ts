import { rolesTable } from "@/schema/roles.schema";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ========================================
// Role Response Schema
// ========================================

// Base schema from database table
const roleBaseSchema = createSelectSchema(rolesTable).pick({
  id: true,
  name: true,
  displayName: true,
  description: true,
  isProtected: true,
  isSystem: true,
  createdAt: true,
  updatedAt: true,
});

// Extended schema with computed fields and JSON serialization
export const roleResponseSchema = roleBaseSchema
  .extend({
    // Aggregated from role_permissions join
    permissions: z.array(z.string()),
    // Count of users with this role
    userCount: z.number(),
    // Override date fields to string (JSON serialization)
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

// ========================================
// Role Filter Schema
// ========================================

export const roleFiltersSchema = z.object({
  search: z.string().optional(),
  enabled: z.boolean().optional(),
  assignableOnly: z.boolean().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
});

// ========================================
// Paginated Response Schema
// ========================================

export const paginatedRolesResponseSchema = z.object({
  roles: z.array(roleResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

// ========================================
// Type Exports
// ========================================

/** Response type for GET /api/admin/roles - role list item */
export type RoleResponse = z.infer<typeof roleResponseSchema>;

/** Paginated response for role list */
export type PaginatedRolesResponse = z.infer<typeof paginatedRolesResponseSchema>;

/** Filter options for role queries */
export type RoleFilters = z.infer<typeof roleFiltersSchema>;

// Re-export request types from validations for convenience
export type { CreateRoleRequest, UpdateRoleRequest } from "@/validations/role.validations";
