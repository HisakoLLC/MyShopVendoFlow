-- Fix RLS policies for stores table
-- Run this in Supabase SQL Editor

-- Step 1: Enable RLS on stores table (if not already enabled)
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies if they exist (optional)
DROP POLICY IF EXISTS "Users can view stores for their account" ON stores;
DROP POLICY IF EXISTS "Users can create stores for their account" ON stores;
DROP POLICY IF EXISTS "Users can update stores for their account" ON stores;
DROP POLICY IF EXISTS "Users can delete stores for their account" ON stores;

-- Step 3: Create SELECT policy - allow users to view stores for their account
CREATE POLICY "Users can view stores for their account"
ON stores
FOR SELECT
TO authenticated
USING (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
);

-- Step 4: Create INSERT policy - allow users to create stores for their account
CREATE POLICY "Users can create stores for their account"
ON stores
FOR INSERT
TO authenticated
WITH CHECK (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
);

-- Step 5: Create UPDATE policy - allow users to update stores for their account
CREATE POLICY "Users can update stores for their account"
ON stores
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

-- Step 6: Create DELETE policy - allow users to delete stores for their account
CREATE POLICY "Users can delete stores for their account"
ON stores
FOR DELETE
TO authenticated
USING (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
);

-- Step 7: Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'stores'
ORDER BY policyname;
