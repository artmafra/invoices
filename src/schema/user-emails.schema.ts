import { usersTable } from "@/schema/users.schema";
import { boolean, index, pgTable, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

/**
 * User emails table - stores multiple email addresses per user.
 *
 * Each user can have multiple email addresses:
 * - One email must be marked as primary (used for notifications and login display)
 * - All emails must be verified before they can be used for login
 * - Each email address must be unique across all users
 *
 * The primary email is also synced to users.email for backward compatibility.
 */
export const userEmailsTable = pgTable(
  "user_emails",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Each email address must be unique globally
    unique("user_emails_email_unique").on(table.email),
    // Index for looking up emails by user
    index("user_emails_user_id_idx").on(table.userId),
    // Index for finding primary email quickly
    index("user_emails_user_id_primary_idx").on(table.userId, table.isPrimary),
  ],
);

// Types
export type UserEmail = typeof userEmailsTable.$inferSelect;
export type UserEmailNew = typeof userEmailsTable.$inferInsert;

// Zod schemas
export const insertUserEmailSchema = createInsertSchema(userEmailsTable);
export const selectUserEmailSchema = createSelectSchema(userEmailsTable);
