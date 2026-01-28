-- FIX: "permission denied for table inventory_levels" (Inventory, Purchasing/Restock)
--       and Settings page / business_settings access.
-- Run this in Supabase SQL Editor after FIX_ALL_RLS_ISSUES.sql and FIX_PRODUCTS_PAGE_ACCESS.sql.

-- ============================================================================
-- 0. TABLE-LEVEL GRANTS
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.inventory_levels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.inventory_levels TO service_role;

-- business_settings (for /settings page)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.business_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.business_settings TO service_role;

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
-- 2. INVENTORY_LEVELS – RLS (user can only see/edit inventory for their stores & variants)
-- ============================================================================
ALTER TABLE inventory_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view inventory for their account" ON inventory_levels;
DROP POLICY IF EXISTS "Users can create inventory for their account" ON inventory_levels;
DROP POLICY IF EXISTS "Users can update inventory for their account" ON inventory_levels;
DROP POLICY IF EXISTS "Users can delete inventory for their account" ON inventory_levels;

CREATE POLICY "Users can view inventory for their account"
ON inventory_levels FOR SELECT TO authenticated
USING (
  store_id IN (SELECT store_id FROM stores WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))
  AND variant_id IN (
    SELECT variant_id FROM product_variants
    WHERE style_id IN (SELECT style_id FROM product_styles WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))
  )
);

CREATE POLICY "Users can create inventory for their account"
ON inventory_levels FOR INSERT TO authenticated
WITH CHECK (
  store_id IN (SELECT store_id FROM stores WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))
  AND variant_id IN (
    SELECT variant_id FROM product_variants
    WHERE style_id IN (SELECT style_id FROM product_styles WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))
  )
);

CREATE POLICY "Users can update inventory for their account"
ON inventory_levels FOR UPDATE TO authenticated
USING (
  store_id IN (SELECT store_id FROM stores WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))
  AND variant_id IN (
    SELECT variant_id FROM product_variants
    WHERE style_id IN (SELECT style_id FROM product_styles WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))
  )
)
WITH CHECK (
  store_id IN (SELECT store_id FROM stores WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))
  AND variant_id IN (
    SELECT variant_id FROM product_variants
    WHERE style_id IN (SELECT style_id FROM product_styles WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))
  )
);

CREATE POLICY "Users can delete inventory for their account"
ON inventory_levels FOR DELETE TO authenticated
USING (
  store_id IN (SELECT store_id FROM stores WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))
  AND variant_id IN (
    SELECT variant_id FROM product_variants
    WHERE style_id IN (SELECT style_id FROM product_styles WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))
  )
);

-- ============================================================================
-- 3. BUSINESS_SETTINGS – RLS (one row per account)
-- ============================================================================
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view business settings for their account" ON business_settings;
DROP POLICY IF EXISTS "Users can create business settings for their account" ON business_settings;
DROP POLICY IF EXISTS "Users can update business settings for their account" ON business_settings;
DROP POLICY IF EXISTS "Users can delete business settings for their account" ON business_settings;

CREATE POLICY "Users can view business settings for their account"
ON business_settings FOR SELECT TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can create business settings for their account"
ON business_settings FOR INSERT TO authenticated
WITH CHECK (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can update business settings for their account"
ON business_settings FOR UPDATE TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()))
WITH CHECK (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can delete business settings for their account"
ON business_settings FOR DELETE TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()));
