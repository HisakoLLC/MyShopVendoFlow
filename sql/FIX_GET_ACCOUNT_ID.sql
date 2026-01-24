-- Fix the get_account_id function to properly return the account ID
-- Run this in Supabase SQL Editor

-- Step 1: Check if account_members record exists for your user
SELECT 
    am.member_id,
    am.user_id,
    am.account_id,
    am.role,
    a.business_name,
    u.email as user_email
FROM account_members am
JOIN accounts a ON am.account_id = a.account_id
LEFT JOIN auth.users u ON am.user_id = u.id
WHERE am.user_id = auth.uid();

-- Step 2: If the above returns no rows, check all accounts and account_members
SELECT 
    a.account_id,
    a.business_name,
    a.owner_email,
    am.user_id,
    u.email as user_email
FROM accounts a
LEFT JOIN account_members am ON a.account_id = am.account_id
LEFT JOIN auth.users u ON am.user_id = u.id
ORDER BY a.created_at DESC
LIMIT 10;

-- Step 3: Create or replace the get_account_id function
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

  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get account_id from account_members
  SELECT account_id INTO v_account_id
  FROM account_members
  WHERE user_id = v_user_id
  LIMIT 1;

  RETURN v_account_id;
END;
$$;

-- Step 4: Grant execute permission
GRANT EXECUTE ON FUNCTION get_account_id() TO authenticated;

-- Step 5: Test the function
SELECT get_account_id() as account_id;

-- Step 6: If get_account_id() still returns null, manually link your user to an account
-- First, get your user ID and an account ID from the queries above, then run:
-- INSERT INTO account_members (member_id, account_id, user_id, role)
-- VALUES (gen_random_uuid(), 'YOUR_ACCOUNT_ID_HERE', auth.uid(), 'owner')
-- ON CONFLICT DO NOTHING;
