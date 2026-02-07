import { z } from "zod";
import { baseQuerySchema } from "./query.validations";

// ========================================
// User Query Schemas
// ========================================

export const getUsersQuerySchema = baseQuerySchema.extend({
  roleId: z.uuid().optional(),
  active: z.coerce.boolean().optional(),
});

// ========================================
// User Param Schemas
// ========================================

export const userIdParamSchema = z.object({
  userId: z.uuid("Invalid user ID format"),
});

export type UserIdParam = z.infer<typeof userIdParamSchema>;

// ========================================
// User Create/Update Schemas
// ========================================

/** Request data for creating a new user via admin */
export const createUserRequestSchema = z.object({
  email: z.email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  roleId: z.uuid("Invalid role ID format").nullable(),
});

/** Request data for updating a user via admin */
export const updateUserRequestSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.email("Invalid email address").optional(),
  roleId: z.uuid("Invalid role ID format").nullable().optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional()
    .or(z.literal("")),
  emailVerified: z.date().nullable().optional(),
});

// ========================================
// Type Exports
// ========================================

export type GetUsersQuery = z.infer<typeof getUsersQuerySchema>;
export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;
export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>;
