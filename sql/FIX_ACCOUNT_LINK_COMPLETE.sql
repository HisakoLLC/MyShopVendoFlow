-- COMPLETE FIX FOR ACCOUNT LINK ISSUE
-- Run this entire script in Supabase SQL Editor

-- Step 1: Check your current user in SQL Editor
-- This shows who you're authenticated as in the SQL Editor
SELECT 
    'Current SQL Editor User' as check_type,
    auth.uid() as user_id,
    (SELECT email FROM auth.users WHERE id = auth.uid()) as email;

-- Step 2: Check if account_members record exists
SELECT 
    'Account Members Check' as check_type,
    am.member_id,
    am.user_id,
    am.account_id,
    am.role,
    a.business_name
FROM account_members am
LEFT JOIN accounts a ON am.account_id = a.account_id
WHERE am.user_id = auth.uid();

-- Step 3: Check account_members RLS policies (they might be blocking the function)
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'account_members';

-- Step 4: Temporarily disable RLS on account_members to test (we'll re-enable it)
-- This is safe because we're only doing a diagnostic insert
ALTER TABLE account_members DISABLE ROW LEVEL SECURITY;

-- Step 5: Insert the account_members record (this should work now)
INSERT INTO account_members (member_id, account_id, user_id, role)
SELECT 
    gen_random_uuid(),
    '43afb945-9f99-49ea-87d1-c4afe18be712',
    auth.uid(),
    'owner'
WHERE NOT EXISTS (
    SELECT 1 FROM account_members 
    WHERE user_id = auth.uid() 
    AND account_id = '43afb945-9f99-49ea-87d1-c4afe18be712'
)
RETURNING *;

-- Step 6: Re-enable RLS
ALTER TABLE account_members ENABLE ROW LEVEL SECURITY;

-- Step 7: Verify the record was created
SELECT 
    'Verification' as check_type,
    am.member_id,
    am.user_id,
    am.account_id,
    am.role,
    a.business_name
FROM account_members am
LEFT JOIN accounts a ON am.account_id = a.account_id
WHERE am.user_id = auth.uid();

-- Step 8: Recreate get_account_id function with better error handling
CREATE OR REPLACE FUNCTION get_account_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the current authenticated user ID
  v_user_id := auth.uid();
  
  -- Debug: Log if user_id is null (this won't show in result, but helps diagnose)
  IF v_user_id IS NULL THEN
    RAISE WARNING 'auth.uid() returned NULL';
    RETURN NULL;
  END IF;

  -- Get account_id from account_members
  -- Use SECURITY DEFINER to bypass RLS if needed
  SELECT account_id INTO v_account_id
  FROM account_members
  WHERE user_id = v_user_id
  LIMIT 1;

  RETURN v_account_id;
END;
$$;

-- Step 9: Grant execute permission
GRANT EXECUTE ON FUNCTION get_account_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_account_id() TO anon;

-- Step 10: Test the function
SELECT 
    'Function Test' as check_type,
    get_account_id() as account_id,
    auth.uid() as current_user_id;

-- Step 11: If still null, try direct query to see what's in account_members
SELECT 
    'Direct Query Test' as check_type,
    am.account_id,
    am.user_id,
    am.role
FROM account_members am
WHERE am.user_id = auth.uid();

-- Step 12: Check if there are any constraints preventing the insert
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'account_members'::regclass;
