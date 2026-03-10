-- PRODUCTION_INDEXES_V2.sql
-- ============================================
-- Additional production performance indexes
-- Depends on schema from PRODUCTION_INDEXES.sql but can be run independently.
-- All indexes use IF NOT EXISTS, so re-running is safe.
-- ============================================

BEGIN;

-- Daily sales metrics (account + date range)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'daily_sales_metrics'
      AND column_name  = 'metric_date'
  ) 
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'daily_sales_metrics'
      AND column_name  = 'account_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_daily_sales_metrics_account_date
      ON public.daily_sales_metrics(account_id, metric_date DESC);
  END IF;
END $$;

-- Variant metrics (per-variant performance over time)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'variant_metrics'
      AND column_name  = 'metric_date'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'variant_metrics'
      AND column_name  = 'account_id'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'variant_metrics'
      AND column_name  = 'variant_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_variant_metrics_account_variant_date
      ON public.variant_metrics(account_id, variant_id, metric_date DESC);
  END IF;
END $$;

-- Pending M-Pesa payments (callback lookups)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'pending_mpesa_payments'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_pending_mpesa_payments_checkout
      ON public.pending_mpesa_payments(checkout_request_id);

    CREATE INDEX IF NOT EXISTS idx_pending_mpesa_payments_sale
      ON public.pending_mpesa_payments(sale_id);
  END IF;
END $$;

-- Optional: direct sales account/date index if you add account-level rollups
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'sales'
      AND column_name  = 'account_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_sales_account_date
      ON public.sales(account_id, sale_date DESC);
  END IF;
END $$;

COMMIT;

-- Success message
SELECT '✅ Additional production indexes (V2) created successfully' AS status;

