-- FIX: "permission denied for table categories" on onboarding Step 2
-- Run this in Supabase SQL Editor. Ensures get_user_account_ids() exists, then grants + RLS for categories.

-- Table-level GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categories TO service_role;

-- Helper (creates if missing; safe to run after FIX_ALL_RLS_ISSUES.sql)
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

-- RLS for categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view categories for their account" ON categories;
DROP POLICY IF EXISTS "Users can create categories for their account" ON categories;
DROP POLICY IF EXISTS "Users can update categories for their account" ON categories;
DROP POLICY IF EXISTS "Users can delete categories for their account" ON categories;
DROP POLICY IF EXISTS "Tenant isolation for categories" ON categories;

CREATE POLICY "Users can view categories for their account"
ON categories FOR SELECT TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can create categories for their account"
ON categories FOR INSERT TO authenticated
WITH CHECK (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can update categories for their account"
ON categories FOR UPDATE TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()))
WITH CHECK (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can delete categories for their account"
ON categories FOR DELETE TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()));
