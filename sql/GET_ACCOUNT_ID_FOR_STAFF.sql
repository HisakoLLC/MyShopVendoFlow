-- Optional: Update get_account_id so staff (shared PIN user) get account_id from JWT user_metadata.
-- Run after ADD_STAFF_PIN_LOCKOUT.sql if you want get_account_id() to work for staff in RPC/DB context.

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

  -- Staff (shared PIN user): account_id is in JWT user_metadata (set by bind-staff)
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
