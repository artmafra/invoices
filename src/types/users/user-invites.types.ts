import { z } from "zod";

// ========================================
// Admin User Invite Response Schemas
// ========================================

/**
 * Pending user invite information returned from admin API
 * Response type for GET /api/admin/users/invite
 */
export const pendingUserInviteResponseSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  roleId: z.uuid().nullable(),
  roleName: z.string().nullable(),
  invitedBy: z.uuid(),
  inviterName: z.string().nullable(),
  inviterEmail: z.email(),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export type PendingUserInviteResponse = z.infer<typeof pendingUserInviteResponseSchema>;

/**
 * Response type for POST /api/admin/users/invite
 */
export const createUserInviteResponseSchema = z.object({
  message: z.string(),
});

export type CreateUserInviteResponse = z.infer<typeof createUserInviteResponseSchema>;

/**
 * Response type for DELETE /api/admin/users/invite
 */
export const cancelUserInviteResponseSchema = z.object({
  message: z.string(),
});

export type CancelUserInviteResponse = z.infer<typeof cancelUserInviteResponseSchema>;

/**
 * Response type for PUT /api/admin/users/invite (resend)
 */
export const resendUserInviteResponseSchema = z.object({
  message: z.string(),
});

export type ResendUserInviteResponse = z.infer<typeof resendUserInviteResponseSchema>;

// ========================================
// Public User Invite Response Schemas (Auth Flow)
// ========================================

/**
 * Response type for GET /api/auth/invite (token validation)
 */
export const validateUserInviteResponseSchema = z.object({
  valid: z.boolean(),
  email: z.email().optional(),
  roleName: z.string().optional(),
  error: z.string().optional(),
});

export type ValidateUserInviteResponse = z.infer<typeof validateUserInviteResponseSchema>;

/**
 * Response type for POST /api/auth/invite
 */
export const acceptUserInviteResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  userId: z.uuid().optional(),
  error: z.string().optional(),
});

export type AcceptUserInviteResponse = z.infer<typeof acceptUserInviteResponseSchema>;

// ========================================
// Re-export Request Types from Validations
// ========================================

export type {
  CreateInviteRequest as CreateUserInviteRequest,
  AcceptInviteRequest as AcceptUserInviteRequest,
} from "@/validations/invite.validations";
