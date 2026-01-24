-- Grant explicit permissions to service_role for product_variants table
-- This ensures the service role can access the table even if RLS is enabled
-- Run this in Supabase Dashboard → SQL Editor

-- Grant SELECT permission on product_variants to service_role
GRANT SELECT ON TABLE public.product_variants TO service_role;

-- Also grant permissions on related tables that the function needs
GRANT SELECT ON TABLE public.inventory_levels TO service_role;
GRANT SELECT ON TABLE public.sale_line_items TO service_role;
GRANT SELECT ON TABLE public.sales TO service_role;
GRANT SELECT ON TABLE public.inventory_receipts TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.variant_metrics TO service_role;

-- Verify permissions
SELECT 
    table_name,
    privilege_type,
    grantee
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
    AND table_name IN ('product_variants', 'inventory_levels', 'sale_line_items', 'sales', 'inventory_receipts', 'variant_metrics')
    AND grantee = 'service_role'
ORDER BY table_name, privilege_type;
