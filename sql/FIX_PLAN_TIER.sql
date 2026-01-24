-- Fix the create_account function to use NULL for plan_tier
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION create_account(
  p_business_name TEXT,
  p_owner_email TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id UUID;
  v_member_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the current authenticated user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Check if user already has an account
  SELECT account_id INTO v_account_id
  FROM account_members
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_account_id IS NOT NULL THEN
    RETURN v_account_id;
  END IF;

  -- Generate new IDs
  v_account_id := gen_random_uuid();
  v_member_id := gen_random_uuid();

  -- Create account (using 'starter' as default plan tier)
  INSERT INTO accounts (
    account_id,
    business_name,
    owner_email,
    plan_tier,
    subscription_status
  ) VALUES (
    v_account_id,
    p_business_name,
    p_owner_email,
    'starter',  -- Valid values: 'starter', 'core', 'scale'
    'active'
  );

  -- Link user to account
  INSERT INTO account_members (
    member_id,
    account_id,
    user_id,
    role
  ) VALUES (
    v_member_id,
    v_account_id,
    v_user_id,
    'owner'
  );

  RETURN v_account_id;
END;
$$;

-- Grant permission (if not already granted)
GRANT EXECUTE ON FUNCTION create_account(TEXT, TEXT) TO authenticated;

-- Optional: Check what valid values are allowed for plan_tier
-- Run this to see the check constraint:
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'accounts'::regclass
  AND conname LIKE '%plan_tier%';
