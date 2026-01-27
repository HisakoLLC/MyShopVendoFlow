-- FIX: "numeric field overflow" when creating a store (e.g. tax rate 16.00)
-- If stores.tax_rate was created with a small precision (e.g. NUMERIC(3,2), max 9.99),
-- values like 16.00 cause overflow. Run this in Supabase SQL Editor.

-- Allow tax rates 0–100 with up to 2 decimal places (e.g. 16.00, 16.25, 100.00)
ALTER TABLE public.stores
  ALTER COLUMN tax_rate TYPE NUMERIC(5,2)
  USING (CASE WHEN tax_rate IS NULL THEN NULL ELSE LEAST(100, GREATEST(0, tax_rate::numeric)) END);
