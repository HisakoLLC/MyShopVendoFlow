-- RLS for refunds table so authenticated users can create and view refunds for their account's sales.
-- Run in Supabase SQL Editor.

GRANT SELECT, INSERT ON TABLE public.refunds TO authenticated;
GRANT SELECT, INSERT ON TABLE public.refunds TO service_role;

ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view refunds for their account" ON refunds;
DROP POLICY IF EXISTS "Users can create refunds for their account" ON refunds;

CREATE POLICY "Users can view refunds for their account"
ON refunds FOR SELECT TO authenticated
USING (
  sale_id IN (
    SELECT s.sale_id FROM sales s
    WHERE s.store_id IN (
      SELECT store_id FROM stores
      WHERE account_id IN (SELECT account_id FROM get_user_account_ids())
    )
  )
);

CREATE POLICY "Users can create refunds for their account"
ON refunds FOR INSERT TO authenticated
WITH CHECK (
  sale_id IN (
    SELECT s.sale_id FROM sales s
    WHERE s.store_id IN (
      SELECT store_id FROM stores
      WHERE account_id IN (SELECT account_id FROM get_user_account_ids())
    )
  )
);
