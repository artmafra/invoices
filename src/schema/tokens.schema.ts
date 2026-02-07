import { usersTable } from "@/schema/users.schema";
import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

/**
 * Token types for the unified token system.
 *
 * - password_reset: One-time token for password recovery
 * - user_invite: Invitation token for new user registration
 * - email_change: Verification code for email address changes
 * - email_verification: Verification code for adding new email addresses
 * - two_factor_email: 2FA verification code sent via email
 */
export const tokenTypeEnum = pgEnum("token_type", [
  "password_reset",
  "user_invite",
  "email_change",
  "email_verification",
  "two_factor_email",
]);

export type TokenType = (typeof tokenTypeEnum.enumValues)[number];

/**
 * Unified tokens table for all verification/authentication tokens.
 *
 * This table handles common token mechanics:
 * - Secure hash storage (never store raw tokens)
 * - Expiration tracking
 * - Usage tracking via usedAt timestamp
 *
 * Type-specific metadata is stored in linked tables:
 * - user_invite -> user_invites table
 * - email_change -> email_change_requests table
 */
export const tokensTable = pgTable(
  "tokens",
  {
    id: uuid("id").primaryKey(),
    type: tokenTypeEnum("type").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    usedAt: timestamp("used_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    index("tokens_type_user_id_idx").on(table.type, table.userId),
    index("tokens_token_hash_idx").on(table.tokenHash),
    index("tokens_type_idx").on(table.type),
  ],
);

// Types
export type Token = typeof tokensTable.$inferSelect;
export type TokenNew = typeof tokensTable.$inferInsert;

// Zod schemas
export const insertTokenSchema = createInsertSchema(tokensTable);
export const selectTokenSchema = createSelectSchema(tokensTable);
