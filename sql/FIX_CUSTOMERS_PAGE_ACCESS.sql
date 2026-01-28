-- FIX: /customers page "Couldn't load customers" / "permission denied for table customers"
-- Run this in Supabase SQL Editor. Adds GRANTs + RLS for the customers table.

-- ============================================================================
-- 0. TABLE-LEVEL GRANTS for CUSTOMERS (required for authenticated role)
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.customers TO service_role;

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
-- 2. CUSTOMERS TABLE – RLS and policies
-- ============================================================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view customers for their account" ON customers;
DROP POLICY IF EXISTS "Users can create customers for their account" ON customers;
DROP POLICY IF EXISTS "Users can update customers for their account" ON customers;
DROP POLICY IF EXISTS "Users can delete customers for their account" ON customers;

CREATE POLICY "Users can view customers for their account"
ON customers FOR SELECT TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can create customers for their account"
ON customers FOR INSERT TO authenticated
WITH CHECK (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can update customers for their account"
ON customers FOR UPDATE TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()))
WITH CHECK (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can delete customers for their account"
ON customers FOR DELETE TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()));
