import { rolesTable } from "@/schema/roles.schema";
import { tokensTable } from "@/schema/tokens.schema";
import { usersTable } from "@/schema/users.schema";
import { index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

/**
 * User invites table - stores invite-specific metadata.
 *
 * The token mechanics (hash, expiry, usage) are stored in the tokens table.
 * This table holds the business data specific to user invitations:
 * - Who was invited (email)
 * - What role they'll receive
 * - Who sent the invite
 */
export const userInvitesTable = pgTable(
  "user_invites",
  {
    id: uuid("id").primaryKey(),
    tokenId: uuid("token_id")
      .notNull()
      .unique()
      .references(() => tokensTable.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    roleId: uuid("role_id").references(() => rolesTable.id, { onDelete: "set null" }),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("user_invites_email_idx").on(table.email),
    index("user_invites_token_id_idx").on(table.tokenId),
    index("user_invites_role_id_idx").on(table.roleId),
    index("user_invites_invited_by_idx").on(table.invitedBy),
  ],
);

// Types
export type UserInvite = typeof userInvitesTable.$inferSelect;
export type UserInviteNew = typeof userInvitesTable.$inferInsert;

// Zod schemas
export const insertUserInviteSchema = createInsertSchema(userInvitesTable);
export const selectUserInviteSchema = createSelectSchema(userInvitesTable);
