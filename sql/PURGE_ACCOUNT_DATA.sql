-- ============================================================================
-- PURGE ACCOUNT DATA (permanent deletion of all data for an account)
-- ============================================================================
-- Run this ONLY when:
--   - The account is already marked for deletion (subscription_status = 'cancelled'),
--   - AND either 90 days have passed since trial_ends_at, or you have explicit
--     authorization to delete immediately (e.g. user request).
--
-- Replace 'YOUR_ACCOUNT_ID_HERE' with the account_id (UUID) in every statement.
-- Run the entire script in Supabase SQL Editor. Order matters (child tables first).
--
-- WARNING: This permanently deletes data. There is no undo.
-- ============================================================================

-- Optional: Uncomment to restrict to accounts already scheduled for deletion
-- and past their purge date (recommended for scheduled jobs):
--
-- DO $$
-- DECLARE
--   target_id uuid := 'YOUR_ACCOUNT_ID_HERE';
--   row accounts%rowtype;
-- BEGIN
--   SELECT * INTO row FROM accounts WHERE account_id = target_id;
--   IF row IS NULL THEN RAISE EXCEPTION 'Account not found'; END IF;
--   IF row.subscription_status IS DISTINCT FROM 'cancelled' THEN
--     RAISE EXCEPTION 'Account is not scheduled for deletion (subscription_status = %)', row.subscription_status;
--   END IF;
--   IF row.trial_ends_at IS NOT NULL AND row.trial_ends_at > now() THEN
--     RAISE EXCEPTION 'Purge date not yet reached (trial_ends_at = %)', row.trial_ends_at;
--   END IF;
-- END $$;

-- 1. Sale line items (child of sales)
DELETE FROM public.sale_line_items
WHERE sale_id IN (
  SELECT s.sale_id FROM public.sales s
  JOIN public.stores st ON st.store_id = s.store_id
  WHERE st.account_id = 'YOUR_ACCOUNT_ID_HERE'
);

-- 2. Sales (child of stores)
DELETE FROM public.sales
WHERE store_id IN (SELECT store_id FROM public.stores WHERE account_id = 'YOUR_ACCOUNT_ID_HERE');

-- 3. Inventory levels (stores + variants for this account)
DELETE FROM public.inventory_levels
WHERE store_id IN (SELECT store_id FROM public.stores WHERE account_id = 'YOUR_ACCOUNT_ID_HERE')
   OR variant_id IN (
     SELECT pv.variant_id FROM public.product_variants pv
     JOIN public.product_styles ps ON ps.style_id = pv.style_id
     WHERE ps.account_id = 'YOUR_ACCOUNT_ID_HERE'
   );

-- 4. Inventory receipts (child of purchase_orders)
DELETE FROM public.inventory_receipts
WHERE po_id IN (SELECT po_id FROM public.purchase_orders WHERE account_id = 'YOUR_ACCOUNT_ID_HERE');

-- 5. PO line items (child of purchase_orders)
DELETE FROM public.po_line_items
WHERE po_id IN (SELECT po_id FROM public.purchase_orders WHERE account_id = 'YOUR_ACCOUNT_ID_HERE');

-- 6. Purchase orders
DELETE FROM public.purchase_orders WHERE account_id = 'YOUR_ACCOUNT_ID_HERE';

-- 7. Product variants (child of product_styles)
DELETE FROM public.product_variants
WHERE style_id IN (SELECT style_id FROM public.product_styles WHERE account_id = 'YOUR_ACCOUNT_ID_HERE');

-- 8. Product styles
DELETE FROM public.product_styles WHERE account_id = 'YOUR_ACCOUNT_ID_HERE';

-- 9. Staff
DELETE FROM public.staff WHERE account_id = 'YOUR_ACCOUNT_ID_HERE';

-- 10. Customers
DELETE FROM public.customers WHERE account_id = 'YOUR_ACCOUNT_ID_HERE';

-- 11. Categories
DELETE FROM public.categories WHERE account_id = 'YOUR_ACCOUNT_ID_HERE';

-- 12. Seasons
DELETE FROM public.seasons WHERE account_id = 'YOUR_ACCOUNT_ID_HERE';

-- 13. Business settings
DELETE FROM public.business_settings WHERE account_id = 'YOUR_ACCOUNT_ID_HERE';

-- 14. Account members
DELETE FROM public.account_members WHERE account_id = 'YOUR_ACCOUNT_ID_HERE';

-- 15. Stores
DELETE FROM public.stores WHERE account_id = 'YOUR_ACCOUNT_ID_HERE';

-- 16. Suppliers
DELETE FROM public.suppliers WHERE account_id = 'YOUR_ACCOUNT_ID_HERE';

-- 17. Account row
DELETE FROM public.accounts WHERE account_id = 'YOUR_ACCOUNT_ID_HERE';

-- ============================================================================
-- NOTE: Auth users (Supabase Auth) are NOT deleted by this script.
-- To remove the owner/staff from Auth as well, use Supabase Dashboard →
-- Authentication → Users, or Auth Admin API (deleteUser).
--
-- Storage: Files in "business-logos" and "product-images" for this account
-- are not deleted here. Delete those objects manually from Storage or via API
-- (e.g. list by prefix and delete) if required.
-- ============================================================================
