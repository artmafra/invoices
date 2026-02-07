import { rolesTable } from "@/schema/roles.schema";
import { boolean, index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const usersTable = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().notNull(),
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 255 }).notNull().unique(),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    image: varchar("image", { length: 255 }),
    password: varchar("password", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    isActive: boolean("is_active").default(true).notNull(),
    roleId: uuid("role_id").references(() => rolesTable.id, { onDelete: "set null" }),
    twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(), // Legacy field - kept for backward compatibility
    emailTwoFactorEnabled: boolean("email_two_factor_enabled").default(false).notNull(),
    totpTwoFactorEnabled: boolean("totp_two_factor_enabled").default(false).notNull(),
    twoFactorSecret: varchar("two_factor_secret", { length: 512 }), // TOTP secret (AES-256-GCM encrypted)
    twoFactorBackupCodes: varchar("two_factor_backup_codes", { length: 4096 }), // JSON array of bcrypt hashed backup codes
    preferredTwoFactorMethod: varchar("preferred_two_factor_method", {
      length: 10,
    }).default("email"), // "email" or "totp"
    locale: varchar("locale", { length: 10 }), // User's preferred language for emails (e.g., "en-US", "pt-BR")
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("users_role_id_idx").on(table.roleId),
    index("users_is_active_idx").on(table.isActive),
  ],
);

export type User = typeof usersTable.$inferSelect;
export type UserNew = typeof usersTable.$inferInsert;
