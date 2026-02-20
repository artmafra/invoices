import "dotenv/config";
import { execSync } from "child_process";
import postgres from "postgres";

const DEFAULT_PASSWORD = process.env.TEST_DEFAULT_PASSWORD;

if (!DEFAULT_PASSWORD) {
  console.error(
    "Error: TEST_DEFAULT_PASSWORD environment variable is not set. Please set it in your .env file.",
  );
  process.exit(1);
}

const USERS_TO_CREATE = [{ email: "artmafra@gmail.com", name: "Arthur", role: "system" }];

async function resetDatabase() {
  console.log("");
  console.log("Starting database reset...");
  console.log("");

  try {
    const url = new URL(process.env.DATABASE_URL);
    const dbName = url.pathname.slice(1);

    // Connect to 'postgres' database to drop/create the target database
    url.pathname = "/postgres";
    const adminSql = postgres(url.toString());

    // Step 1: Drop and recreate database
    console.log("[1/4] Dropping and recreating database...");

    // Terminate existing connections
    await adminSql`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = ${dbName}
        AND pid <> pg_backend_pid()
    `;

    await adminSql.unsafe(`DROP DATABASE IF EXISTS "${dbName}"`);
    console.log(`       Dropped database: ${dbName}`);

    await adminSql.unsafe(`CREATE DATABASE "${dbName}"`);
    console.log(`       Created database: ${dbName}`);

    await adminSql.end();

    // Step 2: Push schema using drizzle-kit
    console.log("");
    console.log("[2/4] Pushing schema with drizzle-kit...");
    execSync("npx drizzle-kit push --force", { stdio: "inherit" });
    console.log("       Schema pushed");
    console.log("");

    // Re-import db after schema is created (fresh connection)
    const { db } = await import("@/db/postgres");
    const { usersTable } = await import("@/schema/users.schema");
    const { userEmailsTable } = await import("@/schema/user-emails.schema");
    const { rolesTable } = await import("@/schema/roles.schema");
    const { eq } = await import("drizzle-orm");
    const bcrypt = await import("bcryptjs");
    const { generateUUID } = await import("@/lib/uuid");

    // Step 3: Seed database (roles, permissions, settings)
    console.log("[3/4] Seeding database...");
    const { seedDatabase } = await import("./seed");
    await seedDatabase();
    console.log("       Database seeded");
    console.log("");

    // Step 4: Create users
    console.log("[4/4] Creating users...");
    if (!DEFAULT_PASSWORD) {
      throw new Error("DEFAULT_PASSWORD is required but was not set");
    }
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    const { appPermissionsService } = await import("@/services/runtime/app-permissions");

    for (const userData of USERS_TO_CREATE) {
      const role = await db
        .select()
        .from(rolesTable)
        .where(eq(rolesTable.name, userData.role))
        .limit(1);

      if (role.length === 0) {
        console.log(`       [!] Role "${userData.role}" not found, skipping ${userData.email}`);
        continue;
      }

      const userId = generateUUID();
      const now = new Date();

      await db.insert(usersTable).values({
        id: userId,
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        roleId: role[0].id,
        isActive: true,
        emailVerified: now,
      });

      // Create corresponding user_emails entry for primary email
      await db.insert(userEmailsTable).values({
        id: generateUUID(),
        userId,
        email: userData.email.toLowerCase(),
        isPrimary: true,
        verifiedAt: now,
      });

      // Grant all app permissions to admin/system users
      if (userData.role === "admin" || userData.role === "system") {
        await appPermissionsService.grantAllAppPermissions(null, userId);
        console.log(
          `       Created: ${userData.name} (${userData.email}) - ${userData.role} (all apps)`,
        );
      } else {
        console.log(`       Created: ${userData.name} (${userData.email}) - ${userData.role}`);
      }
    }

    console.log("");
    console.log("Database reset complete!");
    console.log("");
    console.log("-".repeat(40));
    console.log("Users created:");
    console.log("-".repeat(40));
    for (const user of USERS_TO_CREATE) {
      console.log(`    ${user.email}`);
      console.log(`        Name: ${user.name}`);
      console.log(`        Role: ${user.role}`);
      console.log(`        Password: ${DEFAULT_PASSWORD}`);
      console.log("");
    }
    console.log("-".repeat(40));
    console.log("");
  } catch (error) {
    console.error("");
    console.error("Error resetting database:", error);
    if (error instanceof Error) {
      console.error("Message:", error.message);
    }
  }

  process.exit(0);
}

resetDatabase();
