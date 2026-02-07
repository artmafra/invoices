import { usersTable } from "@/schema/users.schema";
import { boolean, index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

/**
 * Authentication method used for login attempt
 */
export const authMethodEnum = ["password", "google", "passkey"] as const;
export type AuthMethod = (typeof authMethodEnum)[number];

/**
 * Login history table for tracking all authentication attempts (success and failure).
 *
 * This is a user-facing security feature separate from:
 * - user_sessions: Active session management
 * - activities: Admin audit log
 *
 * Records both successful and failed login attempts with:
 * - User identification (nullable for failed attempts where user doesn't exist)
 * - Authentication method used
 * - Client/device information
 * - Geolocation data
 *
 * Retention: 90 days (via cleanup cron job)
 */
export const loginHistoryTable = pgTable(
  "login_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // User identification (nullable for failed attempts where user doesn't exist)
    userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }),

    // Identifier used in login attempt (email) - useful for failed attempts
    identifier: varchar("identifier", { length: 255 }),

    // Login result
    success: boolean("success").notNull(),
    authMethod: varchar("auth_method", { length: 50 }).$type<AuthMethod>(),
    failureReason: varchar("failure_reason", { length: 255 }),

    // Client information
    ipAddress: varchar("ip_address", { length: 45 }), // IPv6 max length
    userAgent: text("user_agent"),

    // Device/browser info (parsed from userAgent)
    deviceType: varchar("device_type", { length: 50 }), // desktop, mobile, tablet
    browser: varchar("browser", { length: 100 }),
    os: varchar("os", { length: 100 }),

    // Geolocation (captured via ip-api.com)
    city: varchar("city", { length: 100 }),
    country: varchar("country", { length: 100 }),
    countryCode: varchar("country_code", { length: 2 }),
    region: varchar("region", { length: 100 }),

    // Timestamp
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Primary query pattern: user's login history ordered by time
    index("login_history_user_id_created_at_idx").on(table.userId, table.createdAt),
    // Filter by success/failure
    index("login_history_success_idx").on(table.success),
    // Lookup by IP (for security analysis)
    index("login_history_ip_address_idx").on(table.ipAddress),
    // Cleanup by date
    index("login_history_created_at_idx").on(table.createdAt),
  ],
);

export type LoginHistory = typeof loginHistoryTable.$inferSelect;
export type LoginHistoryNew = typeof loginHistoryTable.$inferInsert;
