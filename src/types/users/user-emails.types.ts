import { userEmailsTable } from "@/schema/user-emails.schema";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ========================================
// User Email Response Schema
// ========================================

const userEmailBaseSchema = createSelectSchema(userEmailsTable).pick({
  id: true,
  email: true,
  isPrimary: true,
});

export const userEmailResponseSchema = userEmailBaseSchema
  .extend({
    isVerified: z.boolean(),
    verifiedAt: z.string().nullable(),
    createdAt: z.string(),
  })
  .strict();

// ========================================
// User Emails List Response Schema
// ========================================

export const userEmailsListResponseSchema = z.object({
  emails: z.array(userEmailResponseSchema),
});

// ========================================
// Add Email Response Schema
// ========================================

export const addUserEmailResponseSchema = z.object({
  email: userEmailResponseSchema,
  codeSent: z.boolean(),
  message: z.string(),
});

// ========================================
// Verify Email Response Schema
// ========================================

export const verifyUserEmailResponseSchema = z.object({
  email: userEmailResponseSchema,
  message: z.string(),
});

// ========================================
// Type Exports
// ========================================

export type UserEmailResponse = z.infer<typeof userEmailResponseSchema>;
export type UserEmailsListResponse = z.infer<typeof userEmailsListResponseSchema>;
export type AddUserEmailResponse = z.infer<typeof addUserEmailResponseSchema>;
export type VerifyUserEmailResponse = z.infer<typeof verifyUserEmailResponseSchema>;

// Re-export request types from validations
export type {
  AddUserEmailRequest,
  VerifyUserEmailRequest,
} from "@/validations/profile.validations";
