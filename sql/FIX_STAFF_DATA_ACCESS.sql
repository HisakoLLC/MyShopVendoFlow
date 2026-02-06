-- Fix data access for staff (managers and owners) after PIN login.
-- This ensures get_account_id() and get_user_account_ids() work for staff users,
-- allowing them to see data on /sales, /products, /inventory, /customers pages.
-- Run this in Supabase SQL Editor.

-- ============================================================================
-- 1. Fix get_account_id() to check staff table first
-- ============================================================================
CREATE OR REPLACE FUNCTION get_account_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id UUID;
  v_user_id UUID;
  v_meta jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Staff (individual auth user): account_id from staff table where auth_user_id = current user
  SELECT s.account_id INTO v_account_id
  FROM staff s
  WHERE s.auth_user_id = v_user_id
    AND s.active = true
  LIMIT 1;

  IF v_account_id IS NOT NULL THEN
    RETURN v_account_id;
  END IF;

  -- Legacy: staff with shared user (user_metadata.account_id)
  v_meta := auth.jwt() -> 'user_metadata';
  IF v_meta ? 'account_id' AND v_meta->>'account_id' IS NOT NULL AND v_meta->>'account_id' != '' THEN
    BEGIN
      v_account_id := (v_meta->>'account_id')::uuid;
      RETURN v_account_id;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- fall through to account_members
    END;
  END IF;

  -- Owner / normal user: from account_members
  SELECT account_id INTO v_account_id
  FROM account_members
  WHERE user_id = v_user_id
  LIMIT 1;

  RETURN v_account_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_account_id() TO authenticated;

-- ============================================================================
-- 2. Fix get_user_account_ids() to check staff table first (for RLS policies)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_account_ids()
RETURNS TABLE(account_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Staff (individual auth user): account_id from staff table where auth_user_id = current user
  RETURN QUERY
  SELECT s.account_id
  FROM staff s
  WHERE s.auth_user_id = auth.uid()
    AND s.active = true
  LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  -- Legacy: staff with shared user (user_metadata.account_id)
  IF (auth.jwt() -> 'user_metadata' ->> 'account_id') IS NOT NULL
     AND trim(auth.jwt() -> 'user_metadata' ->> 'account_id') != '' THEN
    BEGIN
      RETURN QUERY SELECT (trim(auth.jwt() -> 'user_metadata' ->> 'account_id'))::uuid;
      RETURN;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- Owner / normal user: from account_members
  RETURN QUERY
  SELECT am.account_id
  FROM account_members am
  WHERE am.user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_account_ids() TO authenticated;

-- ============================================================================
-- 3. Verify functions work
-- ============================================================================
-- Test as a staff user:
-- SELECT get_account_id() as account_id;
-- SELECT account_id FROM get_user_account_ids();
