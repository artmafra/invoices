import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Better Auth `verification` model (OAuth state and short-lived verification values)
export const verificationsTable = pgTable(
  "verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);

export type Verification = typeof verificationsTable.$inferSelect;
export type VerificationNew = typeof verificationsTable.$inferInsert;
