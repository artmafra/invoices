import { usersTable } from "@/schema/users.schema";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ========================================
// Admin User Response Schema
// ========================================

// Base schema from database table, picking admin-relevant fields
const adminUserBaseSchema = createSelectSchema(usersTable).pick({
  id: true,
  email: true,
  name: true,
  image: true,
  roleId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
});

// Extended schema with computed/joined fields and JSON serialization
export const adminUserResponseSchema = adminUserBaseSchema
  .extend({
    // Joined from roles table
    roleName: z.string().nullable(),
    // Whether the role is a system role (protected)
    isSystemRole: z.boolean(),
    // Lock status from login protection
    isLocked: z.boolean().optional(),
    lockRemainingSeconds: z.number().optional(),
    // Override date fields to string (JSON serialization)
    lastLoginAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

// ========================================
// Admin Users List Response Schema (Paginated)
// ========================================

export const adminUsersListResponseSchema = z.object({
  users: z.array(adminUserResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

// ========================================
// Admin User Stats Schema
// ========================================

export const adminUserStatsSchema = z.object({
  total: z.number(),
  active: z.number(),
  inactive: z.number(),
  roleDistribution: z.record(z.string(), z.number()),
  recentUsers: z.array(adminUserResponseSchema),
});

// ========================================
// Admin User Filters Schema
// ========================================

export const adminUserFiltersSchema = z.object({
  search: z.string().optional(),
  roleId: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

// ========================================
// Impersonation Schemas
// ========================================

export const impersonateUserDataSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
  image: z.string().nullable(),
  role: z.string(),
  roleId: z.string().nullable(),
  permissions: z.array(z.string()),
});

export const startImpersonationResponseSchema = z.object({
  success: z.boolean(),
  impersonatedUser: impersonateUserDataSchema,
  impersonateToken: z.string(), // Secure token for session.update()
  originalUser: impersonateUserDataSchema,
});

export const endImpersonationResponseSchema = z.object({
  success: z.boolean(),
  originalUser: impersonateUserDataSchema,
  endImpersonationToken: z.string(), // Secure token for session.update()
});

// ========================================
// App Permissions Types
// ========================================

export const userAppPermissionsSchema = z.object({
  /** Permissions grouped by app: { appId: [actions] } */
  permissions: z.record(z.string(), z.array(z.string())),
  /** App IDs user has any permission for */
  apps: z.array(z.string()),
});

// ========================================
// User Hover Card Response Schema
// ========================================

export const userHoverCardResponseSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
  image: z.string().nullable(),
  roleName: z.string().nullable(),
  isActive: z.boolean(),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
});

// ========================================
// Type Exports
// ========================================

/** Response type for GET /api/admin/users - admin user list item */
export type AdminUserResponse = z.infer<typeof adminUserResponseSchema>;

/** Response type for GET /api/admin/users - paginated list */
export type AdminUsersListResponse = z.infer<typeof adminUsersListResponseSchema>;

/** Stats response for admin users dashboard */
export type AdminUserStats = z.infer<typeof adminUserStatsSchema>;

/** Filter options for admin user queries */
export type AdminUserFilters = z.infer<typeof adminUserFiltersSchema>;

/** User data in impersonation context */
export type ImpersonateUserData = z.infer<typeof impersonateUserDataSchema>;

/** Response type for POST /api/admin/users/:id/impersonate */
export type StartImpersonationResponse = z.infer<typeof startImpersonationResponseSchema>;

/** Response type for DELETE /api/admin/impersonate */
export type EndImpersonationResponse = z.infer<typeof endImpersonationResponseSchema>;

/** User's app-level permissions grouped by module */
export type UserAppPermissions = z.infer<typeof userAppPermissionsSchema>;

/** Response type for GET /api/admin/users/:id/hover - minimal user data for hover card */
export type UserHoverCardResponse = z.infer<typeof userHoverCardResponseSchema>;

// ========================================
// Re-export Request Types from Validations
// ========================================

export type { CreateUserRequest, UpdateUserRequest } from "@/validations/user.validations";
