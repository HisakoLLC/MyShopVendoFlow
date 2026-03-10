-- PRODUCTION_INDEXES.sql
-- ============================================
-- PRODUCTION PERFORMANCE INDEXES
-- Run after RLS policies are stable
-- ============================================

BEGIN;

-- Authentication & Account Access (used in every RLS policy)
CREATE INDEX IF NOT EXISTS idx_account_members_user_id 
  ON public.account_members(user_id);

CREATE INDEX IF NOT EXISTS idx_staff_auth_user_id 
  ON public.staff(auth_user_id) 
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_staff_account_id 
  ON public.staff(account_id) 
  WHERE active = true;

-- Multi-tenant scoping (used in every data query)
CREATE INDEX IF NOT EXISTS idx_stores_account_id 
  ON public.stores(account_id);

CREATE INDEX IF NOT EXISTS idx_product_styles_account_id 
  ON public.product_styles(account_id);

CREATE INDEX IF NOT EXISTS idx_product_variants_style_id 
  ON public.product_variants(style_id);

-- Inventory (highest cardinality, most queried)
CREATE INDEX IF NOT EXISTS idx_inventory_levels_store_id 
  ON public.inventory_levels(store_id);

CREATE INDEX IF NOT EXISTS idx_inventory_levels_variant_id 
  ON public.inventory_levels(variant_id);

-- Composite index for per-store, per-variant lookups (POS, transfers)
CREATE INDEX IF NOT EXISTS idx_inventory_levels_store_variant 
  ON public.inventory_levels(store_id, variant_id);

-- Ensure uniqueness (prevents duplicate inventory records)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unique_inventory_store_variant'
      AND conrelid = 'public.inventory_levels'::regclass
  ) THEN
    ALTER TABLE public.inventory_levels 
      ADD CONSTRAINT unique_inventory_store_variant 
      UNIQUE (store_id, variant_id);
  END IF;
END $$;

-- Sales & Reporting (dashboard queries)
CREATE INDEX IF NOT EXISTS idx_sales_store_id 
  ON public.sales(store_id);

CREATE INDEX IF NOT EXISTS idx_sales_sale_date_desc 
  ON public.sales(sale_date DESC);

-- Composite for "sales by store and date range" (most common dashboard query)
CREATE INDEX IF NOT EXISTS idx_sales_store_date 
  ON public.sales(store_id, sale_date DESC);

CREATE INDEX IF NOT EXISTS idx_sales_cashier_id 
  ON public.sales(cashier_id);

-- Sale line items (variant-level reporting)
CREATE INDEX IF NOT EXISTS idx_sale_line_items_sale_id 
  ON public.sale_line_items(sale_id);

CREATE INDEX IF NOT EXISTS idx_sale_line_items_variant_id 
  ON public.sale_line_items(variant_id);

-- Product search (POS search by name, SKU, barcode)
CREATE INDEX IF NOT EXISTS idx_product_styles_name 
  ON public.product_styles(name);

CREATE INDEX IF NOT EXISTS idx_product_variants_sku 
  ON public.product_variants(sku);

CREATE INDEX IF NOT EXISTS idx_product_variants_barcode 
  ON public.product_variants(barcode) 
  WHERE barcode IS NOT NULL;

-- Categories & Seasons (filtering)
CREATE INDEX IF NOT EXISTS idx_product_styles_category_id 
  ON public.product_styles(category_id);

CREATE INDEX IF NOT EXISTS idx_product_styles_season_id 
  ON public.product_styles(season_id) 
  WHERE season_id IS NOT NULL;

-- Inventory transfers (audit trail)
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_from_store 
  ON public.inventory_transfers(from_store_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transfers_to_store 
  ON public.inventory_transfers(to_store_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transfers_variant 
  ON public.inventory_transfers(variant_id);

-- Customers (POS customer lookup)
CREATE INDEX IF NOT EXISTS idx_customers_phone 
  ON public.customers(phone) 
  WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_email 
  ON public.customers(email) 
  WHERE email IS NOT NULL;

-- Audit logs (if they exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'audit_logs'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_audit_logs_account_id 
      ON public.audit_logs(account_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
      ON public.audit_logs(created_at DESC);
  END IF;
END $$;

COMMIT;

-- Verify indexes were created
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'account_members', 'staff', 'stores', 'product_styles', 'product_variants',
    'inventory_levels', 'sales', 'sale_line_items', 'inventory_transfers'
  )
ORDER BY tablename, indexname;

-- Success message
SELECT '✅ All production indexes created successfully' AS status;

