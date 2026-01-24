-- FIX: "Permission denied for table accounts" during signup
-- Run this in Supabase SQL Editor to fix account creation during signup

-- Step 1: Enable RLS on accounts table (if not already enabled)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their account" ON accounts;
DROP POLICY IF EXISTS "Users can create their own account" ON accounts;
DROP POLICY IF EXISTS "Users can update their account" ON accounts;

-- Step 3: Create INSERT policy - Allow authenticated users to create accounts
-- This is needed during signup when account_members doesn't exist yet
CREATE POLICY "Users can create their own account"
ON accounts
FOR INSERT
TO authenticated
WITH CHECK (true);  -- Allow any authenticated user to create an account

-- Step 4: Create SELECT policy - Users can view their account
CREATE POLICY "Users can view their account"
ON accounts
FOR SELECT
TO authenticated
USING (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
);

-- Step 5: Create UPDATE policy - Users can update their account
CREATE POLICY "Users can update their account"
ON accounts
FOR UPDATE
TO authenticated
USING (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
);

-- Step 6: Enable RLS on account_members table
ALTER TABLE account_members ENABLE ROW LEVEL SECURITY;

-- Step 7: Drop existing account_members policies
DROP POLICY IF EXISTS "Users can view their membership" ON account_members;
DROP POLICY IF EXISTS "Users can create their own membership" ON account_members;
DROP POLICY IF EXISTS "Users can update their membership" ON account_members;

-- Step 8: Create account_members policies
CREATE POLICY "Users can view their membership"
ON account_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own membership"
ON account_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());  -- Users can only create their own membership

CREATE POLICY "Users can update their membership"
ON account_members
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Step 9: Verify policies were created
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename IN ('accounts', 'account_members')
ORDER BY tablename, policyname;

-- Step 10: Test - This should work now
-- Try signing up again in your app
