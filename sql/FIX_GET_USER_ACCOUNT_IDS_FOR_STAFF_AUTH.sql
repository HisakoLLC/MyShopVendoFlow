-- Fix "Store Not Set Up" for staff who log in with PIN (individual auth users).
-- Staff are identified by staff.auth_user_id = auth.uid(); they no longer use user_metadata.account_id.
-- Run this in Supabase SQL Editor after MIGRATE_STAFF_AUTH_USER_ID.sql.

-- Update get_user_account_ids() so staff (with auth_user_id in staff table) get their account_id.
-- This allows staff to read stores and other data for their account.
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

-- Your stores table should allow SELECT where account_id IN (get_user_account_ids()).
-- If you have "Users can view stores for their account" with that condition, staff will
-- now see stores after this function update. If staff still cannot see stores, add a policy:
--   CREATE POLICY "Staff can view stores for their account" ON stores FOR SELECT TO authenticated
--   USING (account_id IN (SELECT account_id FROM get_user_account_ids()));

-- Verify (as a staff user): SELECT account_id FROM get_user_account_ids();
