import { z } from "zod";

// ========================================
// Invite Creation Schema (Admin)
// ========================================

export const createInviteSchema = z.object({
  email: z.email("Invalid email address"),
  roleId: z.uuid().optional().nullable(),
});

// ========================================
// Invite Validation Schema (Public)
// ========================================

export const validateInviteTokenSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

// ========================================
// Invite Acceptance Schema (Public)
// ========================================

export const acceptInviteSchema = z.object({
  token: z.string().min(1, "Token is required"),
  name: z.string().min(1, "Name is required").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
});

// ========================================
// Type Exports
// ========================================

export type CreateInviteRequest = z.infer<typeof createInviteSchema>;
export type ValidateInviteTokenRequest = z.infer<typeof validateInviteTokenSchema>;
export type AcceptInviteRequest = z.infer<typeof acceptInviteSchema>;
