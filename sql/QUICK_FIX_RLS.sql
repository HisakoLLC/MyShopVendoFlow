-- QUICK FIX: Enable RLS Policies for Account Creation
-- Run this in Supabase SQL Editor if the RPC function approach isn't working

-- Step 1: Enable RLS on both tables (if not already enabled)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_members ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies if they exist (optional - will error if they don't exist, that's okay)
DROP POLICY IF EXISTS "Users can create their own account" ON accounts;
DROP POLICY IF EXISTS "Users can create their own membership" ON account_members;

-- Step 3: Create INSERT policy for accounts table
CREATE POLICY "Users can create their own account"
ON accounts
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Step 4: Create INSERT policy for account_members table
CREATE POLICY "Users can create their own membership"
ON account_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename IN ('accounts', 'account_members')
ORDER BY tablename, policyname;
