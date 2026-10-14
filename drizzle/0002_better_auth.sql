-- Migration: NextAuth -> Better Auth
-- Purpose: Adapt auth tables to the Better Auth session/account/verification models.
-- Effect: All existing sessions are invalidated (users must sign in again).

-- user_sessions: Better Auth `session` model + auth context
ALTER TABLE "user_sessions" ADD COLUMN IF NOT EXISTS "auth_method" varchar(20);
ALTER TABLE "user_sessions" ADD COLUMN IF NOT EXISTS "step_up_auth_at" timestamp with time zone;
ALTER TABLE "user_sessions" ADD COLUMN IF NOT EXISTS "impersonated_user_id" uuid
  REFERENCES "users"("id") ON DELETE SET NULL;

-- NextAuth JWT cookies are no longer valid; close the matching rows too
UPDATE "user_sessions"
SET "is_revoked" = true,
    "revoked_at" = now(),
    "revoked_reason" = 'Migrated to Better Auth',
    "expires_at" = now()
WHERE "is_revoked" = false;

-- accounts: Better Auth `account` model
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_id_unique" UNIQUE ("id");
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "access_token_expires_at" timestamp with time zone;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "refresh_token_expires_at" timestamp with time zone;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "password" text;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();
ALTER TABLE "accounts" ALTER COLUMN "type" SET DEFAULT 'oauth';

-- verifications: Better Auth `verification` model (OAuth state)
CREATE TABLE IF NOT EXISTS "verifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "verifications_identifier_idx" ON "verifications" USING btree ("identifier");
