declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // ===========================================
      // Application
      // ===========================================
      NODE_ENV: "development" | "production" | "test";
      NEXT_PUBLIC_APP_URL?: string;
      PORT?: string;

      // ===========================================
      // Database (PostgreSQL)
      // ===========================================
      DATABASE_URL: string;
      DATABASE_POOL_SIZE?: string;
      DATABASE_IDLE_TIMEOUT?: string;
      DATABASE_CONNECT_TIMEOUT?: string;

      // ===========================================
      // Encryption (Sensitive Data at Rest)
      // ===========================================
      ENCRYPTION_KEY: string;
      ENCRYPTION_KEYS_LEGACY?: string;

      // ===========================================
      // Auth.js (NextAuth v5)
      // ===========================================
      AUTH_URL?: string;
      AUTH_SECRET: string;
      AUTH_TRUST_HOST?: string;
      SESSION_ABSOLUTE_LIFETIME_DAYS?: string;

      // ===========================================
      // Google OAuth (User Login)
      // ===========================================
      NEXT_PUBLIC_AUTH_GOOGLE_CLIENT_ID?: string;
      AUTH_GOOGLE_SECRET?: string;

      // ===========================================
      // Passkeys / WebAuthn
      // ===========================================
      WEBAUTHN_RP_ID?: string;
      WEBAUTHN_ORIGINS?: string;

      // ===========================================
      // Gmail API (Email Sending)
      // ===========================================
      GMAIL_CLIENT_ID?: string;
      GMAIL_CLIENT_SECRET?: string;
      GMAIL_REFRESH_TOKEN?: string;
      GMAIL_FROM_EMAIL?: string;

      // ===========================================
      // Google Cloud Storage (File Uploads)
      // ===========================================
      GOOGLE_CLOUD_PROJECT_ID?: string;
      GOOGLE_CLOUD_STORAGE_BUCKET?: string;
      GOOGLE_CLOUD_CREDENTIALS?: string;

      // ===========================================
      // Redis (Rate Limiting, Caching, & Queues)
      // ===========================================
      REDIS_URL?: string;
      ENABLE_VERSION_CACHE?: string;
      QUEUE_CONCURRENCY?: string;

      // ===========================================
      // Cron Jobs
      // ===========================================
      CRON_SECRET?: string;

      // ===========================================
      // Development / Testing
      // ===========================================
      TEST_DEFAULT_PASSWORD?: string;
    }
  }
}

export {};
