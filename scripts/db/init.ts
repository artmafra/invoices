import "dotenv/config";
import { rolesTable } from "@/schema/roles.schema";
import { settingsTable } from "@/schema/settings.schema";
import { count } from "drizzle-orm";
import { db } from "@/db/postgres";

/**
 * Check if the database is freshly initialized (no settings exist)
 */
export async function isDatabaseFresh(): Promise<boolean> {
  try {
    const [{ count: settingsCount }] = await db.select({ count: count() }).from(settingsTable);
    return settingsCount === 0;
  } catch {
    return false;
  }
}

/**
 * Check if roles need to be initialized
 */
export async function needsRolesInit(): Promise<boolean> {
  try {
    const [{ count: rolesCount }] = await db.select({ count: count() }).from(rolesTable);
    return rolesCount === 0;
  } catch {
    return true;
  }
}

/**
 * Initialize settings and roles if database is fresh
 */
export async function initializeIfFresh() {
  console.log("Checking database status...");

  const isFresh = await isDatabaseFresh();

  if (isFresh) {
    console.log("Fresh database detected! Running seed...");
    const { seedDatabase } = await import("./seed");
    await seedDatabase();
    console.log("Database initialization completed!");
  } else {
    console.log("Database already has settings. Skipping initialization.");
    console.log("To force re-seed, run: npm run db:seed");
  }

  // Always check and initialize roles if needed
  const needsRoles = await needsRolesInit();
  if (needsRoles) {
    console.log("Initializing roles and permissions...");
    const { initializeRolesAndPermissions } = await import("./seed");
    await initializeRolesAndPermissions();
  } else {
    console.log("Roles already initialized.");
  }
}

// Run if called directly
if (require.main === module) {
  initializeIfFresh()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Initialization failed:", error);
      process.exit(1);
    });
}
