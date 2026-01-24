-- QUICK FIX: Fix "permission denied for table stores" Error
-- Run this in Supabase SQL Editor to immediately fix the stores table permission issue

-- Step 1: Enable RLS on stores table
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop any existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view stores for their account" ON stores;
DROP POLICY IF EXISTS "Users can create stores for their account" ON stores;
DROP POLICY IF EXISTS "Users can update stores for their account" ON stores;
DROP POLICY IF EXISTS "Users can delete stores for their account" ON stores;
DROP POLICY IF EXISTS "Tenant isolation for stores" ON stores;

-- Step 3: Create the helper function (if it doesn't exist)
-- This function helps bypass circular dependency issues with RLS
CREATE OR REPLACE FUNCTION get_user_account_ids()
RETURNS TABLE(account_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT am.account_id
  FROM account_members am
  WHERE am.user_id = auth.uid();
END;
$$;

-- Step 4: Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_user_account_ids() TO authenticated;

-- Step 5: Create RLS policies for stores table using the helper function
CREATE POLICY "Users can view stores for their account"
ON stores
FOR SELECT
TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can create stores for their account"
ON stores
FOR INSERT
TO authenticated
WITH CHECK (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can update stores for their account"
ON stores
FOR UPDATE
TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()))
WITH CHECK (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can delete stores for their account"
ON stores
FOR DELETE
TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()));

-- Step 6: Verify the policies were created
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'stores'
ORDER BY policyname;

-- Step 7: Verify your user is linked to an account
-- Run this query separately to check if you have an account_members record:
-- SELECT 
--     am.member_id,
--     am.user_id,
--     am.account_id,
--     am.role,
--     a.business_name
-- FROM account_members am
-- JOIN accounts a ON am.account_id = a.account_id
-- WHERE am.user_id = auth.uid();
