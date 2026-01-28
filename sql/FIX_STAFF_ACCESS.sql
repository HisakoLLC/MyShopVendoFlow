-- FIX: Allow sales to be created (cashier_id) by ensuring staff table is readable/writable.
-- Run this in Supabase SQL Editor. Required for POS checkout when the logged-in user
-- has no staff record yet (auto-creates one so cashier_id is valid).

-- ============================================================================
-- 0. TABLE-LEVEL GRANTS
-- ============================================================================
GRANT SELECT, INSERT, UPDATE ON TABLE public.staff TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.staff TO service_role;

-- ============================================================================
-- 1. Ensure helper exists (idempotent)
-- ============================================================================
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
GRANT EXECUTE ON FUNCTION get_user_account_ids() TO authenticated;

-- ============================================================================
-- 2. STAFF RLS (users see/manage staff for their account only)
-- ============================================================================
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view staff for their account" ON staff;
DROP POLICY IF EXISTS "Users can create staff for their account" ON staff;
DROP POLICY IF EXISTS "Users can update staff for their account" ON staff;
DROP POLICY IF EXISTS "Users can delete staff for their account" ON staff;

CREATE POLICY "Users can view staff for their account"
ON staff FOR SELECT TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can create staff for their account"
ON staff FOR INSERT TO authenticated
WITH CHECK (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can update staff for their account"
ON staff FOR UPDATE TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()))
WITH CHECK (account_id IN (SELECT account_id FROM get_user_account_ids()));
