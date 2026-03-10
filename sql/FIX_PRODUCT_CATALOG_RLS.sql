-- FIX_PRODUCT_CATALOG_RLS.sql
-- ============================================================================
-- Goal: Ensure cashiers and other staff can SELECT product catalog
--       (product_styles + product_variants) for their own account,
--       even if get_account_id() is not resolving correctly for them.
--
-- Approach:
-- - Replace SELECT policies on product_styles and product_variants to
--   derive tenant access directly from account_members and staff
--   (no dependence on public.get_account_id()).
-- - Keep non-cashier INSERT/UPDATE/DELETE restrictions as before.
--
-- Run this AFTER PRODUCTION_RLS_FINAL.sql.
-- ============================================================================

BEGIN;

-- Drop existing catalog SELECT policies
DROP POLICY IF EXISTS "tenant_select_product_styles" ON public.product_styles;
DROP POLICY IF EXISTS "tenant_select_product_variants" ON public.product_variants;

-- Helper predicate (inlined in policies):
-- A row belongs to current user's tenant if:
--   - user is an owner/member in account_members for that account, OR
--   - user is an active staff member in staff for that account.

-- ============================================================================
-- product_styles SELECT
-- ============================================================================
CREATE POLICY "tenant_select_product_styles"
ON public.product_styles
FOR SELECT
TO authenticated
USING (
  public.product_styles.account_id IN (
    SELECT am.account_id
    FROM public.account_members am
    WHERE am.user_id = auth.uid()
  )
  OR public.product_styles.account_id IN (
    SELECT s.account_id
    FROM public.staff s
    WHERE s.auth_user_id = auth.uid()
      AND s.active = true
  )
);

-- ============================================================================
-- product_variants SELECT (scoped via parent product_styles.account_id)
-- ============================================================================
CREATE POLICY "tenant_select_product_variants"
ON public.product_variants
FOR SELECT
TO authenticated
USING (
  public.product_variants.style_id IN (
    SELECT ps.style_id
    FROM public.product_styles ps
    WHERE ps.account_id IN (
      SELECT am.account_id
      FROM public.account_members am
      WHERE am.user_id = auth.uid()
    )
    OR ps.account_id IN (
      SELECT s.account_id
      FROM public.staff s
      WHERE s.auth_user_id = auth.uid()
        AND s.active = true
    )
  )
);

COMMIT;

SELECT '✅ Updated product catalog SELECT RLS to use account_members/staff directly' AS status;

