-- RPC to fetch the current user's account row for /settings. Uses get_account_id() and bypasses RLS (SECURITY DEFINER).
-- Run in Supabase SQL Editor. Fixes "Account not found" on /settings for staff (and works for owners too).
-- Requires get_account_id() to exist (run GET_ACCOUNT_ID_FOR_STAFF.sql for staff support).

CREATE OR REPLACE FUNCTION get_account_for_settings()
RETURNS TABLE (
  account_id uuid,
  business_name text,
  owner_email text,
  plan_tier text,
  subscription_status text,
  trial_ends_at timestamptz,
  stripe_customer_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_account_id uuid;
BEGIN
  v_account_id := get_account_id();
  IF v_account_id IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT
    a.account_id,
    a.business_name,
    a.owner_email,
    a.plan_tier,
    a.subscription_status,
    a.trial_ends_at,
    a.stripe_customer_id
  FROM accounts a
  WHERE a.account_id = v_account_id
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_account_for_settings() TO authenticated;
