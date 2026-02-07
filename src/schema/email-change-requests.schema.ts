import { tokensTable } from "@/schema/tokens.schema";
import { index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

/**
 * Email change requests table - stores email change specific metadata.
 *
 * The token mechanics (hash, expiry, usage) are stored in the tokens table.
 * This table holds the business data specific to email changes:
 * - The new email address being requested
 */
export const emailChangeRequestsTable = pgTable(
  "email_change_requests",
  {
    id: uuid("id").primaryKey(),
    tokenId: uuid("token_id")
      .notNull()
      .unique()
      .references(() => tokensTable.id, { onDelete: "cascade" }),
    newEmail: varchar("new_email", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("email_change_requests_token_id_idx").on(table.tokenId)],
);

// Types
export type EmailChangeRequest = typeof emailChangeRequestsTable.$inferSelect;
export type EmailChangeRequestNew = typeof emailChangeRequestsTable.$inferInsert;

// Zod schemas
export const insertEmailChangeRequestSchema = createInsertSchema(emailChangeRequestsTable);
export const selectEmailChangeRequestSchema = createSelectSchema(emailChangeRequestsTable);
