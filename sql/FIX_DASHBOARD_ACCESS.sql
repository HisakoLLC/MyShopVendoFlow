-- FIX: Dashboard "Something went wrong" after onboarding
-- Run this in Supabase SQL Editor. Adds GRANTs + RLS for sales, sale_line_items,
-- daily_sales_metrics, variant_metrics so the dashboard can load.

-- ============================================================================
-- 0. TABLE-LEVEL GRANTS (required for authenticated role)
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sales TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sale_line_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sale_line_items TO service_role;

-- Optional: grant on views/materialized views if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_sales_metrics') THEN
    EXECUTE 'GRANT SELECT ON TABLE public.daily_sales_metrics TO authenticated';
    EXECUTE 'GRANT SELECT ON TABLE public.daily_sales_metrics TO service_role';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'variant_metrics') THEN
    EXECUTE 'GRANT SELECT ON TABLE public.variant_metrics TO authenticated';
    EXECUTE 'GRANT SELECT ON TABLE public.variant_metrics TO service_role';
  END IF;
END $$;

-- ============================================================================
-- 1. Ensure helper function exists
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
-- 2. SALES TABLE
-- ============================================================================
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view sales for their account" ON sales;
DROP POLICY IF EXISTS "Users can create sales for their account" ON sales;
DROP POLICY IF EXISTS "Users can update sales for their account" ON sales;
DROP POLICY IF EXISTS "Users can delete sales for their account" ON sales;

CREATE POLICY "Users can view sales for their account"
ON sales FOR SELECT TO authenticated
USING (store_id IN (SELECT store_id FROM stores WHERE account_id IN (SELECT account_id FROM get_user_account_ids())));

CREATE POLICY "Users can create sales for their account"
ON sales FOR INSERT TO authenticated
WITH CHECK (store_id IN (SELECT store_id FROM stores WHERE account_id IN (SELECT account_id FROM get_user_account_ids())));

CREATE POLICY "Users can update sales for their account"
ON sales FOR UPDATE TO authenticated
USING (store_id IN (SELECT store_id FROM stores WHERE account_id IN (SELECT account_id FROM get_user_account_ids())))
WITH CHECK (store_id IN (SELECT store_id FROM stores WHERE account_id IN (SELECT account_id FROM get_user_account_ids())));

CREATE POLICY "Users can delete sales for their account"
ON sales FOR DELETE TO authenticated
USING (store_id IN (SELECT store_id FROM stores WHERE account_id IN (SELECT account_id FROM get_user_account_ids())));

-- ============================================================================
-- 3. SALE_LINE_ITEMS TABLE
-- ============================================================================
ALTER TABLE sale_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view sale line items for their account" ON sale_line_items;
DROP POLICY IF EXISTS "Users can create sale line items for their account" ON sale_line_items;
DROP POLICY IF EXISTS "Users can update sale line items for their account" ON sale_line_items;
DROP POLICY IF EXISTS "Users can delete sale line items for their account" ON sale_line_items;

CREATE POLICY "Users can view sale line items for their account"
ON sale_line_items FOR SELECT TO authenticated
USING (sale_id IN (SELECT sale_id FROM sales WHERE store_id IN (SELECT store_id FROM stores WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))));

CREATE POLICY "Users can create sale line items for their account"
ON sale_line_items FOR INSERT TO authenticated
WITH CHECK (sale_id IN (SELECT sale_id FROM sales WHERE store_id IN (SELECT store_id FROM stores WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))));

CREATE POLICY "Users can update sale line items for their account"
ON sale_line_items FOR UPDATE TO authenticated
USING (sale_id IN (SELECT sale_id FROM sales WHERE store_id IN (SELECT store_id FROM stores WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))))
WITH CHECK (sale_id IN (SELECT sale_id FROM sales WHERE store_id IN (SELECT store_id FROM stores WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))));

CREATE POLICY "Users can delete sale line items for their account"
ON sale_line_items FOR DELETE TO authenticated
USING (sale_id IN (SELECT sale_id FROM sales WHERE store_id IN (SELECT store_id FROM stores WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))));

-- ============================================================================
-- 4. DAILY_SALES_METRICS (if exists)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_sales_metrics') THEN
    ALTER TABLE daily_sales_metrics ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view daily metrics for their account" ON daily_sales_metrics;
    CREATE POLICY "Users can view daily metrics for their account"
    ON daily_sales_metrics FOR SELECT TO authenticated
    USING (store_id IN (SELECT store_id FROM stores WHERE account_id IN (SELECT account_id FROM get_user_account_ids())));
  END IF;
END $$;

-- ============================================================================
-- 5. VARIANT_METRICS (if exists)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'variant_metrics') THEN
    ALTER TABLE variant_metrics ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view variant metrics for their account" ON variant_metrics;
    CREATE POLICY "Users can view variant metrics for their account"
    ON variant_metrics FOR SELECT TO authenticated
    USING (variant_id IN (
      SELECT variant_id FROM product_variants
      WHERE style_id IN (SELECT style_id FROM product_styles WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))
    ));
  END IF;
END $$;
