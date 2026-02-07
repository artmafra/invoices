import { permissionsTable } from "@/schema/permissions.schema";
import { rolesTable } from "@/schema/roles.schema";
import { index, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";

export const rolePermissionsTable = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => rolesTable.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissionsTable.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permissionId] }),
    index("role_permissions_permission_id_idx").on(table.permissionId),
  ],
);

export type RolePermission = typeof rolePermissionsTable.$inferSelect;
export type RolePermissionNew = typeof rolePermissionsTable.$inferInsert;
