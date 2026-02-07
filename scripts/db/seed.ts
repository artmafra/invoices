import "dotenv/config";
import { rolesTable } from "@/schema/roles.schema";
import { settingsTable } from "@/schema/settings.schema";
import { usersTable } from "@/schema/users.schema";
import { eq, or } from "drizzle-orm";
import { SETTINGS_REGISTRY } from "@/config/settings.registry";
import { generateUUID } from "@/lib/uuid";
import { db } from "@/db/postgres";
import { appPermissionsService } from "@/services/runtime/app-permissions";
import { permissionService } from "@/services/runtime/permission";
import { getBooleanArg, parseArgs } from "../lib/args";

/**
 * Initialize roles and permissions
 */
export async function initializeRolesAndPermissions() {
  console.log("Seeding permissions...");
  const createdPermissions = await permissionService.seedPermissions();
  console.log(`    Created ${createdPermissions.length} new permissions`);

  console.log("Seeding default roles...");
  await permissionService.seedRoles();
  console.log("    Created/updated default roles (system, admin, user)");
}

/**
 * Initialize application settings from registry
 */
export async function initializeSettings() {
  console.log("Seeding settings...");

  let insertedCount = 0;
  let skippedCount = 0;

  for (const setting of SETTINGS_REGISTRY) {
    const existing = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, setting.key))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(settingsTable).values({
        id: generateUUID(),
        key: setting.key,
        label: setting.label,
        value: setting.defaultValue,
        type: setting.type,
        options: "options" in setting ? JSON.stringify(setting.options) : null,
        description: setting.description,
        category: setting.category,
        scope: setting.scope,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      insertedCount++;
    } else {
      skippedCount++;
    }
  }

  console.log(`    Created ${insertedCount} settings, skipped ${skippedCount} existing`);

  // Group by category for summary
  const categories = [...new Set(SETTINGS_REGISTRY.map((s) => s.category))];
  console.log("");
  console.log("Settings by category:");
  for (const category of categories.sort()) {
    const count = SETTINGS_REGISTRY.filter((s) => s.category === category).length;
    console.log(`    ${category}: ${count} settings`);
  }
}

/**
 * Grant all app permissions to admin and system users
 */
export async function grantAppPermissionsToAdminUsers(): Promise<{ grantedCount: number }> {
  console.log("Granting app permissions to admin/system users...");

  // Find the system and admin roles
  const adminRoles = await db
    .select()
    .from(rolesTable)
    .where(or(eq(rolesTable.name, "system"), eq(rolesTable.name, "admin")));

  if (adminRoles.length === 0) {
    console.log("    No admin or system roles found");
    return { grantedCount: 0 };
  }

  const adminRoleIds = adminRoles.map((role) => role.id);

  // Find all users with admin or system roles
  const adminUsers = await db
    .select({ id: usersTable.id, name: usersTable.name })
    .from(usersTable)
    .where(or(...adminRoleIds.map((roleId) => eq(usersTable.roleId, roleId))));

  if (adminUsers.length === 0) {
    console.log("    No admin or system users found");
    return { grantedCount: 0 };
  }

  // Grant all app permissions to each admin/system user
  let grantedCount = 0;
  for (const user of adminUsers) {
    // Use null as the actor ID since this is a seeding operation
    await appPermissionsService.grantAllAppPermissions(null, user.id);
    grantedCount++;
    console.log(`    Granted all app permissions to: ${user.name || user.id}`);
  }

  return { grantedCount };
}

interface SeedResult {
  success: boolean;
  roles: { created: number };
  permissions: { created: number };
  settings: { created: number; skipped: number };
  apps: { granted: number };
  error?: string;
}

/**
 * Run full database seeding
 */
export async function seedDatabase(): Promise<SeedResult> {
  try {
    // Seed roles and permissions
    console.log("");
    console.log("Seeding database...");
    console.log("");

    console.log("Seeding permissions...");
    const createdPermissions = await permissionService.seedPermissions();
    console.log(`    Created ${createdPermissions.length} new permissions`);

    console.log("Seeding default roles...");
    await permissionService.seedRoles();
    console.log("    Created/updated default roles (system, admin, user)");

    // Seed settings
    console.log("Seeding settings...");
    let insertedCount = 0;
    let skippedCount = 0;

    for (const setting of SETTINGS_REGISTRY) {
      const existing = await db
        .select()
        .from(settingsTable)
        .where(eq(settingsTable.key, setting.key))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(settingsTable).values({
          id: generateUUID(),
          key: setting.key,
          label: setting.label,
          value: setting.defaultValue,
          type: setting.type,
          options: "options" in setting ? JSON.stringify(setting.options) : null,
          description: setting.description,
          category: setting.category,
          scope: setting.scope,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        insertedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`    Created ${insertedCount} settings, skipped ${skippedCount} existing`);

    // Grant all app permissions to admin/system users
    const appPermissionsResult = await grantAppPermissionsToAdminUsers();

    return {
      success: true,
      roles: { created: 3 }, // system, admin, user
      permissions: { created: createdPermissions.length },
      settings: { created: insertedCount, skipped: skippedCount },
      apps: { granted: appPermissionsResult.grantedCount },
    };
  } catch (error) {
    return {
      success: false,
      roles: { created: 0 },
      permissions: { created: 0 },
      settings: { created: 0, skipped: 0 },
      apps: { granted: 0 },
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function main() {
  const args = parseArgs();
  const jsonOutput = getBooleanArg(args, "json");

  try {
    const result = await seedDatabase();

    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    } else if (result.success) {
      console.log("");
      console.log("Database seeding completed!");
    } else {
      console.error("");
      console.error(`Error: ${result.error}`);
    }

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    if (jsonOutput) {
      console.log(JSON.stringify({ success: false, error: String(error) }, null, 2));
    } else {
      console.error("");
      console.error("Error seeding database:", error);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
