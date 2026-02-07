import { usersTable } from "@/schema/users.schema";
import { index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

// WebAuthn challenges for registration and authentication
// Challenges are single-use and time-limited (5 minutes)
export const passkeyChallengesTable = pgTable(
  "passkey_challenges",
  {
    id: uuid("id").primaryKey().notNull(),
    challenge: text("challenge").notNull().unique(), // Base64URL encoded challenge
    type: varchar("type", { length: 20 }).notNull(), // "registration" or "authentication"
    // userId is null for authentication (we don't know who's logging in yet)
    userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("passkey_challenges_user_id_idx").on(table.userId),
    index("passkey_challenges_expires_at_idx").on(table.expiresAt),
  ],
);

export type PasskeyChallenge = typeof passkeyChallengesTable.$inferSelect;
export type PasskeyChallengeNew = typeof passkeyChallengesTable.$inferInsert;
