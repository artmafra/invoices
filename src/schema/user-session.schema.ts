import { usersTable } from "@/schema/users.schema";
import { boolean, index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

/**
 * User sessions table for tracking active login sessions.
 * This is separate from NextAuth's sessions table and is used for:
 * - Session viewer UI (see all active sessions)
 * - Session revocation (force logout)
 * - Login history and audit trail
 */
export const userSessionsTable = pgTable(
  "user_sessions",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),

    // Session identification
    sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),

    // Client information
    userAgent: text("user_agent"),
    ipAddress: varchar("ip_address", { length: 45 }), // IPv6 max length

    // Device/browser info (parsed from userAgent)
    deviceType: varchar("device_type", { length: 50 }), // desktop, mobile, tablet
    browser: varchar("browser", { length: 100 }),
    os: varchar("os", { length: 100 }),

    // Geolocation (captured at session creation via ip-api.com)
    city: varchar("city", { length: 100 }),
    country: varchar("country", { length: 100 }),
    countryCode: varchar("country_code", { length: 2 }),
    region: varchar("region", { length: 100 }),

    // Session state
    isRevoked: boolean("is_revoked").notNull().default(false),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedReason: varchar("revoked_reason", { length: 255 }),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    absoluteExpiresAt: timestamp("absolute_expires_at", { withTimezone: true }).notNull(),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("user_sessions_user_id_idx").on(table.userId),
    index("user_sessions_expires_at_idx").on(table.expiresAt),
    index("user_sessions_is_revoked_idx").on(table.isRevoked),
  ],
);

export type UserSession = typeof userSessionsTable.$inferSelect;
export type UserSessionNew = typeof userSessionsTable.$inferInsert;
