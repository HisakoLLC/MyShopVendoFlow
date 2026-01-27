-- COMPREHENSIVE FIX FOR ALL RLS ISSUES
-- Run this entire script to fix permission denied errors
-- This will reset and properly configure all RLS policies
--
-- IMPORTANT: RLS policies only restrict access; the authenticated role must
-- have table-level GRANTs first. If you get 42501 even with policies, run this
-- script (it now includes GRANTs).

-- ============================================================================
-- STEP 0: TABLE-LEVEL GRANTS (required for authenticated to use the tables)
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.accounts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.account_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.account_members TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.stores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.stores TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categories TO service_role;

-- ============================================================================
-- STEP 1: ACCOUNTS TABLE - Allow account creation during signup
-- ============================================================================

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their account" ON accounts;
DROP POLICY IF EXISTS "Users can create their own account" ON accounts;
DROP POLICY IF EXISTS "Users can update their account" ON accounts;
DROP POLICY IF EXISTS "Tenant isolation for accounts" ON accounts;
DROP POLICY IF EXISTS "Account owners can view" ON accounts;
DROP POLICY IF EXISTS "Account owners can update" ON accounts;

-- INSERT: Allow any authenticated user to create an account (needed during signup)
CREATE POLICY "Users can create their own account"
ON accounts
FOR INSERT
TO authenticated
WITH CHECK (true);  -- No restrictions - any authenticated user can create

-- SELECT: Users can view accounts they're members of
CREATE POLICY "Users can view their account"
ON accounts
FOR SELECT
TO authenticated
USING (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
);

-- UPDATE: Users can update accounts they're members of
CREATE POLICY "Users can update their account"
ON accounts
FOR UPDATE
TO authenticated
USING (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- STEP 2: ACCOUNT_MEMBERS TABLE - Allow membership creation during signup
-- ============================================================================

ALTER TABLE account_members ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their membership" ON account_members;
DROP POLICY IF EXISTS "Users can create their own membership" ON account_members;
DROP POLICY IF EXISTS "Users can update their membership" ON account_members;
DROP POLICY IF EXISTS "Tenant isolation for account_members" ON account_members;

-- INSERT: Users can create their own membership (needed during signup)
CREATE POLICY "Users can create their own membership"
ON account_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());  -- Users can only create their own membership

-- SELECT: Users can view their own membership
CREATE POLICY "Users can view their membership"
ON account_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- UPDATE: Users can update their own membership
CREATE POLICY "Users can update their membership"
ON account_members
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- STEP 3: STORES TABLE - Allow store creation during onboarding
-- ============================================================================

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view stores for their account" ON stores;
DROP POLICY IF EXISTS "Users can create stores for their account" ON stores;
DROP POLICY IF EXISTS "Users can update stores for their account" ON stores;
DROP POLICY IF EXISTS "Users can delete stores for their account" ON stores;
DROP POLICY IF EXISTS "Tenant isolation for stores" ON stores;

-- Create helper function if it doesn't exist
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

-- SELECT: Users can view stores for their account
CREATE POLICY "Users can view stores for their account"
ON stores
FOR SELECT
TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()));

-- INSERT: Users can create stores for their account
CREATE POLICY "Users can create stores for their account"
ON stores
FOR INSERT
TO authenticated
WITH CHECK (account_id IN (SELECT account_id FROM get_user_account_ids()));

-- UPDATE: Users can update stores for their account
CREATE POLICY "Users can update stores for their account"
ON stores
FOR UPDATE
TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()))
WITH CHECK (account_id IN (SELECT account_id FROM get_user_account_ids()));

-- DELETE: Users can delete stores for their account
CREATE POLICY "Users can delete stores for their account"
ON stores
FOR DELETE
TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()));

-- ============================================================================
-- STEP 3b: CATEGORIES TABLE - Allow category creation during onboarding
-- ============================================================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view categories for their account" ON categories;
DROP POLICY IF EXISTS "Users can create categories for their account" ON categories;
DROP POLICY IF EXISTS "Users can update categories for their account" ON categories;
DROP POLICY IF EXISTS "Users can delete categories for their account" ON categories;
DROP POLICY IF EXISTS "Tenant isolation for categories" ON categories;

CREATE POLICY "Users can view categories for their account"
ON categories
FOR SELECT
TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can create categories for their account"
ON categories
FOR INSERT
TO authenticated
WITH CHECK (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can update categories for their account"
ON categories
FOR UPDATE
TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()))
WITH CHECK (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can delete categories for their account"
ON categories
FOR DELETE
TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()));

-- ============================================================================
-- STEP 4: VERIFY POLICIES
-- ============================================================================

SELECT 
    'Policies created' as status,
    p.tablename,
    p.policyname,
    p.cmd
FROM pg_policies p
WHERE p.tablename IN ('accounts', 'account_members', 'stores', 'categories')
ORDER BY p.tablename, p.policyname;

-- ============================================================================
-- STEP 5: TEST QUERIES (Run these separately to verify)
-- ============================================================================

-- Test 1: Check if you can see your account (if you're logged in)
-- SELECT get_account_id();

-- Test 2: Check your account_members record
-- SELECT * FROM account_members WHERE user_id = auth.uid();

-- Test 3: Check your account
-- SELECT * FROM accounts WHERE account_id IN (SELECT account_id FROM account_members WHERE user_id = auth.uid());
