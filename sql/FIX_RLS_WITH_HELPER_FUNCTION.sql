-- FIX RLS POLICIES USING HELPER FUNCTION
-- This creates a SECURITY DEFINER function that can be used in RLS policies
-- This bypasses the circular dependency issue with account_members subqueries

-- Step 1: Create a helper function that returns account IDs for the current user
-- This function runs with elevated privileges and can query account_members
CREATE OR REPLACE FUNCTION get_user_account_ids()
RETURNS TABLE(account_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT am.account_id
  FROM account_members am
  WHERE am.user_id = auth.uid();
END;
$$;

-- Step 2: Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_account_ids() TO authenticated;

-- Step 3: Update STORES policies to use the helper function
DROP POLICY IF EXISTS "Users can view stores for their account" ON stores;
DROP POLICY IF EXISTS "Users can create stores for their account" ON stores;
DROP POLICY IF EXISTS "Users can update stores for their account" ON stores;
DROP POLICY IF EXISTS "Users can delete stores for their account" ON stores;

CREATE POLICY "Users can view stores for their account"
ON stores
FOR SELECT
TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can create stores for their account"
ON stores
FOR INSERT
TO authenticated
WITH CHECK (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can update stores for their account"
ON stores
FOR UPDATE
TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()))
WITH CHECK (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can delete stores for their account"
ON stores
FOR DELETE
TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()));

-- Step 4: Update CATEGORIES policies
DROP POLICY IF EXISTS "Users can view categories for their account" ON categories;
DROP POLICY IF EXISTS "Users can create categories for their account" ON categories;
DROP POLICY IF EXISTS "Users can update categories for their account" ON categories;
DROP POLICY IF EXISTS "Users can delete categories for their account" ON categories;

CREATE POLICY "Users can view categories for their account"
ON categories
FOR SELECT
TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can create categories for their account"
ON categories
FOR INSERT
TO authenticated
WITH CHECK (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can update categories for their account"
ON categories
FOR UPDATE
TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()))
WITH CHECK (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can delete categories for their account"
ON categories
FOR DELETE
TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()));

-- Step 5: Update SEASONS policies
DROP POLICY IF EXISTS "Users can view seasons for their account" ON seasons;
DROP POLICY IF EXISTS "Users can create seasons for their account" ON seasons;
DROP POLICY IF EXISTS "Users can update seasons for their account" ON seasons;
DROP POLICY IF EXISTS "Users can delete seasons for their account" ON seasons;

CREATE POLICY "Users can view seasons for their account"
ON seasons
FOR SELECT
TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can create seasons for their account"
ON seasons
FOR INSERT
TO authenticated
WITH CHECK (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can update seasons for their account"
ON seasons
FOR UPDATE
TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()))
WITH CHECK (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can delete seasons for their account"
ON seasons
FOR DELETE
TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()));

-- Step 6: Update PRODUCT_STYLES policies
DROP POLICY IF EXISTS "Users can view product styles for their account" ON product_styles;
DROP POLICY IF EXISTS "Users can create product styles for their account" ON product_styles;
DROP POLICY IF EXISTS "Users can update product styles for their account" ON product_styles;
DROP POLICY IF EXISTS "Users can delete product styles for their account" ON product_styles;

CREATE POLICY "Users can view product styles for their account"
ON product_styles
FOR SELECT
TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can create product styles for their account"
ON product_styles
FOR INSERT
TO authenticated
WITH CHECK (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can update product styles for their account"
ON product_styles
FOR UPDATE
TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()))
WITH CHECK (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can delete product styles for their account"
ON product_styles
FOR DELETE
TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()));

-- Step 7: Update ACCOUNTS policies (for consistency)
DROP POLICY IF EXISTS "Users can view their account" ON accounts;
DROP POLICY IF EXISTS "Users can update their account" ON accounts;

CREATE POLICY "Users can view their account"
ON accounts
FOR SELECT
TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()));

CREATE POLICY "Users can update their account"
ON accounts
FOR UPDATE
TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()));

-- Step 8: Test the function
SELECT account_id FROM get_user_account_ids();

-- Step 9: Update PRODUCT_VARIANTS policies (uses product_styles, which now uses helper function)
DROP POLICY IF EXISTS "Users can view product variants for their account" ON product_variants;
DROP POLICY IF EXISTS "Users can create product variants for their account" ON product_variants;
DROP POLICY IF EXISTS "Users can update product variants for their account" ON product_variants;
DROP POLICY IF EXISTS "Users can delete product variants for their account" ON product_variants;

CREATE POLICY "Users can view product variants for their account"
ON product_variants
FOR SELECT
TO authenticated
USING (
  style_id IN (
    SELECT style_id 
    FROM product_styles 
    WHERE account_id IN (SELECT account_id FROM get_user_account_ids())
  )
);

CREATE POLICY "Users can create product variants for their account"
ON product_variants
FOR INSERT
TO authenticated
WITH CHECK (
  style_id IN (
    SELECT style_id 
    FROM product_styles 
    WHERE account_id IN (SELECT account_id FROM get_user_account_ids())
  )
);

CREATE POLICY "Users can update product variants for their account"
ON product_variants
FOR UPDATE
TO authenticated
USING (
  style_id IN (
    SELECT style_id 
    FROM product_styles 
    WHERE account_id IN (SELECT account_id FROM get_user_account_ids())
  )
)
WITH CHECK (
  style_id IN (
    SELECT style_id 
    FROM product_styles 
    WHERE account_id IN (SELECT account_id FROM get_user_account_ids())
  )
);

CREATE POLICY "Users can delete product variants for their account"
ON product_variants
FOR DELETE
TO authenticated
USING (
  style_id IN (
    SELECT style_id 
    FROM product_styles 
    WHERE account_id IN (SELECT account_id FROM get_user_account_ids())
  )
);

-- Step 10: Update INVENTORY_LEVELS policies
DROP POLICY IF EXISTS "Users can view inventory for their account" ON inventory_levels;
DROP POLICY IF EXISTS "Users can create inventory for their account" ON inventory_levels;
DROP POLICY IF EXISTS "Users can update inventory for their account" ON inventory_levels;
DROP POLICY IF EXISTS "Users can delete inventory for their account" ON inventory_levels;

CREATE POLICY "Users can view inventory for their account"
ON inventory_levels
FOR SELECT
TO authenticated
USING (
  variant_id IN (
    SELECT variant_id 
    FROM product_variants 
    WHERE style_id IN (
      SELECT style_id 
      FROM product_styles 
      WHERE account_id IN (SELECT account_id FROM get_user_account_ids())
    )
  )
  AND store_id IN (
    SELECT store_id 
    FROM stores 
    WHERE account_id IN (SELECT account_id FROM get_user_account_ids())
  )
);

CREATE POLICY "Users can create inventory for their account"
ON inventory_levels
FOR INSERT
TO authenticated
WITH CHECK (
  variant_id IN (
    SELECT variant_id 
    FROM product_variants 
    WHERE style_id IN (
      SELECT style_id 
      FROM product_styles 
      WHERE account_id IN (SELECT account_id FROM get_user_account_ids())
    )
  )
  AND store_id IN (
    SELECT store_id 
    FROM stores 
    WHERE account_id IN (SELECT account_id FROM get_user_account_ids())
  )
);

CREATE POLICY "Users can update inventory for their account"
ON inventory_levels
FOR UPDATE
TO authenticated
USING (
  variant_id IN (
    SELECT variant_id 
    FROM product_variants 
    WHERE style_id IN (
      SELECT style_id 
      FROM product_styles 
      WHERE account_id IN (SELECT account_id FROM get_user_account_ids())
    )
  )
  AND store_id IN (
    SELECT store_id 
    FROM stores 
    WHERE account_id IN (SELECT account_id FROM get_user_account_ids())
  )
)
WITH CHECK (
  variant_id IN (
    SELECT variant_id 
    FROM product_variants 
    WHERE style_id IN (
      SELECT style_id 
      FROM product_styles 
      WHERE account_id IN (SELECT account_id FROM get_user_account_ids())
    )
  )
  AND store_id IN (
    SELECT store_id 
    FROM stores 
    WHERE account_id IN (SELECT account_id FROM get_user_account_ids())
  )
);

CREATE POLICY "Users can delete inventory for their account"
ON inventory_levels
FOR DELETE
TO authenticated
USING (
  variant_id IN (
    SELECT variant_id 
    FROM product_variants 
    WHERE style_id IN (
      SELECT style_id 
      FROM product_styles 
      WHERE account_id IN (SELECT account_id FROM get_user_account_ids())
    )
  )
  AND store_id IN (
    SELECT store_id 
    FROM stores 
    WHERE account_id IN (SELECT account_id FROM get_user_account_ids())
  )
);

-- Step 11: Test the function
SELECT account_id FROM get_user_account_ids();

-- Step 12: Verify all policies were updated
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN (
  'accounts',
  'account_members',
  'stores',
  'categories',
  'seasons',
  'product_styles',
  'product_variants',
  'inventory_levels'
)
ORDER BY tablename, policyname;
