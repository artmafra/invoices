import "dotenv/config";
import { permissionsTable } from "@/schema/permissions.schema";
import { rolesTable } from "@/schema/roles.schema";
import { settingsTable } from "@/schema/settings.schema";
import { usersTable } from "@/schema/users.schema";
import { count } from "drizzle-orm";
import { db } from "@/db/postgres";
import { getBooleanArg, parseArgs } from "../lib/args";

interface DbCheckResult {
  success: boolean;
  connected: boolean;
  database: string;
  counts: {
    users: number;
    roles: number;
    permissions: number;
    settings: number;
  };
  status: {
    hasUsers: boolean;
    hasRoles: boolean;
    hasSettings: boolean;
    isSeeded: boolean;
  };
  error?: string;
}

async function checkDatabase(): Promise<DbCheckResult> {
  const databaseUrl = process.env.DATABASE_URL || "";
  let dbName = "unknown";

  try {
    const url = new URL(databaseUrl);
    dbName = url.pathname.slice(1);
  } catch {
    // Invalid URL, continue with unknown
  }

  try {
    // Check connection by running simple queries
    const [{ count: usersCount }] = await db.select({ count: count() }).from(usersTable);
    const [{ count: rolesCount }] = await db.select({ count: count() }).from(rolesTable);
    const [{ count: permissionsCount }] = await db
      .select({ count: count() })
      .from(permissionsTable);
    const [{ count: settingsCount }] = await db.select({ count: count() }).from(settingsTable);

    const counts = {
      users: usersCount,
      roles: rolesCount,
      permissions: permissionsCount,
      settings: settingsCount,
    };

    return {
      success: true,
      connected: true,
      database: dbName,
      counts,
      status: {
        hasUsers: usersCount > 0,
        hasRoles: rolesCount > 0,
        hasSettings: settingsCount > 0,
        isSeeded: rolesCount > 0 && settingsCount > 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      connected: false,
      database: dbName,
      counts: { users: 0, roles: 0, permissions: 0, settings: 0 },
      status: {
        hasUsers: false,
        hasRoles: false,
        hasSettings: false,
        isSeeded: false,
      },
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function main() {
  const args = parseArgs();
  const jsonOutput = getBooleanArg(args, "json");

  const result = await checkDatabase();

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("");
    console.log("Database Check");
    console.log("==============");
    console.log("");

    if (result.connected) {
      console.log(`Connected to: ${result.database}`);
      console.log("");
      console.log("Record counts:");
      console.log(`    Users:       ${result.counts.users}`);
      console.log(`    Roles:       ${result.counts.roles}`);
      console.log(`    Permissions: ${result.counts.permissions}`);
      console.log(`    Settings:    ${result.counts.settings}`);
      console.log("");
      console.log("Status:");
      console.log(`    Seeded: ${result.status.isSeeded ? "Yes" : "No (run npm run db:seed)"}`);
      console.log(`    Users:  ${result.status.hasUsers ? "Has users" : "No users"}`);
    } else {
      console.log("Connection failed");
      console.log(`    Error: ${result.error}`);
      console.log("");
      console.log("Tips:");
      console.log("    - Check DATABASE_URL in .env");
      console.log("    - Ensure PostgreSQL is running");
      console.log("    - Run: npm run db:push to create tables");
    }
    console.log("");
  }

  process.exit(result.success ? 0 : 1);
}

// Export for programmatic use
export { checkDatabase };

// Run if called directly
if (require.main === module) {
  main();
}
