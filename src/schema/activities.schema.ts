import { usersTable } from "@/schema/users.schema";
import { sql } from "drizzle-orm";
import {
  bigserial,
  customType,
  index,
  json,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { SessionInfo } from "@/types/common/geolocation.types";

// Custom type for tsvector (PostgreSQL full-text search)
const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

/**
 * Activity log table with integrity protection via hash chaining.
 *
 * Integrity fields:
 * - sequenceNumber: Auto-incrementing sequence for ordering
 * - contentHash: SHA-256 hash of the log entry content
 * - previousHash: Hash of the previous entry (creates a chain)
 *   - First entry uses "genesis" as previousHash
 * - signature: HMAC-SHA256 signature using ENCRYPTION_KEY
 *
 * This chain structure ensures:
 * - Modification detection (content hash changes)
 * - Deletion detection (chain breaks)
 * - Authenticity proof (only server can sign)
 * - Ordering proof (sequence + chain)
 *
 * Note: Using JSON (not JSONB) to preserve key ordering for hash integrity.
 * JSONB reorders keys, which would break hash verification.
 */
export const activitiesTable = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id").references(() => usersTable.id, { onDelete: "set null" }),
    action: varchar("action", { length: 100 }).notNull(), // e.g., "user.create", "role.update"
    resource: varchar("resource", { length: 100 }).notNull(), // e.g., "users", "roles", "settings"
    resourceId: varchar("resource_id", { length: 255 }), // ID of affected resource
    details: json("details"), // JSON with old/new values, metadata (not JSONB to preserve key order)
    sessionInfo: json("session_info").$type<SessionInfo>(), // Session context snapshot (device, browser, OS, IP, location)
    // Full-text search vector (generated column with GIN index for fast search)
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`to_tsvector('english', coalesce(action, '') || ' ' || coalesce(resource, '') || ' ' || coalesce(details::text, '') || ' ' || coalesce(session_info::text, ''))`,
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    // Integrity protection fields (hash chain + HMAC signature)
    sequenceNumber: bigserial("sequence_number", { mode: "number" }).notNull(),
    contentHash: varchar("content_hash", { length: 64 }).notNull(), // SHA-256 = 64 hex chars
    previousHash: varchar("previous_hash", { length: 64 }).notNull(), // "genesis" for first entry
    signature: varchar("signature", { length: 64 }).notNull(), // HMAC-SHA256 = 64 hex chars
  },
  (table) => [
    index("activities_user_id_idx").on(table.userId),
    index("activities_created_at_idx").on(table.createdAt),
    index("activities_user_id_created_at_idx").on(table.userId, table.createdAt),
    // GIN index for full-text search (100x faster than ILIKE on large datasets)
    index("activities_search_vector_idx").using("gin", sql`search_vector`),
  ],
);

export type Activity = typeof activitiesTable.$inferSelect;
export type ActivityNew = typeof activitiesTable.$inferInsert;
