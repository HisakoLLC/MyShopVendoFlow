-- ============================================================================
-- EXPORT ACCOUNT DATA (for customer data requests / GDPR-style data export)
-- ============================================================================
-- When a customer asks for their data, run this in Supabase SQL Editor.
-- Replace 'YOUR_ACCOUNT_ID_HERE' with the account_id (UUID) for that customer.
-- Then run each section and export the result (e.g. Download as CSV in Supabase).
--
-- You can find account_id from: accounts WHERE owner_email = 'customer@example.com'
-- Or from account_members if you have their user_id.
-- ============================================================================

-- Set the account to export (replace with the actual UUID):
-- Example: \set account_id '\'a1b2c3d4-e5f6-7890-abcd-ef1234567890\''
-- In Supabase SQL Editor you cannot use \set; run each SELECT with the UUID in the WHERE clause.

-- 1. Account and profile
SELECT * FROM public.accounts WHERE account_id = 'YOUR_ACCOUNT_ID_HERE';

-- 2. Account members (who had access)
SELECT * FROM public.account_members WHERE account_id = 'YOUR_ACCOUNT_ID_HERE';

-- 3. Business settings
SELECT * FROM public.business_settings WHERE account_id = 'YOUR_ACCOUNT_ID_HERE';

-- 4. Stores
SELECT * FROM public.stores WHERE account_id = 'YOUR_ACCOUNT_ID_HERE';

-- 5. Categories
SELECT * FROM public.categories WHERE account_id = 'YOUR_ACCOUNT_ID_HERE';

-- 6. Seasons
SELECT * FROM public.seasons WHERE account_id = 'YOUR_ACCOUNT_ID_HERE';

-- 7. Product styles (products)
SELECT * FROM public.product_styles WHERE account_id = 'YOUR_ACCOUNT_ID_HERE';

-- 8. Product variants (for styles belonging to this account)
SELECT pv.*
FROM public.product_variants pv
JOIN public.product_styles ps ON ps.style_id = pv.style_id
WHERE ps.account_id = 'YOUR_ACCOUNT_ID_HERE';

-- 9. Customers
SELECT * FROM public.customers WHERE account_id = 'YOUR_ACCOUNT_ID_HERE';

-- 10. Staff
SELECT * FROM public.staff WHERE account_id = 'YOUR_ACCOUNT_ID_HERE';

-- 11. Sales (via stores)
SELECT s.*
FROM public.sales s
JOIN public.stores st ON st.store_id = s.store_id
WHERE st.account_id = 'YOUR_ACCOUNT_ID_HERE';

-- 12. Sale line items (via sales for this account)
SELECT sl.*
FROM public.sale_line_items sl
JOIN public.sales s ON s.sale_id = sl.sale_id
JOIN public.stores st ON st.store_id = s.store_id
WHERE st.account_id = 'YOUR_ACCOUNT_ID_HERE';

-- 13. Inventory levels (stores + variants for this account)
SELECT il.*
FROM public.inventory_levels il
JOIN public.stores st ON st.store_id = il.store_id
JOIN public.product_variants pv ON pv.variant_id = il.variant_id
JOIN public.product_styles ps ON ps.style_id = pv.style_id AND ps.account_id = 'YOUR_ACCOUNT_ID_HERE'
WHERE st.account_id = 'YOUR_ACCOUNT_ID_HERE';

-- 14. Purchase orders
SELECT * FROM public.purchase_orders WHERE account_id = 'YOUR_ACCOUNT_ID_HERE';

-- 15. PO line items (via purchase_orders for this account)
SELECT pol.*
FROM public.po_line_items pol
JOIN public.purchase_orders po ON po.po_id = pol.po_id
WHERE po.account_id = 'YOUR_ACCOUNT_ID_HERE';

-- 16. Inventory receipts (via POs for this account)
SELECT ir.*
FROM public.inventory_receipts ir
JOIN public.purchase_orders po ON po.po_id = ir.po_id
WHERE po.account_id = 'YOUR_ACCOUNT_ID_HERE';

-- 17. Suppliers
SELECT * FROM public.suppliers WHERE account_id = 'YOUR_ACCOUNT_ID_HERE';

-- ============================================================================
-- NOTE: Storage (business logos, product images) is not exported by SQL.
-- Export files from Supabase Storage buckets "business-logos" and "product-images"
-- for paths belonging to this account (e.g. by account_id in path or by listing
-- objects and filtering). Do this manually from Dashboard or via Storage API.
-- ============================================================================
