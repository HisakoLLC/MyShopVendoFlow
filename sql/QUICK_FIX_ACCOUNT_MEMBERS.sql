-- QUICK FIX: Ensure account_members has proper SELECT policy
-- This is critical because other tables' RLS policies depend on querying account_members
-- Run this FIRST if you're getting "permission denied for table account_members" errors

-- Step 1: Enable RLS on account_members
ALTER TABLE account_members ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies
DROP POLICY IF EXISTS "Users can view their membership" ON account_members;
DROP POLICY IF EXISTS "Users can create their own membership" ON account_members;
DROP POLICY IF EXISTS "Users can update their membership" ON account_members;

-- Step 3: Create SELECT policy - CRITICAL: This must allow subqueries from other tables
CREATE POLICY "Users can view their membership"
ON account_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Step 4: Create INSERT policy
CREATE POLICY "Users can create their own membership"
ON account_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Step 5: Create UPDATE policy
CREATE POLICY "Users can update their membership"
ON account_members
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Step 6: Verify the policy exists and test it
SELECT 
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'account_members';

-- Step 7: Test if you can query account_members
SELECT account_id 
FROM account_members 
WHERE user_id = auth.uid();
