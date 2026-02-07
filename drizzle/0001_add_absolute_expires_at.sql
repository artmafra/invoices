-- Migration: Add absolute_expires_at column to user_sessions table
-- Purpose: Enforce maximum session lifetime (45 days) to prevent indefinite session extension
-- Security: Fixes medium-severity issue where stolen sessions can be kept alive forever

-- Step 1: Add the column as nullable first (for existing rows)
ALTER TABLE "user_sessions" ADD COLUMN "absolute_expires_at" timestamp with time zone;

-- Step 2: Backfill existing sessions with absolute expiry = created_at + 45 days
-- This ensures existing sessions get a retroactive absolute cap
UPDATE "user_sessions" 
SET "absolute_expires_at" = "created_at" + INTERVAL '45 days'
WHERE "absolute_expires_at" IS NULL;

-- Step 3: Make the column NOT NULL now that all rows have values
ALTER TABLE "user_sessions" ALTER COLUMN "absolute_expires_at" SET NOT NULL;

-- Step 4: Add index for efficient queries on absolute_expires_at
CREATE INDEX "user_sessions_absolute_expires_at_idx" ON "user_sessions" USING btree ("absolute_expires_at");
