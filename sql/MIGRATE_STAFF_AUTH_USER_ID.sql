-- MIGRATION: Add auth_user_id to staff table for individual auth users
-- This enables secure PIN-only login without account_id requirement
-- Run this in Supabase SQL Editor

-- ============================================================================
-- 1. Add auth_user_id column to staff table
-- ============================================================================
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- ============================================================================
-- 2. Create unique indexes for security and performance
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_auth_user ON staff(auth_user_id) 
WHERE auth_user_id IS NOT NULL;

-- Global PIN uniqueness: ensure no two staff (across all accounts) have same PIN
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_pin_hash ON staff(pin_hash) 
WHERE pin_hash IS NOT NULL AND active = true;

-- ============================================================================
-- 3. Add comment explaining the column
-- ============================================================================
COMMENT ON COLUMN staff.auth_user_id IS 
'References auth.users.id for individual staff authentication. Each staff member has their own auth user with email format staff-{staff_id}@vendoflow.internal';

-- ============================================================================
-- 4. Verify the migration
-- ============================================================================
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'staff' 
  AND column_name = 'auth_user_id';

SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'staff' 
  AND indexname IN ('idx_staff_auth_user', 'idx_staff_pin_hash');
