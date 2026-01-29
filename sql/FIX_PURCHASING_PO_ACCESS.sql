-- FIX: permission denied for purchase_orders / po_line_items
-- Run this in Supabase SQL Editor so Create PO and Receive work.

-- ============================================================================
-- STEP 0: Ensure helper exists
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
  SELECT am.account_id FROM account_members am WHERE am.user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_account_ids() TO authenticated;

-- ============================================================================
-- STEP 1: TABLE-LEVEL GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.purchase_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.purchase_orders TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.po_line_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.po_line_items TO service_role;

GRANT SELECT, INSERT ON TABLE public.inventory_receipts TO authenticated;
GRANT SELECT, INSERT ON TABLE public.inventory_receipts TO service_role;

-- ============================================================================
-- STEP 2: RLS FOR purchase_orders
-- ============================================================================

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view POs for their account" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users can create POs for their account" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users can update POs for their account" ON public.purchase_orders;
DROP POLICY IF EXISTS "Tenant isolation for purchase_orders" ON public.purchase_orders;

CREATE POLICY "Users can view POs for their account"
ON public.purchase_orders FOR SELECT TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can create POs for their account"
ON public.purchase_orders FOR INSERT TO authenticated
WITH CHECK (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can update POs for their account"
ON public.purchase_orders FOR UPDATE TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()))
WITH CHECK (account_id IN (SELECT account_id FROM get_user_account_ids()));

-- ============================================================================
-- STEP 3: RLS FOR po_line_items (via PO's account_id)
-- ============================================================================

ALTER TABLE public.po_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view line items for their account POs" ON public.po_line_items;
DROP POLICY IF EXISTS "Users can create line items for their account POs" ON public.po_line_items;
DROP POLICY IF EXISTS "Users can update line items for their account POs" ON public.po_line_items;
DROP POLICY IF EXISTS "Tenant isolation for po_line_items" ON public.po_line_items;

CREATE POLICY "Users can view line items for their account POs"
ON public.po_line_items FOR SELECT TO authenticated
USING (
  po_id IN (SELECT po_id FROM purchase_orders WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))
);

CREATE POLICY "Users can create line items for their account POs"
ON public.po_line_items FOR INSERT TO authenticated
WITH CHECK (
  po_id IN (SELECT po_id FROM purchase_orders WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))
);

CREATE POLICY "Users can update line items for their account POs"
ON public.po_line_items FOR UPDATE TO authenticated
USING (
  po_id IN (SELECT po_id FROM purchase_orders WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))
)
WITH CHECK (
  po_id IN (SELECT po_id FROM purchase_orders WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))
);

-- ============================================================================
-- STEP 4: RLS FOR inventory_receipts (via PO's account_id)
-- ============================================================================

ALTER TABLE public.inventory_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view receipts for their account" ON public.inventory_receipts;
DROP POLICY IF EXISTS "Users can create receipts for their account" ON public.inventory_receipts;
DROP POLICY IF EXISTS "Tenant isolation for inventory_receipts" ON public.inventory_receipts;

CREATE POLICY "Users can view receipts for their account"
ON public.inventory_receipts FOR SELECT TO authenticated
USING (
  po_id IN (SELECT po_id FROM purchase_orders WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))
);

CREATE POLICY "Users can create receipts for their account"
ON public.inventory_receipts FOR INSERT TO authenticated
WITH CHECK (
  po_id IN (SELECT po_id FROM purchase_orders WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))
);
