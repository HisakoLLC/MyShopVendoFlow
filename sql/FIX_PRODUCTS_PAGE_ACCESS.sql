-- FIX: /products page "Couldn't load products" / "You don't have permission"
-- Run this in Supabase SQL Editor after FIX_ALL_RLS_ISSUES.sql and FIX_DASHBOARD_ACCESS.sql.
-- The products page fetches categories, seasons, and product_styles; seasons had no GRANT/RLS.

-- ============================================================================
-- 0. TABLE-LEVEL GRANTS for SEASONS (required for authenticated role)
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.seasons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.seasons TO service_role;

-- ============================================================================
-- 1. Ensure helper function exists (idempotent)
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
-- 2. SEASONS TABLE – RLS and policies
-- ============================================================================
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view seasons for their account" ON seasons;
DROP POLICY IF EXISTS "Users can create seasons for their account" ON seasons;
DROP POLICY IF EXISTS "Users can update seasons for their account" ON seasons;
DROP POLICY IF EXISTS "Users can delete seasons for their account" ON seasons;

CREATE POLICY "Users can view seasons for their account"
ON seasons FOR SELECT TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can create seasons for their account"
ON seasons FOR INSERT TO authenticated
WITH CHECK (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can update seasons for their account"
ON seasons FOR UPDATE TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()))
WITH CHECK (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can delete seasons for their account"
ON seasons FOR DELETE TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()));
