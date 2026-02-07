import { rolesTable } from "@/schema/roles.schema";
import { usersTable } from "@/schema/users.schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { generateUUID } from "@/lib/uuid";
import { db } from "@/db/postgres";
import { getBooleanArg, getStringArg, hasRequiredArgs, parseArgs, printUsage } from "../lib/args";
import { closePrompt, prompt, promptWithDefault } from "../lib/prompt";

const SCRIPT_NAME = "user:create";

const OPTIONS = [
  { flag: "email", description: "User email address", required: true },
  { flag: "name", description: "User full name", required: true },
  { flag: "password", description: "User password (min 8 chars)", required: true },
  { flag: "role", description: "Role: admin, user, or system (default: user)" },
  { flag: "system", description: "Shortcut for --role=system" },
  { flag: "help", description: "Show this help message" },
  { flag: "json", description: "Output result as JSON (for AI agents)" },
];

interface CreateUserResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  error?: string;
}

async function validateEmail(email: string): Promise<boolean> {
  if (!email || !email.includes("@")) {
    return false;
  }
  return true;
}

async function validatePassword(password: string): Promise<boolean> {
  return Boolean(password && password.length >= 8);
}

async function getRoleByName(roleName: string) {
  const role = await db.select().from(rolesTable).where(eq(rolesTable.name, roleName)).limit(1);
  return role[0] || null;
}

async function ensureRolesExist() {
  const { initializeRolesAndPermissions } = await import("../db/seed");
  await initializeRolesAndPermissions();
}

async function createUserInDb(email: string, name: string, password: string, roleId: string) {
  const hashedPassword = await bcrypt.hash(password, 12);

  const newUser = await db
    .insert(usersTable)
    .values({
      id: generateUUID(),
      email: email.trim(),
      name: name.trim(),
      password: hashedPassword,
      roleId,
      isActive: true,
      emailVerified: new Date(),
    })
    .returning();

  return newUser[0];
}

async function runInteractive(): Promise<CreateUserResult> {
  console.log("");
  console.log("Create New User");
  console.log("===============");
  console.log("");

  const email = await prompt("Email: ");
  if (!(await validateEmail(email))) {
    return { success: false, error: "Invalid email address" };
  }

  const name = await prompt("Name: ");
  if (!name || name.length < 2) {
    return { success: false, error: "Name must be at least 2 characters" };
  }

  const password = await prompt("Password: ");
  if (!(await validatePassword(password))) {
    return { success: false, error: "Password must be at least 4 characters" };
  }

  const roleInput = await promptWithDefault("Role (admin/user/system)", "user");
  const roleName = ["admin", "user", "system"].includes(roleInput.toLowerCase())
    ? roleInput.toLowerCase()
    : "user";

  closePrompt();

  return createUser(email, name, password, roleName);
}

async function createUser(
  email: string,
  name: string,
  password: string,
  roleName: string,
): Promise<CreateUserResult> {
  // Ensure roles exist
  await ensureRolesExist();

  // Validate inputs
  if (!(await validateEmail(email))) {
    return { success: false, error: "Invalid email address" };
  }
  if (!name || name.length < 2) {
    return { success: false, error: "Name must be at least 2 characters" };
  }
  if (!(await validatePassword(password))) {
    return { success: false, error: "Password must be at least 4 characters" };
  }

  // Get role
  const role = await getRoleByName(roleName);
  if (!role) {
    return { success: false, error: `Role "${roleName}" not found` };
  }

  // Check if user already exists
  const existingUser = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  if (existingUser.length > 0) {
    return { success: false, error: `User with email "${email}" already exists` };
  }

  // Create user
  const newUser = await createUserInDb(email, name, password, role.id);

  return {
    success: true,
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name || "",
      role: roleName,
    },
  };
}

async function main() {
  const args = parseArgs();

  // Show help
  if (getBooleanArg(args, "help")) {
    printUsage(SCRIPT_NAME, OPTIONS);
    process.exit(0);
  }

  const jsonOutput = getBooleanArg(args, "json");
  let result: CreateUserResult;

  try {
    // Check for non-interactive mode
    const requiredArgs = ["email", "name", "password"];
    if (hasRequiredArgs(args, requiredArgs)) {
      const email = getStringArg(args, "email")!;
      const name = getStringArg(args, "name")!;
      const password = getStringArg(args, "password")!;

      // Determine role
      let roleName = "user";
      if (getBooleanArg(args, "system")) {
        roleName = "system";
      } else if (getStringArg(args, "role")) {
        roleName = getStringArg(args, "role")!;
      }

      result = await createUser(email, name, password, roleName);
    } else {
      // Interactive mode
      result = await runInteractive();
    }

    // Output result
    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    } else if (result.success && result.user) {
      console.log("");
      console.log("User created successfully!");
      console.log("-".repeat(30));
      console.log(`    ID:    ${result.user.id}`);
      console.log(`    Email: ${result.user.email}`);
      console.log(`    Name:  ${result.user.name}`);
      console.log(`    Role:  ${result.user.role}`);
      if (result.user.role === "system") {
        console.log("");
        console.log("    Note: System users are hidden from admin UI.");
      }
      console.log("");
    } else {
      console.error("");
      console.error(`Error: ${result.error}`);
    }

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    if (jsonOutput) {
      console.log(JSON.stringify({ success: false, error: errorMessage }, null, 2));
    } else {
      console.error("");
      console.error(`Error: ${errorMessage}`);
    }
    process.exit(1);
  }
}

// Export for programmatic use
export { createUser };

// Run if called directly
main();
