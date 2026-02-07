/**
 * Re-encryption Migration Script
 *
 * Migrates all encrypted data from legacy keys to the current primary key.
 * Run this after rotating ENCRYPTION_KEY to ensure all data uses the new key.
 *
 * Usage:
 *   npx tsx scripts/db/reencrypt.ts
 *   npx tsx scripts/db/reencrypt.ts --dry-run   # Preview without changes
 *   npx tsx scripts/db/reencrypt.ts --json      # Machine-readable output
 *
 * Prerequisites:
 *   - ENCRYPTION_KEY set to the NEW key
 *   - ENCRYPTION_KEYS_LEGACY set to OLD key(s) that data was encrypted with
 */

import "dotenv/config";
import { getBooleanArg, parseArgs } from "../lib/args";
import { confirm } from "../lib/prompt";

// These will be loaded dynamically to ensure dotenv runs first
let isEncrypted: (value: string) => boolean;
let isEncryptedWithCurrentKey: (ciphertext: string) => boolean;
let reencryptSecret: (ciphertext: string) => string;
let isSignedWithCurrentKey: (content: string, signature: string) => boolean;
let signActivityLog: (content: string) => string;

interface ReencryptStats {
  accounts: { total: number; needsReencrypt: number; reencrypted: number; errors: number };
  users: { total: number; needsReencrypt: number; reencrypted: number; errors: number };
  settings: { total: number; needsReencrypt: number; reencrypted: number; errors: number };
  activityLogs: { total: number; needsReencrypt: number; reencrypted: number; errors: number };
}

interface ReencryptResult {
  success: boolean;
  stats: ReencryptStats;
  errors: string[];
  dryRun: boolean;
}

const args = parseArgs();
const isDryRun = getBooleanArg(args, "dry-run");
const isJson = getBooleanArg(args, "json");

function log(message: string): void {
  if (!isJson) {
    console.log(message);
  }
}

async function reencryptAccounts(
  db: typeof import("@/db/postgres").db,
  accountsTable: typeof import("@/schema/accounts.schema").accountsTable,
  eq: typeof import("drizzle-orm").eq,
  and: typeof import("drizzle-orm").and,
): Promise<{ total: number; needsReencrypt: number; reencrypted: number; errors: number }> {
  const stats = { total: 0, needsReencrypt: 0, reencrypted: 0, errors: 0 };
  const tokenFields = ["access_token", "refresh_token", "id_token"] as const;

  const accounts = await db.select().from(accountsTable);
  stats.total = accounts.length;

  for (const account of accounts) {
    for (const field of tokenFields) {
      const value = account[field];
      if (!value || !isEncrypted(value)) continue;

      if (!isEncryptedWithCurrentKey(value)) {
        stats.needsReencrypt++;
        log(
          `  [Account ${account.provider}/${account.providerAccountId}] ${field} needs re-encryption`,
        );

        if (!isDryRun) {
          try {
            const newValue = reencryptSecret(value);
            await db
              .update(accountsTable)
              .set({ [field]: newValue })
              .where(
                and(
                  eq(accountsTable.provider, account.provider),
                  eq(accountsTable.providerAccountId, account.providerAccountId),
                ),
              );
            stats.reencrypted++;
          } catch (error) {
            stats.errors++;
            log(`    ERROR: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
    }
  }

  return stats;
}

async function reencryptUsers(
  db: typeof import("@/db/postgres").db,
  usersTable: typeof import("@/schema/users.schema").usersTable,
  eq: typeof import("drizzle-orm").eq,
  isNotNull: typeof import("drizzle-orm").isNotNull,
): Promise<{ total: number; needsReencrypt: number; reencrypted: number; errors: number }> {
  const stats = { total: 0, needsReencrypt: 0, reencrypted: 0, errors: 0 };

  const users = await db
    .select({ id: usersTable.id, twoFactorSecret: usersTable.twoFactorSecret })
    .from(usersTable)
    .where(isNotNull(usersTable.twoFactorSecret));

  stats.total = users.length;

  for (const user of users) {
    const value = user.twoFactorSecret;
    if (!value || !isEncrypted(value)) continue;

    if (!isEncryptedWithCurrentKey(value)) {
      stats.needsReencrypt++;
      log(`  [User ${user.id}] twoFactorSecret needs re-encryption`);

      if (!isDryRun) {
        try {
          const newValue = reencryptSecret(value);
          await db
            .update(usersTable)
            .set({ twoFactorSecret: newValue })
            .where(eq(usersTable.id, user.id));
          stats.reencrypted++;
        } catch (error) {
          stats.errors++;
          log(`    ERROR: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  }

  return stats;
}

async function reencryptSettings(
  db: typeof import("@/db/postgres").db,
  settingsTable: typeof import("@/schema/settings.schema").settingsTable,
  eq: typeof import("drizzle-orm").eq,
): Promise<{ total: number; needsReencrypt: number; reencrypted: number; errors: number }> {
  const stats = { total: 0, needsReencrypt: 0, reencrypted: 0, errors: 0 };

  // Get sensitive setting keys from registry
  const { SETTINGS_REGISTRY } = await import("@/config/settings.registry");
  const sensitiveKeys = Object.values(SETTINGS_REGISTRY)
    .filter((def) => def.sensitive)
    .map((def) => def.key);

  if (sensitiveKeys.length === 0) {
    return stats;
  }

  const settings = await db.select().from(settingsTable);
  const sensitiveSettings = settings.filter((s) =>
    sensitiveKeys.includes(s.key as (typeof sensitiveKeys)[number]),
  );
  stats.total = sensitiveSettings.length;

  for (const setting of sensitiveSettings) {
    const value = setting.value;
    if (!value || !isEncrypted(value)) continue;

    if (!isEncryptedWithCurrentKey(value)) {
      stats.needsReencrypt++;
      log(`  [Setting ${setting.key}] value needs re-encryption`);

      if (!isDryRun) {
        try {
          const newValue = reencryptSecret(value);
          await db
            .update(settingsTable)
            .set({ value: newValue })
            .where(eq(settingsTable.id, setting.id));
          stats.reencrypted++;
        } catch (error) {
          stats.errors++;
          log(`    ERROR: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  }

  return stats;
}

async function resignActivityLogs(
  db: typeof import("@/db/postgres").db,
  activitiesTable: typeof import("@/schema/activities.schema").activitiesTable,
  eq: typeof import("drizzle-orm").eq,
  isNotNull: typeof import("drizzle-orm").isNotNull,
): Promise<{ total: number; needsReencrypt: number; reencrypted: number; errors: number }> {
  const stats = { total: 0, needsReencrypt: 0, reencrypted: 0, errors: 0 };

  // Only fetch entries that have signatures (integrity-protected entries)
  const entries = await db
    .select({
      id: activitiesTable.id,
      contentHash: activitiesTable.contentHash,
      previousHash: activitiesTable.previousHash,
      signature: activitiesTable.signature,
    })
    .from(activitiesTable)
    .where(isNotNull(activitiesTable.signature));

  stats.total = entries.length;

  for (const entry of entries) {
    if (!entry.contentHash || !entry.previousHash || !entry.signature) continue;

    const signatureContent = `${entry.contentHash}:${entry.previousHash}`;

    // Check if signature was made with current key
    if (!isSignedWithCurrentKey(signatureContent, entry.signature)) {
      stats.needsReencrypt++;
      log(`  [Activity ${entry.id}] signature needs re-signing`);

      if (!isDryRun) {
        try {
          const newSignature = signActivityLog(signatureContent);
          await db
            .update(activitiesTable)
            .set({ signature: newSignature })
            .where(eq(activitiesTable.id, entry.id));
          stats.reencrypted++;
        } catch (error) {
          stats.errors++;
          log(`    ERROR: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  }

  return stats;
}

async function main(): Promise<void> {
  const result: ReencryptResult = {
    success: true,
    stats: {
      accounts: { total: 0, needsReencrypt: 0, reencrypted: 0, errors: 0 },
      users: { total: 0, needsReencrypt: 0, reencrypted: 0, errors: 0 },
      settings: { total: 0, needsReencrypt: 0, reencrypted: 0, errors: 0 },
      activityLogs: { total: 0, needsReencrypt: 0, reencrypted: 0, errors: 0 },
    },
    errors: [],
    dryRun: isDryRun,
  };

  log("");
  log("╔═══════════════════════════════════════════════════════════════════╗");
  log("║            Encryption Key Rotation - Re-encrypt Data              ║");
  log("╚═══════════════════════════════════════════════════════════════════╝");
  log("");

  // Verify encryption keys are configured
  // ENCRYPTION_KEY is validated by env schema, guaranteed to exist

  if (!process.env.ENCRYPTION_KEYS_LEGACY) {
    log("NOTE: ENCRYPTION_KEYS_LEGACY not set.");
    log("      This script will only verify data is encrypted with the current key.");
    log("");
  }

  // Import encryption functions after env vars are loaded
  const security = await import("@/lib/security");
  isEncrypted = security.isEncrypted;
  isEncryptedWithCurrentKey = security.isEncryptedWithCurrentKey;
  reencryptSecret = security.reencryptSecret;
  isSignedWithCurrentKey = security.isSignedWithCurrentKey;
  signActivityLog = security.signActivityLog;

  if (isDryRun) {
    log("DRY RUN MODE - No changes will be made");
    log("");
  } else {
    log("⚠️  WARNING: This will modify encrypted data in the database!");
    log("");
    const proceed = await confirm("Continue with re-encryption?", false);
    if (!proceed) {
      log("Aborted.");
      process.exit(0);
    }
    log("");
  }

  // Import database and schema
  const { db } = await import("@/db/postgres");
  const { accountsTable } = await import("@/schema/accounts.schema");
  const { usersTable } = await import("@/schema/users.schema");
  const { settingsTable } = await import("@/schema/settings.schema");
  const { activitiesTable } = await import("@/schema/activities.schema");
  const { eq, and, isNotNull } = await import("drizzle-orm");

  // Re-encrypt accounts (OAuth tokens)
  log("[1/4] Processing accounts (OAuth tokens)...");
  result.stats.accounts = await reencryptAccounts(db, accountsTable, eq, and);
  log(
    `      Found ${result.stats.accounts.total} accounts, ${result.stats.accounts.needsReencrypt} need re-encryption`,
  );
  if (!isDryRun && result.stats.accounts.reencrypted > 0) {
    log(`      Re-encrypted ${result.stats.accounts.reencrypted} tokens`);
  }
  log("");

  // Re-encrypt users (TOTP secrets)
  log("[2/4] Processing users (TOTP secrets)...");
  result.stats.users = await reencryptUsers(db, usersTable, eq, isNotNull);
  log(
    `      Found ${result.stats.users.total} users with TOTP, ${result.stats.users.needsReencrypt} need re-encryption`,
  );
  if (!isDryRun && result.stats.users.reencrypted > 0) {
    log(`      Re-encrypted ${result.stats.users.reencrypted} secrets`);
  }
  log("");

  // Re-encrypt settings (sensitive settings)
  log("[3/4] Processing settings (sensitive values)...");
  result.stats.settings = await reencryptSettings(db, settingsTable, eq);
  log(
    `      Found ${result.stats.settings.total} sensitive settings, ${result.stats.settings.needsReencrypt} need re-encryption`,
  );
  if (!isDryRun && result.stats.settings.reencrypted > 0) {
    log(`      Re-encrypted ${result.stats.settings.reencrypted} settings`);
  }
  log("");

  // Re-sign activity logs (HMAC signatures)
  log("[4/4] Processing activity logs (HMAC signatures)...");
  result.stats.activityLogs = await resignActivityLogs(db, activitiesTable, eq, isNotNull);
  log(
    `      Found ${result.stats.activityLogs.total} signed entries, ${result.stats.activityLogs.needsReencrypt} need re-signing`,
  );
  if (!isDryRun && result.stats.activityLogs.reencrypted > 0) {
    log(`      Re-signed ${result.stats.activityLogs.reencrypted} signatures`);
  }
  log("");

  // Summary
  const totalNeedsReencrypt =
    result.stats.accounts.needsReencrypt +
    result.stats.users.needsReencrypt +
    result.stats.settings.needsReencrypt +
    result.stats.activityLogs.needsReencrypt;

  const totalReencrypted =
    result.stats.accounts.reencrypted +
    result.stats.users.reencrypted +
    result.stats.settings.reencrypted +
    result.stats.activityLogs.reencrypted;

  const totalErrors =
    result.stats.accounts.errors +
    result.stats.users.errors +
    result.stats.settings.errors +
    result.stats.activityLogs.errors;

  log("════════════════════════════════════════════════════════════════════");
  if (isDryRun) {
    log(`Summary (DRY RUN): ${totalNeedsReencrypt} values would be re-encrypted`);
  } else {
    log(`Summary: ${totalReencrypted} values re-encrypted, ${totalErrors} errors`);
  }
  log("════════════════════════════════════════════════════════════════════");
  log("");

  if (totalErrors > 0) {
    result.success = false;
    log("⚠️  Some values failed to re-encrypt. Check errors above.");
    log("   You may need to restore from backup or fix the encryption keys.");
  } else if (totalNeedsReencrypt === 0) {
    log("✓ All encrypted data is already using the current key.");
  } else if (!isDryRun) {
    log("✓ Re-encryption complete. You can now remove ENCRYPTION_KEYS_LEGACY.");
  }

  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
  }

  process.exit(result.success ? 0 : 1);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
