-- Fix "new row violates row-level security policy for table inventory_levels"
-- when saving inventory from the product detail page or post-creation modal.
-- Run this in Supabase SQL Editor.
--
-- This ensures get_user_account_ids() returns accounts for both owners and staff,
-- and that inventory_levels INSERT/UPDATE policies allow the operation.

-- ============================================================================
-- 1. Ensure get_user_account_ids() includes staff (required for RLS)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_account_ids()
RETURNS TABLE(account_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Staff (individual auth user): account_id from staff table
  RETURN QUERY
  SELECT s.account_id
  FROM staff s
  WHERE s.auth_user_id = auth.uid()
    AND s.active = true
  LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  -- Legacy: staff with user_metadata.account_id
  IF (auth.jwt() -> 'user_metadata' ->> 'account_id') IS NOT NULL
     AND trim(auth.jwt() -> 'user_metadata' ->> 'account_id') != '' THEN
    BEGIN
      RETURN QUERY SELECT (trim(auth.jwt() -> 'user_metadata' ->> 'account_id'))::uuid;
      RETURN;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- Owner: from account_members
  RETURN QUERY
  SELECT am.account_id
  FROM account_members am
  WHERE am.user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_account_ids() TO authenticated;

-- ============================================================================
-- 2. Recreate inventory_levels policies
-- ============================================================================
ALTER TABLE inventory_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view inventory for their account" ON inventory_levels;
DROP POLICY IF EXISTS "Users can create inventory for their account" ON inventory_levels;
DROP POLICY IF EXISTS "Users can update inventory for their account" ON inventory_levels;
DROP POLICY IF EXISTS "Users can delete inventory for their account" ON inventory_levels;

CREATE POLICY "Users can view inventory for their account"
ON inventory_levels FOR SELECT TO authenticated
USING (
  store_id IN (SELECT store_id FROM stores WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))
  AND variant_id IN (
    SELECT variant_id FROM product_variants
    WHERE style_id IN (SELECT style_id FROM product_styles WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))
  )
);

CREATE POLICY "Users can create inventory for their account"
ON inventory_levels FOR INSERT TO authenticated
WITH CHECK (
  store_id IN (SELECT store_id FROM stores WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))
  AND variant_id IN (
    SELECT variant_id FROM product_variants
    WHERE style_id IN (SELECT style_id FROM product_styles WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))
  )
);

CREATE POLICY "Users can update inventory for their account"
ON inventory_levels FOR UPDATE TO authenticated
USING (
  store_id IN (SELECT store_id FROM stores WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))
  AND variant_id IN (
    SELECT variant_id FROM product_variants
    WHERE style_id IN (SELECT style_id FROM product_styles WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))
  )
)
WITH CHECK (
  store_id IN (SELECT store_id FROM stores WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))
  AND variant_id IN (
    SELECT variant_id FROM product_variants
    WHERE style_id IN (SELECT style_id FROM product_styles WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))
  )
);

CREATE POLICY "Users can delete inventory for their account"
ON inventory_levels FOR DELETE TO authenticated
USING (
  store_id IN (SELECT store_id FROM stores WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))
  AND variant_id IN (
    SELECT variant_id FROM product_variants
    WHERE style_id IN (SELECT style_id FROM product_styles WHERE account_id IN (SELECT account_id FROM get_user_account_ids()))
  )
);
