-- FIX DASHBOARD STORES ACCESS
-- Run this to fix the "permission denied for table stores" error on dashboard

-- Step 1: Drop the conflicting "Tenant isolation" policy if it exists
DROP POLICY IF EXISTS "Tenant isolation for stores" ON stores;

-- Step 2: Ensure get_user_account_ids() helper function exists (from FIX_RLS_WITH_HELPER_FUNCTION.sql)
-- This function is more reliable than subqueries
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

-- Step 3: Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_account_ids() TO authenticated;

-- Step 4: Drop existing stores policies
DROP POLICY IF EXISTS "Users can view stores for their account" ON stores;
DROP POLICY IF EXISTS "Users can create stores for their account" ON stores;
DROP POLICY IF EXISTS "Users can update stores for their account" ON stores;
DROP POLICY IF EXISTS "Users can delete stores for their account" ON stores;

-- Step 5: Recreate policies using the helper function (more reliable)
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

-- Step 6: Verify your user is linked to an account
-- Run this query to check:
SELECT 
    am.member_id,
    am.user_id,
    am.account_id,
    am.role,
    a.business_name,
    u.email as user_email
FROM account_members am
LEFT JOIN accounts a ON am.account_id = a.account_id
LEFT JOIN auth.users u ON am.user_id = u.id
WHERE am.user_id = auth.uid();

-- Step 7: If the above returns no rows, you need to link your user to an account
-- First, find an account_id:
-- SELECT account_id, business_name FROM accounts LIMIT 1;
-- Then run (replace 'YOUR_ACCOUNT_ID_HERE' with actual account_id):
-- INSERT INTO account_members (member_id, account_id, user_id, role)
-- VALUES (gen_random_uuid(), 'YOUR_ACCOUNT_ID_HERE', auth.uid(), 'owner')
-- ON CONFLICT DO NOTHING;

-- Step 8: Test the policies
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'stores'
ORDER BY policyname;
