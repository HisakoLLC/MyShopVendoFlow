-- Allow staff (shared PIN user) to read stores for their account via user_metadata.account_id.
-- Run in Supabase SQL Editor. Fixes "Store Not Set Up" when staff open POS.

-- Option A: If your stores table uses get_user_account_ids(), update it to return staff's account_id.
CREATE OR REPLACE FUNCTION get_user_account_ids()
RETURNS TABLE(account_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Staff (shared PIN user): account_id from JWT user_metadata (set by bind-staff)
  IF (auth.jwt() -> 'user_metadata' ->> 'account_id') IS NOT NULL
     AND trim(auth.jwt() -> 'user_metadata' ->> 'account_id') != '' THEN
    BEGIN
      RETURN QUERY SELECT (trim(auth.jwt() -> 'user_metadata' ->> 'account_id'))::uuid;
      RETURN;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- fall through to account_members
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

-- Option B: If your stores table uses account_members directly (no get_user_account_ids),
-- add a policy so staff can still SELECT stores for their account.
DROP POLICY IF EXISTS "Staff can view stores for their account" ON stores;
CREATE POLICY "Staff can view stores for their account"
ON stores
FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'account_id') IS NOT NULL
  AND (auth.jwt() -> 'user_metadata' ->> 'account_id')::uuid = stores.account_id
);
