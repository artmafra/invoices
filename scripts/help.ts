/**
 * Help script - lists all available scripts with descriptions
 * Useful for AI agents to discover available commands
 */

const SCRIPTS: Record<
  string,
  { description: string; args?: string[]; destructive?: boolean; interactive?: boolean }
> = {
  // Development
  dev: {
    description: "Start Next.js development server with Turbopack on port 3000",
  },
  build: {
    description: "Build the application for production",
  },
  start: {
    description: "Start the production server on port 3000",
  },

  // Code Quality
  "check:format": {
    description: "Check if files are formatted correctly",
  },
  "check:lint": {
    description: "Run ESLint on all files",
  },
  "check:types": {
    description: "Run TypeScript type checking without emitting",
  },
  format: {
    description: "Format all files with Prettier",
  },

  // Database - Drizzle
  "db:generate": {
    description: "Generate Drizzle migrations from schema changes",
  },
  "db:migrate": {
    description: "Run pending database migrations",
  },
  "db:push": {
    description: "Push schema changes directly to database (dev only)",
  },
  "db:studio": {
    description: "Open Drizzle Studio to browse database",
  },

  // Database - Custom
  "db:init": {
    description: "Initialize database if fresh (seed roles, permissions, settings)",
  },
  "db:seed": {
    description: "Seed database with roles, permissions, and settings",
    args: ["--json"],
  },
  "db:check": {
    description: "Check database connection and show statistics",
    args: ["--json"],
  },
  "db:reset": {
    description: "DESTRUCTIVE: Drop and recreate database with test data",
    destructive: true,
  },

  // User Management
  "user:create": {
    description: "Create a new user (interactive or with args)",
    args: ["--email", "--name", "--password", "--role", "--system", "--json"],
    interactive: true,
  },

  // Email
  "email:dev": {
    description: "Start React Email preview server on port 3002",
  },

  // Help
  help: {
    description: "Show this help message",
  },
};

function printHelp() {
  console.log("");
  console.log("Available Scripts");
  console.log("=================");
  console.log("");
  console.log("Usage: npm run <script> [options]");

  // Group scripts by category
  const categories = {
    Development: ["dev", "build", "start"],
    "Code Quality": ["check:format", "check:lint", "check:types", "format"],
    "Database (Drizzle)": ["db:generate", "db:migrate", "db:push", "db:studio"],
    "Database (Custom)": ["db:init", "db:seed", "db:check", "db:reset"],
    "User Management": ["user:create"],
    Email: ["email:dev"],
    Help: ["help"],
  };

  for (const [category, scripts] of Object.entries(categories)) {
    console.log("");
    console.log(`${category}:`);
    console.log("-".repeat(60));

    for (const name of scripts) {
      const script = SCRIPTS[name];
      if (!script) continue;

      const prefix = script.destructive ? "[!] " : "    ";
      console.log(`${prefix}npm run ${name.padEnd(16)} ${script.description}`);

      if (script.args?.length) {
        console.log(`        Args: ${script.args.join(", ")}`);
      }
    }
  }

  console.log("");
  console.log("Tips for AI Agents:");
  console.log("-".repeat(60));
  console.log("    - Use --json flag for machine-readable output");
  console.log("    - Use npm run db:check --json to verify database state");
  console.log("    - Use npm run user:create --email=... --name=... --password=... for automation");
  console.log("    - Read scripts/manifest.json for structured script metadata");
  console.log("");
}

printHelp();
