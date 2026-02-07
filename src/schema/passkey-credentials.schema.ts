import { usersTable } from "@/schema/users.schema";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// WebAuthn passkey credentials
export const passkeyCredentialsTable = pgTable(
  "passkey_credentials",
  {
    id: uuid("id").primaryKey().notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    credentialId: text("credential_id").notNull().unique(), // Base64URL encoded credential ID
    publicKey: text("public_key").notNull(), // Base64URL encoded COSE public key
    counter: integer("counter").notNull().default(0), // Signature counter for replay attack prevention
    deviceType: varchar("device_type", { length: 50 }), // "singleDevice" or "multiDevice" (synced passkeys)
    backedUp: boolean("backed_up").default(false).notNull(), // Whether the credential is backed up (synced)
    transports: text("transports"), // JSON array of transports: ["internal", "usb", "ble", "nfc", "hybrid"]
    name: varchar("name", { length: 255 }), // User-friendly device/passkey name
    aaguid: varchar("aaguid", { length: 36 }), // Authenticator Attestation GUID
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => [index("passkey_credentials_user_id_idx").on(table.userId)],
);

export type PasskeyCredential = typeof passkeyCredentialsTable.$inferSelect;
export type PasskeyCredentialNew = typeof passkeyCredentialsTable.$inferInsert;
