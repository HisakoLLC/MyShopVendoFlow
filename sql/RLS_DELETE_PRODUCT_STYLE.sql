-- RLS for permanent product/style delete (Products and Inventory pages).
-- Run in Supabase SQL Editor. Ensures authenticated users can DELETE rows when
-- deleteProductStyle() runs: inventory_levels, inventory_transfers, variant_metrics,
-- product_variants, product_styles.
--
-- product_styles and product_variants: DELETE policies already exist in FIX_PRODUCTS_PAGE_ACCESS.sql.
-- inventory_levels: DELETE policy already exists in FIX_INVENTORY_AND_SETTINGS_ACCESS.sql.
-- This script adds DELETE grant + policy for inventory_transfers and variant_metrics.
--
-- Requires get_user_account_ids() to exist (run FIX_STORES_RLS_FOR_STAFF.sql for staff PIN support).

-- ============================================================================
-- 1. INVENTORY_TRANSFERS – GRANT + RLS DELETE
-- ============================================================================
GRANT DELETE ON TABLE public.inventory_transfers TO authenticated;
GRANT DELETE ON TABLE public.inventory_transfers TO service_role;

ALTER TABLE public.inventory_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can delete inventory transfers for their account" ON public.inventory_transfers;
CREATE POLICY "Users can delete inventory transfers for their account"
ON public.inventory_transfers FOR DELETE TO authenticated
USING (
  from_store_id IN (SELECT store_id FROM public.stores WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))
  AND to_store_id IN (SELECT store_id FROM public.stores WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))
);

-- ============================================================================
-- 2. VARIANT_METRICS – GRANT DELETE + RLS DELETE (if table exists)
-- ============================================================================
DO $block$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'variant_metrics') THEN
    EXECUTE 'GRANT DELETE ON TABLE public.variant_metrics TO authenticated';
    EXECUTE 'GRANT DELETE ON TABLE public.variant_metrics TO service_role';
    EXECUTE 'ALTER TABLE public.variant_metrics ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete variant metrics for their account" ON public.variant_metrics';
    EXECUTE 'CREATE POLICY "Users can delete variant metrics for their account" '
      'ON public.variant_metrics FOR DELETE TO authenticated '
      'USING (variant_id IN (SELECT pv.variant_id FROM public.product_variants pv '
      'JOIN public.product_styles ps ON ps.style_id = pv.style_id '
      'WHERE ps.account_id IN (SELECT account_id FROM get_user_account_ids())))';
  END IF;
END $block$;
