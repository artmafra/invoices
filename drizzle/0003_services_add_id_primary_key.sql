-- Migration: Add id as primary key to services table and update invoices foreign key
-- This migration:
-- 1. Adds 'id' column to services table as uuid with gen_random_uuid()
-- 2. Populates id for existing services
-- 3. Makes 'code' unique instead of primary key
-- 4. Adds 'service_id' column to invoices table
-- 5. Populates service_id based on existing service_code
-- 6. Updates foreign key constraint in invoices

-- Step 1: Add id column to services table
ALTER TABLE services ADD COLUMN id UUID DEFAULT gen_random_uuid();

-- Step 2: Add unique constraint to code column (it's currently the primary key)
-- First, we need to drop the existing primary key
ALTER TABLE services DROP CONSTRAINT services_pkey;

-- Step 3: Make id the new primary key
ALTER TABLE services ADD PRIMARY KEY (id);

-- Step 4: Make code unique and not null
ALTER TABLE services ADD CONSTRAINT services_code_unique UNIQUE (code);

-- Step 5: Add service_id column to invoices table
ALTER TABLE invoices ADD COLUMN service_id UUID;

-- Step 6: Populate service_id from service_code using a join
UPDATE invoices
SET service_id = services.id
FROM services
WHERE invoices.service_code = services.code;

-- Step 7: Drop the old foreign key constraint on service_code
ALTER TABLE invoices DROP CONSTRAINT invoices_service_code_services_code_fk;

-- Step 8: Make service_id not null
ALTER TABLE invoices ALTER COLUMN service_id SET NOT NULL;

-- Step 9: Add foreign key constraint to service_id
ALTER TABLE invoices ADD CONSTRAINT invoices_service_id_services_id_fk 
  FOREIGN KEY (service_id) REFERENCES services(id);

-- Step 10: Drop the old service_code column
ALTER TABLE invoices DROP COLUMN service_code;
