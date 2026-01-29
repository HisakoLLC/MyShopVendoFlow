-- FIX: permission denied for table suppliers
-- Run this in Supabase SQL Editor to allow authenticated users to read/write
-- their account's suppliers (required for Create Purchase Order form).

-- ============================================================================
-- STEP 0: Ensure helper exists (skip if you already ran FIX_ALL_RLS_ISSUES.sql)
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
-- STEP 1: TABLE-LEVEL GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.suppliers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.suppliers TO service_role;

-- ============================================================================
-- STEP 2: ENABLE RLS AND POLICIES
-- ============================================================================

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view suppliers for their account" ON public.suppliers;
DROP POLICY IF EXISTS "Users can create suppliers for their account" ON public.suppliers;
DROP POLICY IF EXISTS "Users can update suppliers for their account" ON public.suppliers;
DROP POLICY IF EXISTS "Users can delete suppliers for their account" ON public.suppliers;
DROP POLICY IF EXISTS "Tenant isolation for suppliers" ON public.suppliers;

-- SELECT: Users can view suppliers for their account
CREATE POLICY "Users can view suppliers for their account"
ON public.suppliers
FOR SELECT
TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()));

-- INSERT: Users can create suppliers for their account
CREATE POLICY "Users can create suppliers for their account"
ON public.suppliers
FOR INSERT
TO authenticated
WITH CHECK (account_id IN (SELECT account_id FROM get_user_account_ids()));

-- UPDATE: Users can update suppliers for their account
CREATE POLICY "Users can update suppliers for their account"
ON public.suppliers
FOR UPDATE
TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()))
WITH CHECK (account_id IN (SELECT account_id FROM get_user_account_ids()));

-- DELETE: Users can delete suppliers for their account
CREATE POLICY "Users can delete suppliers for their account"
ON public.suppliers
FOR DELETE
TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()));

-- ============================================================================
-- VERIFY
-- ============================================================================

SELECT 'suppliers policies created' AS status, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'suppliers'
ORDER BY policyname;
