-- Fix get_account_id() so staff users (with auth_user_id in staff table) can access their account data.
-- This allows managers and owners to see data on /sales, /products, /inventory, /customers pages.
-- Run this in Supabase SQL Editor.

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

-- Verify (as a staff user): SELECT get_account_id();
