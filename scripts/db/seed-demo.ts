import "dotenv/config";
import { notesTable } from "@/schema/notes.schema";
import { rolesTable } from "@/schema/roles.schema";
import { taskListsTable } from "@/schema/task-lists.schema";
import { TASK_PRIORITIES, TASK_STATUSES, tasksTable } from "@/schema/tasks.schema";
import { userSessionsTable } from "@/schema/user-session.schema";
import { usersTable } from "@/schema/users.schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { generateUUID } from "@/lib/uuid";
import { db } from "@/db/postgres";
import { activityService } from "@/services/runtime/activity";
import { appPermissionsService } from "@/services/runtime/app-permissions";
import { getBooleanArg, getStringArg, parseArgs, printUsage } from "../lib/args";
import { seedDatabase } from "./seed";

const SCRIPT_NAME = "db:seed:demo";

const OPTIONS = [
  { flag: "users", description: "Number of demo users to create (default: 15)" },
  { flag: "lists", description: "Number of task lists to create (default: 6)" },
  { flag: "tasks", description: "Number of tasks to create (default: 120)" },
  { flag: "notes", description: "Number of notes to create (default: 40)" },
  { flag: "sessions", description: "Number of user sessions to create (default: 60)" },
  { flag: "prefix", description: "Email prefix (default: demo)" },
  { flag: "domain", description: "Email domain (default: example.com)" },
  {
    flag: "password",
    description: "Password for all demo users (default: Nearness.Mumble1.Unburned)",
  },
  { flag: "seed", description: "PRNG seed for repeatability (default: random)" },
  { flag: "json", description: "Output result as JSON (for AI agents)" },
  { flag: "help", description: "Show this help message" },
];

interface SeedDemoResult {
  success: boolean;
  runId: string;
  created: {
    users: number;
    taskLists: number;
    tasks: number;
    notes: number;
    sessions: number;
    activities: number;
  };
  sampleUsers?: Array<{ id: string; email: string; role: "system" | "admin" | "user" }>;
  error?: string;
}

// -------------------------
// Small deterministic PRNG
// -------------------------
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function toInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function toSeed(value: string | undefined): number {
  if (!value) return Math.floor(Math.random() * 2 ** 31);
  // simple string->int hash
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(rnd: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rnd() * arr.length)]!;
}

function chance(rnd: () => number, p: number): boolean {
  return rnd() < p;
}

function randInt(rnd: () => number, min: number, maxInclusive: number): number {
  const span = maxInclusive - min + 1;
  return min + Math.floor(rnd() * span);
}

function randomPastDate(rnd: () => number, maxDaysBack: number): Date {
  const days = rnd() * maxDaysBack;
  const ms = days * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - ms);
}

function randomFutureDate(rnd: () => number, maxDaysForward: number): Date {
  const days = rnd() * maxDaysForward;
  const ms = days * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ms);
}

// -------------------------
// Demo content generators
// -------------------------
const FIRST_NAMES = [
  "Rafael",
  "Ana",
  "Bruno",
  "Carla",
  "Diego",
  "Eduarda",
  "Felipe",
  "Giovana",
  "Henrique",
  "Isabela",
  "João",
  "Larissa",
  "Marcos",
  "Natália",
  "Otávio",
  "Paula",
  "Renan",
  "Sofia",
  "Thiago",
  "Vitória",
] as const;

const LAST_NAMES = [
  "Silva",
  "Santos",
  "Oliveira",
  "Souza",
  "Pereira",
  "Costa",
  "Rodrigues",
  "Almeida",
  "Nascimento",
  "Lima",
  "Carvalho",
  "Gomes",
] as const;

const TASK_WORDS = [
  "Refactor",
  "Implement",
  "Fix",
  "Investigate",
  "Review",
  "Optimize",
  "Document",
  "Deploy",
  "Migrate",
  "Audit",
  "Hardening",
  "Cleanup",
] as const;

const TASK_OBJECTS = [
  "auth flow",
  "RBAC",
  "settings page",
  "tasks module",
  "notes module",
  "activity log",
  "session revocation",
  "rate limiting",
  "email templates",
  "storage integration",
  "admin dashboard",
  "API endpoints",
] as const;

const NOTE_TOPICS = [
  "Release notes",
  "On-call",
  "Security checklist",
  "Implementation notes",
  "Follow-ups",
  "Architecture decisions",
  "Product ideas",
  "Bug triage",
] as const;

const COLORS = ["blue", "green", "yellow", "red", "purple"] as const;

function makePersonName(rnd: () => number): string {
  return `${pick(rnd, FIRST_NAMES)} ${pick(rnd, LAST_NAMES)}`;
}

function makeTaskTitle(rnd: () => number): string {
  return `${pick(rnd, TASK_WORDS)} ${pick(rnd, TASK_OBJECTS)}`;
}

function makeNoteTitle(rnd: () => number): string {
  return `${pick(rnd, NOTE_TOPICS)} – ${pick(rnd, TASK_OBJECTS)}`;
}

function makeMarkdown(rnd: () => number): string {
  const bullets = randInt(rnd, 3, 7);
  const lines: string[] = [];
  lines.push(`## Summary`);
  lines.push(`- Context: ${pick(rnd, TASK_OBJECTS)}`);
  lines.push(`- Priority: ${pick(rnd, TASK_PRIORITIES)}`);
  lines.push(``);
  lines.push(`## Checklist`);
  for (let i = 0; i < bullets; i++) {
    lines.push(`- [${chance(rnd, 0.35) ? "x" : " "}] ${makeTaskTitle(rnd)}`);
  }
  lines.push(``);
  lines.push(`## Notes`);
  lines.push(`This is demo content generated by ${SCRIPT_NAME}.`);
  return lines.join("\n");
}

function makeUserAgent(rnd: () => number): {
  ua: string;
  deviceType: string;
  browser: string;
  os: string;
} {
  const deviceType = pick(rnd, ["desktop", "mobile", "tablet"] as const);
  const browser = pick(rnd, ["Chrome", "Firefox", "Edge", "Safari"] as const);
  const os = pick(rnd, ["Windows", "macOS", "Linux", "Android", "iOS"] as const);

  const ua = `${browser}/${randInt(rnd, 90, 130)} (${os}; ${deviceType})`;

  return { ua, deviceType, browser, os };
}

function makeIp(rnd: () => number): string {
  // Not real, but valid-ish
  return `${randInt(rnd, 10, 250)}.${randInt(rnd, 0, 255)}.${randInt(rnd, 0, 255)}.${randInt(rnd, 1, 254)}`;
}

// -------------------------
// Main seeding logic
// -------------------------
async function getRoleId(name: "system" | "admin" | "user"): Promise<string> {
  const role = await db.select().from(rolesTable).where(eq(rolesTable.name, name)).limit(1);
  if (!role[0]) throw new Error(`Role "${name}" not found. Run npm run db:seed first.`);
  return role[0].id;
}

async function main() {
  const args = parseArgs();

  if (getBooleanArg(args, "help")) {
    printUsage(SCRIPT_NAME, OPTIONS);
    process.exit(0);
  }

  const jsonOutput = getBooleanArg(args, "json");

  const usersCount = toInt(getStringArg(args, "users"), 15);
  const listsCount = toInt(getStringArg(args, "lists"), 6);
  const tasksCount = toInt(getStringArg(args, "tasks"), 120);
  const notesCount = toInt(getStringArg(args, "notes"), 40);
  const sessionsCount = toInt(getStringArg(args, "sessions"), 60);

  const prefix = (getStringArg(args, "prefix") ?? "demo").trim();
  const domain = (getStringArg(args, "domain") ?? "example.com").trim();
  const password = getStringArg(args, "password") ?? "Nearness.Mumble1.Unburned";

  const seedValue = toSeed(getStringArg(args, "seed"));
  const rnd = mulberry32(seedValue);

  const runId = `${Date.now().toString(36)}-${seedValue.toString(16)}`;

  let activitiesCreated = 0;

  const result: SeedDemoResult = {
    success: false,
    runId,
    created: { users: 0, taskLists: 0, tasks: 0, notes: 0, sessions: 0, activities: 0 },
  };

  try {
    // Ensure baseline seed exists (roles, permissions, settings)
    await seedDatabase();

    const systemRoleId = await getRoleId("system");
    const adminRoleId = await getRoleId("admin");
    const userRoleId = await getRoleId("user");

    // Hash once for all demo users
    const hashedPassword = await bcrypt.hash(password, 12);

    // -------------------------
    // Users
    // -------------------------
    const createdUsers: Array<{ id: string; email: string; role: "system" | "admin" | "user" }> =
      [];

    for (let i = 0; i < usersCount; i++) {
      const role: "system" | "admin" | "user" = i === 0 ? "system" : i <= 2 ? "admin" : "user";

      const roleId = role === "system" ? systemRoleId : role === "admin" ? adminRoleId : userRoleId;

      const id = generateUUID();
      const name = makePersonName(rnd);

      // Ensure uniqueness across runs
      const email = `${prefix}.${runId}.${i}@${domain}`.toLowerCase();

      await db.insert(usersTable).values({
        id,
        email,
        name,
        password: hashedPassword,
        roleId,
        isActive: chance(rnd, 0.95),
        emailVerified: chance(rnd, 0.85) ? randomPastDate(rnd, 45) : null,
        phone: chance(rnd, 0.25) ? `+55${randInt(rnd, 1000000000, 9999999999)}` : null,
        emailTwoFactorEnabled: chance(rnd, 0.15),
        totpTwoFactorEnabled: chance(rnd, 0.05),
        preferredTwoFactorMethod: chance(rnd, 0.8) ? "email" : "totp",
        createdAt: randomPastDate(rnd, 90),
        updatedAt: randomPastDate(rnd, 30),
      });

      // Grant all app permissions to admin/system users (matches your reset.ts pattern)
      if (role === "admin" || role === "system") {
        await appPermissionsService.grantAllAppPermissions(null, id);
      }

      createdUsers.push({ id, email, role });
    }

    result.created.users = createdUsers.length;

    // Use the system user as the actor for many logs (if present)
    const systemUserId = createdUsers.find((u) => u.role === "system")?.id ?? null;
    const adminUserId = createdUsers.find((u) => u.role === "admin")?.id ?? systemUserId ?? null;

    // Activity logs: user.create
    if (process.env.ENCRYPTION_KEY) {
      for (const u of createdUsers) {
        await activityService.logCreate(
          systemUserId,
          "users",
          { type: "user", id: u.id, name: u.email },
          { metadata: { seeded: true, runId } },
        );
        activitiesCreated++;
      }
    }

    // -------------------------
    // Task Lists
    // -------------------------
    const listIds: string[] = [];

    for (let i = 0; i < listsCount; i++) {
      const id = generateUUID();
      const name = `${pick(rnd, ["Backlog", "Sprint", "Personal", "Ops", "Bugs", "Roadmap"] as const)} ${i + 1}`;

      await db.insert(taskListsTable).values({
        id,
        name,
        description: chance(rnd, 0.7) ? `Demo list generated by ${SCRIPT_NAME}` : null,
        color: chance(rnd, 0.75) ? pick(rnd, COLORS) : null,
        sortOrder: i,
        createdById: adminUserId,
        createdAt: randomPastDate(rnd, 60),
        updatedAt: randomPastDate(rnd, 20),
      });

      listIds.push(id);

      if (process.env.ENCRYPTION_KEY) {
        await activityService.logCreate(
          adminUserId,
          "tasks",
          { type: "task-list", id, name },
          { metadata: { seeded: true, runId } },
        );
        activitiesCreated++;
      }
    }

    result.created.taskLists = listIds.length;

    // -------------------------
    // Tasks
    // -------------------------
    const userIds = createdUsers.map((u) => u.id);

    for (let i = 0; i < tasksCount; i++) {
      const id = generateUUID();
      const title = makeTaskTitle(rnd);
      const status = pick(rnd, TASK_STATUSES);
      const priority = pick(rnd, TASK_PRIORITIES);

      const createdById = pick(rnd, userIds);
      const assigneeId = chance(rnd, 0.8) ? pick(rnd, userIds) : null;

      const listId = chance(rnd, 0.85) ? pick(rnd, listIds) : null;

      const dueDate = chance(rnd, 0.55) ? randomFutureDate(rnd, 30) : null;

      const createdAt = randomPastDate(rnd, 120);
      const completedAt = status === "done" ? randomPastDate(rnd, 30) : null;

      await db.insert(tasksTable).values({
        id,
        title,
        description: chance(rnd, 0.75) ? makeMarkdown(rnd) : null,
        status,
        priority,
        dueDate,
        listId,
        assigneeId,
        createdById,
        sortOrder: i,
        completedAt,
        createdAt,
        updatedAt: randomPastDate(rnd, 15),
      });

      // Only log a subset to keep runtime reasonable
      if (process.env.ENCRYPTION_KEY && chance(rnd, 0.35)) {
        await activityService.logCreate(
          createdById,
          "tasks",
          { type: "task", id, name: title },
          { metadata: { seeded: true, runId, status, priority } },
        );
        activitiesCreated++;
      }
    }

    result.created.tasks = tasksCount;

    // -------------------------
    // Notes
    // -------------------------
    for (let i = 0; i < notesCount; i++) {
      const id = generateUUID();
      const title = makeNoteTitle(rnd);
      const createdById = pick(rnd, userIds);
      const updatedById = chance(rnd, 0.7) ? pick(rnd, userIds) : createdById;

      await db.insert(notesTable).values({
        id,
        title,
        content: makeMarkdown(rnd),
        isPinned: chance(rnd, 0.15),
        color: chance(rnd, 0.7) ? pick(rnd, COLORS) : null,
        createdById,
        updatedById,
        createdAt: randomPastDate(rnd, 180),
        updatedAt: randomPastDate(rnd, 30),
      });

      if (process.env.ENCRYPTION_KEY && chance(rnd, 0.5)) {
        await activityService.logCreate(
          createdById,
          "notes",
          { type: "note", id, name: title },
          { metadata: { seeded: true, runId } },
        );
        activitiesCreated++;
      }
    }

    result.created.notes = notesCount;

    // -------------------------
    // User Sessions (custom user_sessions table)
    // -------------------------
    for (let i = 0; i < sessionsCount; i++) {
      const id = generateUUID();
      const userId = pick(rnd, userIds);

      const { ua, deviceType, browser, os } = makeUserAgent(rnd);

      const createdAt = randomPastDate(rnd, 30);
      const expiresAt = randomFutureDate(rnd, 30);
      const absoluteExpiresAt = new Date(createdAt.getTime() + 45 * 24 * 60 * 60 * 1000);
      const lastActivityAt = chance(rnd, 0.8) ? randomPastDate(rnd, 3) : createdAt;

      const isRevoked = chance(rnd, 0.08);
      const revokedAt = isRevoked ? randomPastDate(rnd, 7) : null;

      await db.insert(userSessionsTable).values({
        id,
        userId,
        sessionToken: `demo_${runId}_${generateUUID()}`,
        userAgent: ua,
        ipAddress: makeIp(rnd),
        deviceType,
        browser,
        os,
        isRevoked,
        revokedAt,
        revokedReason: isRevoked
          ? pick(rnd, ["manual", "suspicious", "password_change"] as const)
          : null,
        createdAt,
        expiresAt,
        absoluteExpiresAt,
        lastActivityAt,
      });

      // Log only revocations (aligned with core "sessions.revoke")
      if (process.env.ENCRYPTION_KEY && isRevoked) {
        await activityService.logAction(
          adminUserId,
          "revoke",
          "sessions",
          { type: "session", id, name: `${browser} on ${os}` },
          { metadata: { seeded: true, runId } },
        );
        activitiesCreated++;
      }
    }

    result.created.sessions = sessionsCount;

    result.created.activities = activitiesCreated;
    result.sampleUsers = createdUsers.slice(0, 6);

    result.success = true;

    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log("");
      console.log("Demo seeding completed");
      console.log("=====================");
      console.log(`Run ID: ${runId}`);
      console.log("");
      console.log(`Users:      ${result.created.users}`);
      console.log(`Task lists: ${result.created.taskLists}`);
      console.log(`Tasks:      ${result.created.tasks}`);
      console.log(`Notes:      ${result.created.notes}`);
      console.log(`Sessions:   ${result.created.sessions}`);
      console.log(
        `Activities: ${result.created.activities}${process.env.ENCRYPTION_KEY ? "" : " (skipped: ENCRYPTION_KEY missing)"}`,
      );
      console.log("");
      console.log("Sample users:");
      for (const u of result.sampleUsers ?? []) {
        console.log(`  - ${u.email} (${u.role})`);
      }
      console.log("");
      console.log(`Password for all demo users: ${password}`);
      console.log("");
    }

    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.error = message;

    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error("");
      console.error("Error seeding demo data:", message);
      console.error("");
    }

    process.exit(1);
  }
}

main();
