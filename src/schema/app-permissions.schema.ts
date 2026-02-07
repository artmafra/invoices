import { usersTable } from "@/schema/users.schema";
import { index, pgTable, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";

/**
 * App Permissions Table
 *
 * Stores per-user, per-app permissions. This is separate from RBAC (roles).
 * - RBAC handles global/system permissions (users.*, roles.*, settings.*, etc.)
 * - This table handles app-specific permissions (notes.*, tasks.*, etc.)
 *
 * Each row represents a single permission grant: (userId, appId, action)
 * Example: User "abc" has "notes.view" and "notes.create" = 2 rows
 */
export const appPermissionsTable = pgTable(
  "app_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    /** App ID from registry (e.g., "notes", "tasks") */
    appId: varchar("app_id", { length: 100 }).notNull(),
    /** Permission action (e.g., "view", "create", "edit", "delete") */
    action: varchar("action", { length: 100 }).notNull(),
    grantedAt: timestamp("granted_at", { mode: "string", withTimezone: true })
      .defaultNow()
      .notNull(),
    grantedBy: uuid("granted_by").references(() => usersTable.id, { onDelete: "set null" }),
  },
  (table) => [
    unique("app_permissions_user_app_action_unique").on(table.userId, table.appId, table.action),
    index("app_permissions_user_id_idx").on(table.userId),
    index("app_permissions_granted_by_idx").on(table.grantedBy),
  ],
);

export type AppPermission = typeof appPermissionsTable.$inferSelect;
export type AppPermissionNew = typeof appPermissionsTable.$inferInsert;
