-- PRODUCTION_RLS_FINAL_V2.sql
-- ============================================================================
-- Extends PRODUCTION_RLS_FINAL.sql to also reset remaining tables observed in
-- pg_policies output (business_settings, staff, suppliers, purchasing, refunds,
-- inventory_transfers, metrics tables, and audit/pin tables if present).
--
-- Standard:
--   - Tenant resolution: get_account_id() only
--   - Cashier isolation:
--       * inventory_levels / sales / sale_line_items already handled in FINAL.sql
--       * refunds: cashiers limited to assigned store sales
--       * inventory_transfers: cashiers blocked (read-only or none)
--       * suppliers/purchasing: cashiers blocked
--       * staff management: cashiers blocked
--   - Owners/managers: full access within tenant
--
-- NOTE:
-- - This script does NOT redefine get_account_id() / get_staff_assigned_store_id().
--   Run PRODUCTION_RLS_FINAL.sql first (or ensure functions already exist).
-- - This script drops existing policies on the additional tables and recreates.
-- - Metrics tables (daily_sales_metrics, variant_metrics) may be tables/views; policies
--   are applied only if the relation exists.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 0) GRANTs for additional tables
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.business_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.staff TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.suppliers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.purchase_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.po_line_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.inventory_receipts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.refunds TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.inventory_transfers TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.business_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.staff TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.suppliers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.purchase_orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.po_line_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.inventory_receipts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.refunds TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.inventory_transfers TO service_role;

-- audit_logs and pin_login_attempts are typically system-controlled; keep minimal grants.
GRANT SELECT ON TABLE public.audit_logs TO authenticated;
GRANT INSERT ON TABLE public.audit_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pin_login_attempts TO service_role;

-- ============================================================================
-- 1) Enable RLS on additional tables
-- ============================================================================
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transfers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2) Drop ALL existing policies on these additional tables
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
        'business_settings',
        'staff',
        'suppliers',
        'purchase_orders',
        'po_line_items',
        'inventory_receipts',
        'refunds',
        'inventory_transfers',
        'audit_logs',
        'pin_login_attempts'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ============================================================================
-- 3) BUSINESS_SETTINGS (cashiers read-only; owners/managers CRUD)
-- ============================================================================
CREATE POLICY "tenant_select_business_settings"
ON public.business_settings
FOR SELECT
TO authenticated
USING (public.business_settings.account_id = public.get_account_id());

CREATE POLICY "noncashier_insert_business_settings"
ON public.business_settings
FOR INSERT
TO authenticated
WITH CHECK (
  public.business_settings.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_update_business_settings"
ON public.business_settings
FOR UPDATE
TO authenticated
USING (
  public.business_settings.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
)
WITH CHECK (
  public.business_settings.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_delete_business_settings"
ON public.business_settings
FOR DELETE
TO authenticated
USING (
  public.business_settings.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

-- ============================================================================
-- 4) STAFF (cashiers cannot manage staff)
-- ============================================================================
CREATE POLICY "noncashier_select_staff"
ON public.staff
FOR SELECT
TO authenticated
USING (
  public.staff.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s2 WHERE s2.auth_user_id = auth.uid() AND s2.active = true AND s2.role = 'cashier')
);

CREATE POLICY "noncashier_insert_staff"
ON public.staff
FOR INSERT
TO authenticated
WITH CHECK (
  public.staff.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s2 WHERE s2.auth_user_id = auth.uid() AND s2.active = true AND s2.role = 'cashier')
);

CREATE POLICY "noncashier_update_staff"
ON public.staff
FOR UPDATE
TO authenticated
USING (
  public.staff.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s2 WHERE s2.auth_user_id = auth.uid() AND s2.active = true AND s2.role = 'cashier')
)
WITH CHECK (
  public.staff.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s2 WHERE s2.auth_user_id = auth.uid() AND s2.active = true AND s2.role = 'cashier')
);

CREATE POLICY "noncashier_delete_staff"
ON public.staff
FOR DELETE
TO authenticated
USING (
  public.staff.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s2 WHERE s2.auth_user_id = auth.uid() AND s2.active = true AND s2.role = 'cashier')
);

-- ============================================================================
-- 5) SUPPLIERS (cashiers read-only or none; here: read-only)
-- ============================================================================
CREATE POLICY "tenant_select_suppliers"
ON public.suppliers
FOR SELECT
TO authenticated
USING (public.suppliers.account_id = public.get_account_id());

CREATE POLICY "noncashier_insert_suppliers"
ON public.suppliers
FOR INSERT
TO authenticated
WITH CHECK (
  public.suppliers.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_update_suppliers"
ON public.suppliers
FOR UPDATE
TO authenticated
USING (
  public.suppliers.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
)
WITH CHECK (
  public.suppliers.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_delete_suppliers"
ON public.suppliers
FOR DELETE
TO authenticated
USING (
  public.suppliers.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

-- ============================================================================
-- 6) PURCHASING (cashiers blocked)
-- ============================================================================
-- purchase_orders are account-scoped directly
CREATE POLICY "noncashier_select_purchase_orders"
ON public.purchase_orders
FOR SELECT
TO authenticated
USING (
  public.purchase_orders.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_insert_purchase_orders"
ON public.purchase_orders
FOR INSERT
TO authenticated
WITH CHECK (
  public.purchase_orders.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_update_purchase_orders"
ON public.purchase_orders
FOR UPDATE
TO authenticated
USING (
  public.purchase_orders.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
)
WITH CHECK (
  public.purchase_orders.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_delete_purchase_orders"
ON public.purchase_orders
FOR DELETE
TO authenticated
USING (
  public.purchase_orders.account_id = public.get_account_id()
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

-- po_line_items scoped via parent purchase_orders.account_id
CREATE POLICY "noncashier_select_po_line_items"
ON public.po_line_items
FOR SELECT
TO authenticated
USING (
  public.po_line_items.po_id IN (
    SELECT po.po_id FROM public.purchase_orders po
    WHERE po.account_id = public.get_account_id()
  )
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_insert_po_line_items"
ON public.po_line_items
FOR INSERT
TO authenticated
WITH CHECK (
  public.po_line_items.po_id IN (
    SELECT po.po_id FROM public.purchase_orders po
    WHERE po.account_id = public.get_account_id()
  )
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_update_po_line_items"
ON public.po_line_items
FOR UPDATE
TO authenticated
USING (
  public.po_line_items.po_id IN (
    SELECT po.po_id FROM public.purchase_orders po
    WHERE po.account_id = public.get_account_id()
  )
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
)
WITH CHECK (
  public.po_line_items.po_id IN (
    SELECT po.po_id FROM public.purchase_orders po
    WHERE po.account_id = public.get_account_id()
  )
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_delete_po_line_items"
ON public.po_line_items
FOR DELETE
TO authenticated
USING (
  public.po_line_items.po_id IN (
    SELECT po.po_id FROM public.purchase_orders po
    WHERE po.account_id = public.get_account_id()
  )
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

-- inventory_receipts scoped via parent PO account_id
CREATE POLICY "noncashier_select_inventory_receipts"
ON public.inventory_receipts
FOR SELECT
TO authenticated
USING (
  public.inventory_receipts.po_id IN (
    SELECT po.po_id FROM public.purchase_orders po
    WHERE po.account_id = public.get_account_id()
  )
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_insert_inventory_receipts"
ON public.inventory_receipts
FOR INSERT
TO authenticated
WITH CHECK (
  public.inventory_receipts.po_id IN (
    SELECT po.po_id FROM public.purchase_orders po
    WHERE po.account_id = public.get_account_id()
  )
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_update_inventory_receipts"
ON public.inventory_receipts
FOR UPDATE
TO authenticated
USING (
  public.inventory_receipts.po_id IN (
    SELECT po.po_id FROM public.purchase_orders po
    WHERE po.account_id = public.get_account_id()
  )
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
)
WITH CHECK (
  public.inventory_receipts.po_id IN (
    SELECT po.po_id FROM public.purchase_orders po
    WHERE po.account_id = public.get_account_id()
  )
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_delete_inventory_receipts"
ON public.inventory_receipts
FOR DELETE
TO authenticated
USING (
  public.inventory_receipts.po_id IN (
    SELECT po.po_id FROM public.purchase_orders po
    WHERE po.account_id = public.get_account_id()
  )
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

-- ============================================================================
-- 7) INVENTORY_TRANSFERS (cashiers blocked)
-- ============================================================================
CREATE POLICY "noncashier_select_inventory_transfers"
ON public.inventory_transfers
FOR SELECT
TO authenticated
USING (
  public.inventory_transfers.from_store_id IN (SELECT st.store_id FROM public.stores st WHERE st.account_id = public.get_account_id())
  AND public.inventory_transfers.to_store_id IN (SELECT st.store_id FROM public.stores st WHERE st.account_id = public.get_account_id())
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_insert_inventory_transfers"
ON public.inventory_transfers
FOR INSERT
TO authenticated
WITH CHECK (
  public.inventory_transfers.from_store_id IN (SELECT st.store_id FROM public.stores st WHERE st.account_id = public.get_account_id())
  AND public.inventory_transfers.to_store_id IN (SELECT st.store_id FROM public.stores st WHERE st.account_id = public.get_account_id())
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_update_inventory_transfers"
ON public.inventory_transfers
FOR UPDATE
TO authenticated
USING (
  public.inventory_transfers.from_store_id IN (SELECT st.store_id FROM public.stores st WHERE st.account_id = public.get_account_id())
  AND public.inventory_transfers.to_store_id IN (SELECT st.store_id FROM public.stores st WHERE st.account_id = public.get_account_id())
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
)
WITH CHECK (
  public.inventory_transfers.from_store_id IN (SELECT st.store_id FROM public.stores st WHERE st.account_id = public.get_account_id())
  AND public.inventory_transfers.to_store_id IN (SELECT st.store_id FROM public.stores st WHERE st.account_id = public.get_account_id())
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

CREATE POLICY "noncashier_delete_inventory_transfers"
ON public.inventory_transfers
FOR DELETE
TO authenticated
USING (
  public.inventory_transfers.from_store_id IN (SELECT st.store_id FROM public.stores st WHERE st.account_id = public.get_account_id())
  AND public.inventory_transfers.to_store_id IN (SELECT st.store_id FROM public.stores st WHERE st.account_id = public.get_account_id())
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
);

-- ============================================================================
-- 8) REFUNDS (cashiers restricted to assigned store sales)
-- ============================================================================
CREATE POLICY "noncashier_select_refunds"
ON public.refunds
FOR SELECT
TO authenticated
USING (
  public.refunds.sale_id IN (
    SELECT s.sale_id
    FROM public.sales s
    JOIN public.stores st ON st.store_id = s.store_id
    WHERE st.account_id = public.get_account_id()
  )
  AND NOT EXISTS (SELECT 1 FROM public.staff sf WHERE sf.auth_user_id = auth.uid() AND sf.active = true AND sf.role = 'cashier')
);

CREATE POLICY "noncashier_insert_refunds"
ON public.refunds
FOR INSERT
TO authenticated
WITH CHECK (
  public.refunds.sale_id IN (
    SELECT s.sale_id
    FROM public.sales s
    JOIN public.stores st ON st.store_id = s.store_id
    WHERE st.account_id = public.get_account_id()
  )
  AND NOT EXISTS (SELECT 1 FROM public.staff sf WHERE sf.auth_user_id = auth.uid() AND sf.active = true AND sf.role = 'cashier')
);

CREATE POLICY "noncashier_update_refunds"
ON public.refunds
FOR UPDATE
TO authenticated
USING (
  public.refunds.sale_id IN (
    SELECT s.sale_id
    FROM public.sales s
    JOIN public.stores st ON st.store_id = s.store_id
    WHERE st.account_id = public.get_account_id()
  )
  AND NOT EXISTS (SELECT 1 FROM public.staff sf WHERE sf.auth_user_id = auth.uid() AND sf.active = true AND sf.role = 'cashier')
)
WITH CHECK (
  public.refunds.sale_id IN (
    SELECT s.sale_id
    FROM public.sales s
    JOIN public.stores st ON st.store_id = s.store_id
    WHERE st.account_id = public.get_account_id()
  )
  AND NOT EXISTS (SELECT 1 FROM public.staff sf WHERE sf.auth_user_id = auth.uid() AND sf.active = true AND sf.role = 'cashier')
);

CREATE POLICY "noncashier_delete_refunds"
ON public.refunds
FOR DELETE
TO authenticated
USING (
  public.refunds.sale_id IN (
    SELECT s.sale_id
    FROM public.sales s
    JOIN public.stores st ON st.store_id = s.store_id
    WHERE st.account_id = public.get_account_id()
  )
  AND NOT EXISTS (SELECT 1 FROM public.staff sf WHERE sf.auth_user_id = auth.uid() AND sf.active = true AND sf.role = 'cashier')
);

CREATE POLICY "cashier_select_refunds"
ON public.refunds
FOR SELECT
TO authenticated
USING (
  public.refunds.sale_id IN (
    SELECT s.sale_id
    FROM public.sales s
    WHERE s.store_id = public.get_staff_assigned_store_id()
  )
  AND EXISTS (SELECT 1 FROM public.staff sf WHERE sf.auth_user_id = auth.uid() AND sf.active = true AND sf.role = 'cashier')
);

CREATE POLICY "cashier_insert_refunds"
ON public.refunds
FOR INSERT
TO authenticated
WITH CHECK (
  public.refunds.sale_id IN (
    SELECT s.sale_id
    FROM public.sales s
    WHERE s.store_id = public.get_staff_assigned_store_id()
  )
  AND EXISTS (SELECT 1 FROM public.staff sf WHERE sf.auth_user_id = auth.uid() AND sf.active = true AND sf.role = 'cashier')
);

CREATE POLICY "cashier_update_refunds"
ON public.refunds
FOR UPDATE
TO authenticated
USING (
  public.refunds.sale_id IN (
    SELECT s.sale_id
    FROM public.sales s
    WHERE s.store_id = public.get_staff_assigned_store_id()
  )
  AND EXISTS (SELECT 1 FROM public.staff sf WHERE sf.auth_user_id = auth.uid() AND sf.active = true AND sf.role = 'cashier')
)
WITH CHECK (
  public.refunds.sale_id IN (
    SELECT s.sale_id
    FROM public.sales s
    WHERE s.store_id = public.get_staff_assigned_store_id()
  )
  AND EXISTS (SELECT 1 FROM public.staff sf WHERE sf.auth_user_id = auth.uid() AND sf.active = true AND sf.role = 'cashier')
);

CREATE POLICY "cashier_delete_refunds"
ON public.refunds
FOR DELETE
TO authenticated
USING (
  public.refunds.sale_id IN (
    SELECT s.sale_id
    FROM public.sales s
    WHERE s.store_id = public.get_staff_assigned_store_id()
  )
  AND EXISTS (SELECT 1 FROM public.staff sf WHERE sf.auth_user_id = auth.uid() AND sf.active = true AND sf.role = 'cashier')
);

-- ============================================================================
-- 9) AUDIT_LOGS (system insert; tenant select)
-- ============================================================================
-- Insert should be performed by server-side code / service_role.
CREATE POLICY "system_insert_audit_logs"
ON public.audit_logs
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "tenant_select_audit_logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.audit_logs.account_id = public.get_account_id());

-- ============================================================================
-- 10) PIN_LOGIN_ATTEMPTS (system-only)
-- ============================================================================
-- Allow only service_role to operate; deny authenticated by omission.
CREATE POLICY "system_insert_pin_login_attempts"
ON public.pin_login_attempts
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "system_select_pin_login_attempts"
ON public.pin_login_attempts
FOR SELECT
TO service_role
USING (true);

CREATE POLICY "system_update_pin_login_attempts"
ON public.pin_login_attempts
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "system_delete_pin_login_attempts"
ON public.pin_login_attempts
FOR DELETE
TO service_role
USING (true);

-- ============================================================================
-- 11) Metrics tables (if exist): daily_sales_metrics, variant_metrics
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_sales_metrics') THEN
    ALTER TABLE public.daily_sales_metrics ENABLE ROW LEVEL SECURITY;
    -- drop existing policies on this table
    PERFORM 1;
  END IF;
END $$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('daily_sales_metrics','variant_metrics')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_sales_metrics') THEN
    CREATE POLICY "tenant_select_daily_sales_metrics"
    ON public.daily_sales_metrics
    FOR SELECT
    TO authenticated
    USING (
      public.daily_sales_metrics.store_id IN (SELECT st.store_id FROM public.stores st WHERE st.account_id = public.get_account_id())
    );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'variant_metrics') THEN
    CREATE POLICY "tenant_select_variant_metrics"
    ON public.variant_metrics
    FOR SELECT
    TO authenticated
    USING (
      public.variant_metrics.variant_id IN (
        SELECT pv.variant_id
        FROM public.product_variants pv
        JOIN public.product_styles ps ON ps.style_id = pv.style_id
        WHERE ps.account_id = public.get_account_id()
      )
    );

    CREATE POLICY "noncashier_delete_variant_metrics"
    ON public.variant_metrics
    FOR DELETE
    TO authenticated
    USING (
      public.variant_metrics.variant_id IN (
        SELECT pv.variant_id
        FROM public.product_variants pv
        JOIN public.product_styles ps ON ps.style_id = pv.style_id
        WHERE ps.account_id = public.get_account_id()
      )
      AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.active = true AND s.role = 'cashier')
    );
  END IF;
END $$;

-- ============================================================================
-- 12) Verification
-- ============================================================================
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

COMMIT;

