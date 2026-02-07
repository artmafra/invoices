import { z } from "zod";
import { baseQuerySchema } from "./query.validations";

// ========================================
// Role Query Schemas
// ========================================

export const getRolesQuerySchema = baseQuerySchema.extend({
  assignable: z.coerce.boolean().optional(),
});

// ========================================
// Role Create/Update Schemas
// ========================================

export const createRoleSchema = z.object({
  displayName: z
    .string()
    .min(2, "Role name must be at least 2 characters")
    .max(100, "Role name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  permissionIds: z.array(z.uuid()).optional(),
});

export const updateRoleSchema = z.object({
  displayName: z
    .string()
    .min(2, "Role name must be at least 2 characters")
    .max(100, "Role name must be less than 100 characters")
    .optional(),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .nullable()
    .optional(),
  permissionIds: z.array(z.uuid()).optional(),
});

export const roleIdSchema = z.object({
  id: z.uuid("Invalid role ID"),
});

// ========================================
// Permission Schemas
// ========================================

export const setRolePermissionsSchema = z.object({
  permissionIds: z.array(z.uuid()),
});

// ========================================
// Type Exports
// ========================================

/** Request data for creating a role */
export type CreateRoleRequest = z.infer<typeof createRoleSchema>;

/** Request data for updating a role */
export type UpdateRoleRequest = z.infer<typeof updateRoleSchema>;

export type SetRolePermissionsRequest = z.infer<typeof setRolePermissionsSchema>;
