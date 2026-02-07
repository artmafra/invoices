import { permissionsTable } from "@/schema/permissions.schema";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ========================================
// Permission Response Schema
// ========================================

// Base schema from database table
export const permissionResponseSchema = createSelectSchema(permissionsTable);

// ========================================
// Permission Group Schema
// ========================================

export const permissionGroupSchema = z.object({
  resource: z.string(),
  permissions: z.array(permissionResponseSchema),
});

// ========================================
// Type Exports
// ========================================

/** Single permission from the database */
export type PermissionResponse = z.infer<typeof permissionResponseSchema>;

/** Permissions grouped by resource */
export type PermissionGroup = z.infer<typeof permissionGroupSchema>;
