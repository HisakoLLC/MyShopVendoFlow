-- PRODUCTION_RLS_FINAL.sql
-- ============================================================================
-- Goal: Single, comprehensive, production-ready RLS reset using ONE standard:
--   - Tenant resolution: get_account_id() (singular) everywhere
--   - Cashier isolation: cashiers can only access their assigned_store_id for:
--       * inventory_levels
--       * sales
--       * sale_line_items
--   - Cashiers are read-only on the product catalog (styles/variants/categories/seasons/customers)
--   - Owners/Managers have full access within their account
--
-- IMPORTANT:
-- - This script DROPS and RECREATES policies for listed tables.
-- - It does NOT disable RLS.
-- - It assumes you already have correct foreign keys and that staff.role values are:
--   'owner' | 'manager' | 'cashier'
-- ============================================================================

BEGIN;

-- ============================================================================
-- 0) Table-level GRANTs (RLS restricts rows; GRANTs enable operations at all)
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.stores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_styles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_variants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.inventory_levels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sale_line_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.seasons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.customers TO authenticated;

-- Keep service_role fully privileged (operational/admin tasks)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.accounts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.stores TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_styles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_variants TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.inventory_levels TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sales TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sale_line_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.seasons TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.customers TO service_role;

-- ============================================================================
-- 1) Helper functions (SECURITY DEFINER)
-- ============================================================================

-- get_account_id(): singular tenant resolution for BOTH owners and staff.
-- Priority order:
--   1) Owner (account_members.user_id = auth.uid())
--   2) Staff (staff.auth_user_id = auth.uid() AND active)
CREATE OR REPLACE FUNCTION public.get_account_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_account_id uuid;
BEGIN
  -- Owner check
  SELECT am.account_id INTO v_account_id
  FROM public.account_members am
  WHERE am.user_id = auth.uid()
  LIMIT 1;

  IF v_account_id IS NOT NULL THEN
    RETURN v_account_id;
  END IF;

  -- Staff check
  SELECT s.account_id INTO v_account_id
  FROM public.staff s
  WHERE s.auth_user_id = auth.uid()
    AND s.active = true
  LIMIT 1;

  RETURN v_account_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_account_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_account_id() TO service_role;

-- get_staff_assigned_store_id(): cashier store isolation helper.
CREATE OR REPLACE FUNCTION public.get_staff_assigned_store_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT s.assigned_store_id
    FROM public.staff s
    WHERE s.auth_user_id = auth.uid()
      AND s.active = true
    LIMIT 1
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_staff_assigned_store_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_assigned_store_id() TO service_role;

-- ============================================================================
-- 2) Enable RLS on critical tables
-- ============================================================================
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3) Drop ALL existing policies on the target tables (safe, data-driven)
-- ============================================================================
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'accounts',
        'stores',
        'product_styles',
        'product_variants',
        'inventory_levels',
        'sales',
        'sale_line_items',
        'categories',
        'seasons',
        'customers'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ============================================================================
-- 4) Role helpers in-policy (avoid additional functions)
-- ============================================================================
-- Non-cashier definition:
--   - user is NOT an active staff row with role = 'cashier'
-- This treats owners (no staff row) as non-cashier.

-- ============================================================================
-- 5) ACCOUNTS policies
-- ============================================================================
-- Anyone in the tenant (owner/staff) can SELECT their account row.
CREATE POLICY "tenant_select_accounts"
ON public.accounts
FOR SELECT
TO authenticated
USING (public.accounts.account_id = public.get_account_id());

-- Allow INSERT during signup/onboarding flows (authenticated only).
-- (Account linking is still controlled by application logic.)
CREATE POLICY "tenant_insert_accounts"
ON public.accounts
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Only non-cashiers can UPDATE their account.
CREATE POLICY "noncashier_update_accounts"
ON public.accounts
FOR UPDATE
TO authenticated
USING (
  public.accounts.account_id = public.get_account_id()
  AND NOT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.auth_user_id = auth.uid()
      AND s.active = true
      AND s.role = 'cashier'
  )
)
WITH CHECK (
  public.accounts.account_id = public.get_account_id()
  AND NOT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.auth_user_id = auth.uid()
      AND s.active = true
      AND s.role = 'cashier'
  )
);

-- Only non-cashiers can DELETE account rows (typically not used; keep locked down).
CREATE POLICY "noncashier_delete_accounts"
ON public.accounts
FOR DELETE
TO authenticated
USING (
  public.accounts.account_id = public.get_account_id()
  AND NOT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.auth_user_id = auth.uid()
      AND s.active = true
      AND s.role = 'cashier'
  )
);

-- ============================================================================
-- 6) STORES policies
-- ============================================================================
-- Owners/managers: see all stores in account (non-cashier).
CREATE POLICY "noncashier_select_stores"
ON public.stores
FOR SELECT
TO authenticated
USING (
  public.stores.account_id = public.get_account_id()
  AND NOT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.auth_user_id = auth.uid()
      AND s.active = true
      AND s.role = 'cashier'
  )
);

-- Cashiers: can only SELECT their assigned store row.
CREATE POLICY "cashier_select_stores"
ON public.stores
FOR SELECT
TO authenticated
USING (
  public.stores.store_id = public.get_staff_assigned_store_id()
  AND public.stores.account_id = public.get_account_id()
);

-- Only non-cashiers can manage stores.
CREATE POLICY "noncashier_insert_stores"
ON public.stores
FOR INSERT
TO authenticated
WITH CHECK (
  public.stores.account_id = public.get_account_id()
  AND NOT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.auth_user_id = auth.uid()
      AND s.active = true
      AND s.role = 'cashier'
  )
);

CREATE POLICY "noncashier_update_stores"
ON public.stores
FOR UPDATE
TO authenticated
USING (
  public.stores.account_id = public.get_account_id()
  AND NOT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.auth_user_id = auth.uid()
      AND s.active = true
      AND s.role = 'cashier'
  )
)
WITH CHECK (
  public.stores.account_id = public.get_account_id()
  AND NOT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.auth_user_id = auth.uid()
      AND s.active = true
      AND s.role = 'cashier'
  )
);

CREATE POLICY "noncashier_delete_stores"
ON public.stores
FOR DELETE
TO authenticated
USING (
  public.stores.account_id = public.get_account_id()
  AND NOT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.auth_user_id = auth.uid()
      AND s.active = true
      AND s.role = 'cashier'
  )
);

-- ============================================================================
-- 7) PRODUCT CATALOG (categories, seasons, product_styles, product_variants)
-- Cashiers are read-only. Owners/managers full CRUD within account.
-- ============================================================================

-- categories
CREATE POLICY "tenant_select_categories"
ON public.categories
FOR SELECT
TO authenticated
USING (public.categories.account_id = public.get_account_id());

CREATE POLICY "noncashier_insert_categories"
ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (
  public.categories.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_update_categories"
ON public.categories
FOR UPDATE
TO authenticated
USING (
  public.categories.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
)
WITH CHECK (
  public.categories.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_delete_categories"
ON public.categories
FOR DELETE
TO authenticated
USING (
  public.categories.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

-- seasons
CREATE POLICY "tenant_select_seasons"
ON public.seasons
FOR SELECT
TO authenticated
USING (public.seasons.account_id = public.get_account_id());

CREATE POLICY "noncashier_insert_seasons"
ON public.seasons
FOR INSERT
TO authenticated
WITH CHECK (
  public.seasons.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_update_seasons"
ON public.seasons
FOR UPDATE
TO authenticated
USING (
  public.seasons.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
)
WITH CHECK (
  public.seasons.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_delete_seasons"
ON public.seasons
FOR DELETE
TO authenticated
USING (
  public.seasons.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

-- product_styles
CREATE POLICY "tenant_select_product_styles"
ON public.product_styles
FOR SELECT
TO authenticated
USING (public.product_styles.account_id = public.get_account_id());

CREATE POLICY "noncashier_insert_product_styles"
ON public.product_styles
FOR INSERT
TO authenticated
WITH CHECK (
  public.product_styles.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_update_product_styles"
ON public.product_styles
FOR UPDATE
TO authenticated
USING (
  public.product_styles.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
)
WITH CHECK (
  public.product_styles.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_delete_product_styles"
ON public.product_styles
FOR DELETE
TO authenticated
USING (
  public.product_styles.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

-- product_variants (scoped via product_styles.account_id)
CREATE POLICY "tenant_select_product_variants"
ON public.product_variants
FOR SELECT
TO authenticated
USING (
  public.product_variants.style_id IN (
    SELECT ps.style_id FROM public.product_styles ps
    WHERE ps.account_id = public.get_account_id()
  )
);

CREATE POLICY "noncashier_insert_product_variants"
ON public.product_variants
FOR INSERT
TO authenticated
WITH CHECK (
  public.product_variants.style_id IN (
    SELECT ps.style_id FROM public.product_styles ps
    WHERE ps.account_id = public.get_account_id()
  )
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_update_product_variants"
ON public.product_variants
FOR UPDATE
TO authenticated
USING (
  public.product_variants.style_id IN (
    SELECT ps.style_id FROM public.product_styles ps
    WHERE ps.account_id = public.get_account_id()
  )
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
)
WITH CHECK (
  public.product_variants.style_id IN (
    SELECT ps.style_id FROM public.product_styles ps
    WHERE ps.account_id = public.get_account_id()
  )
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_delete_product_variants"
ON public.product_variants
FOR DELETE
TO authenticated
USING (
  public.product_variants.style_id IN (
    SELECT ps.style_id FROM public.product_styles ps
    WHERE ps.account_id = public.get_account_id()
  )
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

-- ============================================================================
-- 8) CUSTOMERS (cashiers read-only; owners/managers CRUD)
-- ============================================================================
CREATE POLICY "tenant_select_customers"
ON public.customers
FOR SELECT
TO authenticated
USING (public.customers.account_id = public.get_account_id());

CREATE POLICY "noncashier_insert_customers"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (
  public.customers.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_update_customers"
ON public.customers
FOR UPDATE
TO authenticated
USING (
  public.customers.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
)
WITH CHECK (
  public.customers.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_delete_customers"
ON public.customers
FOR DELETE
TO authenticated
USING (
  public.customers.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

-- ============================================================================
-- 9) INVENTORY_LEVELS (cashiers restricted to assigned store)
-- ============================================================================
-- Non-cashiers: can operate on inventory for any store within tenant AND any variant within tenant.
CREATE POLICY "noncashier_select_inventory"
ON public.inventory_levels
FOR SELECT
TO authenticated
USING (
  public.inventory_levels.store_id IN (SELECT st.store_id FROM public.stores st WHERE st.account_id = public.get_account_id())
  AND public.inventory_levels.variant_id IN (
    SELECT pv.variant_id
    FROM public.product_variants pv
    JOIN public.product_styles ps ON ps.style_id = pv.style_id
    WHERE ps.account_id = public.get_account_id()
  )
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_insert_inventory"
ON public.inventory_levels
FOR INSERT
TO authenticated
WITH CHECK (
  public.inventory_levels.store_id IN (SELECT st.store_id FROM public.stores st WHERE st.account_id = public.get_account_id())
  AND public.inventory_levels.variant_id IN (
    SELECT pv.variant_id
    FROM public.product_variants pv
    JOIN public.product_styles ps ON ps.style_id = pv.style_id
    WHERE ps.account_id = public.get_account_id()
  )
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_update_inventory"
ON public.inventory_levels
FOR UPDATE
TO authenticated
USING (
  public.inventory_levels.store_id IN (SELECT st.store_id FROM public.stores st WHERE st.account_id = public.get_account_id())
  AND public.inventory_levels.variant_id IN (
    SELECT pv.variant_id
    FROM public.product_variants pv
    JOIN public.product_styles ps ON ps.style_id = pv.style_id
    WHERE ps.account_id = public.get_account_id()
  )
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
)
WITH CHECK (
  public.inventory_levels.store_id IN (SELECT st.store_id FROM public.stores st WHERE st.account_id = public.get_account_id())
  AND public.inventory_levels.variant_id IN (
    SELECT pv.variant_id
    FROM public.product_variants pv
    JOIN public.product_styles ps ON ps.style_id = pv.style_id
    WHERE ps.account_id = public.get_account_id()
  )
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_delete_inventory"
ON public.inventory_levels
FOR DELETE
TO authenticated
USING (
  public.inventory_levels.store_id IN (SELECT st.store_id FROM public.stores st WHERE st.account_id = public.get_account_id())
  AND public.inventory_levels.variant_id IN (
    SELECT pv.variant_id
    FROM public.product_variants pv
    JOIN public.product_styles ps ON ps.style_id = pv.style_id
    WHERE ps.account_id = public.get_account_id()
  )
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

-- Cashiers: only their assigned store, and only variants within the tenant.
CREATE POLICY "cashier_select_inventory"
ON public.inventory_levels
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.staff s
    WHERE s.auth_user_id = auth.uid()
      AND s.active = true
      AND s.role = 'cashier'
      AND s.assigned_store_id = public.inventory_levels.store_id
  )
  AND public.inventory_levels.variant_id IN (
    SELECT pv.variant_id
    FROM public.product_variants pv
    JOIN public.product_styles ps ON ps.style_id = pv.style_id
    WHERE ps.account_id = public.get_account_id()
  )
);

CREATE POLICY "cashier_insert_inventory"
ON public.inventory_levels
FOR INSERT
TO authenticated
WITH CHECK (
  public.inventory_levels.store_id = public.get_staff_assigned_store_id()
  AND EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
  AND public.inventory_levels.variant_id IN (
    SELECT pv.variant_id
    FROM public.product_variants pv
    JOIN public.product_styles ps ON ps.style_id = pv.style_id
    WHERE ps.account_id = public.get_account_id()
  )
);

CREATE POLICY "cashier_update_inventory"
ON public.inventory_levels
FOR UPDATE
TO authenticated
USING (
  public.inventory_levels.store_id = public.get_staff_assigned_store_id()
  AND EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
  AND public.inventory_levels.variant_id IN (
    SELECT pv.variant_id
    FROM public.product_variants pv
    JOIN public.product_styles ps ON ps.style_id = pv.style_id
    WHERE ps.account_id = public.get_account_id()
  )
)
WITH CHECK (
  public.inventory_levels.store_id = public.get_staff_assigned_store_id()
  AND EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
  AND public.inventory_levels.variant_id IN (
    SELECT pv.variant_id
    FROM public.product_variants pv
    JOIN public.product_styles ps ON ps.style_id = pv.style_id
    WHERE ps.account_id = public.get_account_id()
  )
);

CREATE POLICY "cashier_delete_inventory"
ON public.inventory_levels
FOR DELETE
TO authenticated
USING (
  public.inventory_levels.store_id = public.get_staff_assigned_store_id()
  AND EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

-- ============================================================================
-- 10) SALES (cashiers restricted to assigned store)
-- ============================================================================
CREATE POLICY "noncashier_select_sales"
ON public.sales
FOR SELECT
TO authenticated
USING (
  public.sales.store_id IN (SELECT st.store_id FROM public.stores st WHERE st.account_id = public.get_account_id())
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_insert_sales"
ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (
  public.sales.store_id IN (SELECT st.store_id FROM public.stores st WHERE st.account_id = public.get_account_id())
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_update_sales"
ON public.sales
FOR UPDATE
TO authenticated
USING (
  public.sales.store_id IN (SELECT st.store_id FROM public.stores st WHERE st.account_id = public.get_account_id())
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
)
WITH CHECK (
  public.sales.store_id IN (SELECT st.store_id FROM public.stores st WHERE st.account_id = public.get_account_id())
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_delete_sales"
ON public.sales
FOR DELETE
TO authenticated
USING (
  public.sales.store_id IN (SELECT st.store_id FROM public.stores st WHERE st.account_id = public.get_account_id())
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "cashier_select_sales"
ON public.sales
FOR SELECT
TO authenticated
USING (
  public.sales.store_id = public.get_staff_assigned_store_id()
  AND EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "cashier_insert_sales"
ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (
  public.sales.store_id = public.get_staff_assigned_store_id()
  AND EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "cashier_update_sales"
ON public.sales
FOR UPDATE
TO authenticated
USING (
  public.sales.store_id = public.get_staff_assigned_store_id()
  AND EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
)
WITH CHECK (
  public.sales.store_id = public.get_staff_assigned_store_id()
  AND EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "cashier_delete_sales"
ON public.sales
FOR DELETE
TO authenticated
USING (
  public.sales.store_id = public.get_staff_assigned_store_id()
  AND EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

-- ============================================================================
-- 11) SALE_LINE_ITEMS (inherits tenant/store via parent sale_id)
-- ============================================================================
CREATE POLICY "noncashier_select_sale_line_items"
ON public.sale_line_items
FOR SELECT
TO authenticated
USING (
  public.sale_line_items.sale_id IN (
    SELECT s.sale_id
    FROM public.sales s
    JOIN public.stores st ON st.store_id = s.store_id
    WHERE st.account_id = public.get_account_id()
  )
  AND NOT EXISTS (SELECT 1 FROM public.staff sf WHERE sf.auth_user_id = auth.uid() AND sf.active = true AND sf.role = 'cashier')
);

CREATE POLICY "noncashier_insert_sale_line_items"
ON public.sale_line_items
FOR INSERT
TO authenticated
WITH CHECK (
  public.sale_line_items.sale_id IN (
    SELECT s.sale_id
    FROM public.sales s
    JOIN public.stores st ON st.store_id = s.store_id
    WHERE st.account_id = public.get_account_id()
  )
  AND NOT EXISTS (SELECT 1 FROM public.staff sf WHERE sf.auth_user_id = auth.uid() AND sf.active = true AND sf.role = 'cashier')
);

CREATE POLICY "noncashier_update_sale_line_items"
ON public.sale_line_items
FOR UPDATE
TO authenticated
USING (
  public.sale_line_items.sale_id IN (
    SELECT s.sale_id
    FROM public.sales s
    JOIN public.stores st ON st.store_id = s.store_id
    WHERE st.account_id = public.get_account_id()
  )
  AND NOT EXISTS (SELECT 1 FROM public.staff sf WHERE sf.auth_user_id = auth.uid() AND sf.active = true AND sf.role = 'cashier')
)
WITH CHECK (
  public.sale_line_items.sale_id IN (
    SELECT s.sale_id
    FROM public.sales s
    JOIN public.stores st ON st.store_id = s.store_id
    WHERE st.account_id = public.get_account_id()
  )
  AND NOT EXISTS (SELECT 1 FROM public.staff sf WHERE sf.auth_user_id = auth.uid() AND sf.active = true AND sf.role = 'cashier')
);

CREATE POLICY "noncashier_delete_sale_line_items"
ON public.sale_line_items
FOR DELETE
TO authenticated
USING (
  public.sale_line_items.sale_id IN (
    SELECT s.sale_id
    FROM public.sales s
    JOIN public.stores st ON st.store_id = s.store_id
    WHERE st.account_id = public.get_account_id()
  )
  AND NOT EXISTS (SELECT 1 FROM public.staff sf WHERE sf.auth_user_id = auth.uid() AND sf.active = true AND sf.role = 'cashier')
);

CREATE POLICY "cashier_select_sale_line_items"
ON public.sale_line_items
FOR SELECT
TO authenticated
USING (
  public.sale_line_items.sale_id IN (
    SELECT s.sale_id
    FROM public.sales s
    WHERE s.store_id = public.get_staff_assigned_store_id()
  )
  AND EXISTS (SELECT 1 FROM public.staff sf WHERE sf.auth_user_id = auth.uid() AND sf.active = true AND sf.role = 'cashier')
);

CREATE POLICY "cashier_insert_sale_line_items"
ON public.sale_line_items
FOR INSERT
TO authenticated
WITH CHECK (
  public.sale_line_items.sale_id IN (
    SELECT s.sale_id
    FROM public.sales s
    WHERE s.store_id = public.get_staff_assigned_store_id()
  )
  AND EXISTS (SELECT 1 FROM public.staff sf WHERE sf.auth_user_id = auth.uid() AND sf.active = true AND sf.role = 'cashier')
);

CREATE POLICY "cashier_update_sale_line_items"
ON public.sale_line_items
FOR UPDATE
TO authenticated
USING (
  public.sale_line_items.sale_id IN (
    SELECT s.sale_id
    FROM public.sales s
    WHERE s.store_id = public.get_staff_assigned_store_id()
  )
  AND EXISTS (SELECT 1 FROM public.staff sf WHERE sf.auth_user_id = auth.uid() AND sf.active = true AND sf.role = 'cashier')
)
WITH CHECK (
  public.sale_line_items.sale_id IN (
    SELECT s.sale_id
    FROM public.sales s
    WHERE s.store_id = public.get_staff_assigned_store_id()
  )
  AND EXISTS (SELECT 1 FROM public.staff sf WHERE sf.auth_user_id = auth.uid() AND sf.active = true AND sf.role = 'cashier')
);

CREATE POLICY "cashier_delete_sale_line_items"
ON public.sale_line_items
FOR DELETE
TO authenticated
USING (
  public.sale_line_items.sale_id IN (
    SELECT s.sale_id
    FROM public.sales s
    WHERE s.store_id = public.get_staff_assigned_store_id()
  )
  AND EXISTS (SELECT 1 FROM public.staff sf WHERE sf.auth_user_id = auth.uid() AND sf.active = true AND sf.role = 'cashier')
);

-- ============================================================================
-- 12) Verification
-- ============================================================================
-- Show all policies (public schema)
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

COMMIT;

