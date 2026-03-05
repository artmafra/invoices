-- Migration: Add id as primary key to suppliers table
-- Purpose: Allow CNPJ to be editable while maintaining proper foreign key relationships
-- Change: CNPJ becomes a unique field instead of primary key

-- Step 1: Add id column with serial (auto-increment)
ALTER TABLE "suppliers" ADD COLUMN "id" SERIAL;

-- Step 2: Backfill id values for existing rows (serial already handles this)
-- The SERIAL type automatically assigns sequential values

-- Step 3: Drop the existing primary key constraint on cnpj
ALTER TABLE "suppliers" DROP CONSTRAINT "suppliers_pkey";

-- Step 4: Set id as the new primary key
ALTER TABLE "suppliers" ADD PRIMARY KEY ("id");

-- Step 5: Ensure cnpj remains unique (it already has a unique constraint from schema)
-- The unique constraint on cnpj should already exist, but let's ensure it
-- First check if it exists, if not, add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'suppliers_cnpj_unique'
    ) THEN
        ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_cnpj_unique" UNIQUE ("cnpj");
    END IF;
END $$;

-- Step 6: Create index on id for faster lookups (primary key already creates this)
-- No additional index needed as PRIMARY KEY creates one automatically

-- Step 7: Keep the unique constraint on name as well
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'suppliers_name_unique'
    ) THEN
        ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_name_unique" UNIQUE ("name");
    END IF;
END $$;
