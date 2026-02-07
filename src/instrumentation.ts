import { z } from "zod";

export async function register() {
  // Environment variable schema with runtime validation
  const envSchema = z.object({
    // ===========================================
    // Application
    // ===========================================
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    NEXT_PUBLIC_APP_URL: z.url(),
    PORT: z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).optional(),

    // ===========================================
    // Database (PostgreSQL)
    // ===========================================
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    DATABASE_POOL_SIZE: z.coerce.number().int().positive().default(5),
    DATABASE_IDLE_TIMEOUT: z.coerce.number().int().positive().default(20),
    DATABASE_CONNECT_TIMEOUT: z.coerce.number().int().positive().default(10),

    // ===========================================
    // Encryption (Sensitive Data at Rest)
    // ===========================================
    ENCRYPTION_KEY: z.string().min(32, "ENCRYPTION_KEY must be at least 32 characters"),
    ENCRYPTION_KEYS_LEGACY: z.string().optional(),

    // ===========================================
    // Auth.js (NextAuth v5)
    // ===========================================
    AUTH_URL: z.url(),
    AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
    AUTH_TRUST_HOST: z.coerce.boolean().default(false),

    // ===========================================
    // Google OAuth (User Login)
    // ===========================================
    NEXT_PUBLIC_AUTH_GOOGLE_CLIENT_ID: z.string().optional(),
    AUTH_GOOGLE_SECRET: z.string().optional(),

    // ===========================================
    // Passkeys / WebAuthn
    // ===========================================
    WEBAUTHN_RP_ID: z.string(),
    WEBAUTHN_ORIGINS: z.string(),

    // ===========================================
    // Gmail API (Email Sending)
    // ===========================================
    GMAIL_CLIENT_ID: z.string(),
    GMAIL_CLIENT_SECRET: z.string(),
    GMAIL_REFRESH_TOKEN: z.string(),
    GMAIL_FROM_EMAIL: z.email(),

    // ===========================================
    // Google Cloud Storage (File Uploads)
    // ===========================================
    GOOGLE_CLOUD_PROJECT_ID: z.string().optional(),
    GOOGLE_CLOUD_STORAGE_BUCKET: z.string().optional(),
    GOOGLE_CLOUD_CREDENTIALS: z.string().optional(),

    // ===========================================
    // Redis (Rate Limiting, Caching, & Queues)
    // ===========================================
    REDIS_URL: z.url(),
    ENABLE_VERSION_CACHE: z.coerce.boolean().default(false),
    QUEUE_CONCURRENCY: z.coerce.number().int().positive().default(5),

    // ===========================================
    // Cron Jobs
    // ===========================================
    CRON_SECRET: z.string().optional(),

    // ===========================================
    // Development / Testing
    // ===========================================
    TEST_DEFAULT_PASSWORD: z.string().optional(),
  });

  envSchema.parse(process.env);

  // Log optional integration status
  if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
    console.warn(
      "[Env] Gmail (email sending) not configured — required for invites/password reset/email 2FA",
    );
  }

  if (!process.env.GOOGLE_CLOUD_PROJECT_ID || !process.env.GOOGLE_CLOUD_STORAGE_BUCKET) {
    console.warn("[Env] Google Cloud Storage not configured — required for uploads/avatars");
  }

  if (!process.env.NEXT_PUBLIC_AUTH_GOOGLE_CLIENT_ID || !process.env.AUTH_GOOGLE_SECRET) {
    console.warn("[Env] Google OAuth not configured — users cannot sign in with Google");
  }

  console.info("[Env] Environment variables validated successfully");
}
