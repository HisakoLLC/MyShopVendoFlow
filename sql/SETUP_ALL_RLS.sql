-- COMPREHENSIVE RLS SETUP FOR VENDOFLOW
-- Run this entire script in Supabase SQL Editor to fix all permission issues at once
-- This will enable RLS and create policies for all necessary tables

-- ============================================================================
-- 1. ACCOUNTS TABLE
-- ============================================================================
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their account" ON accounts;
DROP POLICY IF EXISTS "Users can create their own account" ON accounts;
DROP POLICY IF EXISTS "Users can update their account" ON accounts;

CREATE POLICY "Users can view their account"
ON accounts
FOR SELECT
TO authenticated
USING (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own account"
ON accounts
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their account"
ON accounts
FOR UPDATE
TO authenticated
USING (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- 2. ACCOUNT_MEMBERS TABLE
-- ============================================================================
ALTER TABLE account_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their membership" ON account_members;
DROP POLICY IF EXISTS "Users can create their own membership" ON account_members;
DROP POLICY IF EXISTS "Users can update their membership" ON account_members;

CREATE POLICY "Users can view their membership"
ON account_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own membership"
ON account_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their membership"
ON account_members
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 3. STORES TABLE
-- ============================================================================
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view stores for their account" ON stores;
DROP POLICY IF EXISTS "Users can create stores for their account" ON stores;
DROP POLICY IF EXISTS "Users can update stores for their account" ON stores;
DROP POLICY IF EXISTS "Users can delete stores for their account" ON stores;

CREATE POLICY "Users can view stores for their account"
ON stores
FOR SELECT
TO authenticated
USING (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create stores for their account"
ON stores
FOR INSERT
TO authenticated
WITH CHECK (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update stores for their account"
ON stores
FOR UPDATE
TO authenticated
USING (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete stores for their account"
ON stores
FOR DELETE
TO authenticated
USING (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- 4. CATEGORIES TABLE
-- ============================================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view categories for their account" ON categories;
DROP POLICY IF EXISTS "Users can create categories for their account" ON categories;
DROP POLICY IF EXISTS "Users can update categories for their account" ON categories;
DROP POLICY IF EXISTS "Users can delete categories for their account" ON categories;

CREATE POLICY "Users can view categories for their account"
ON categories
FOR SELECT
TO authenticated
USING (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create categories for their account"
ON categories
FOR INSERT
TO authenticated
WITH CHECK (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update categories for their account"
ON categories
FOR UPDATE
TO authenticated
USING (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete categories for their account"
ON categories
FOR DELETE
TO authenticated
USING (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- 5. SEASONS TABLE
-- ============================================================================
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view seasons for their account" ON seasons;
DROP POLICY IF EXISTS "Users can create seasons for their account" ON seasons;
DROP POLICY IF EXISTS "Users can update seasons for their account" ON seasons;
DROP POLICY IF EXISTS "Users can delete seasons for their account" ON seasons;

CREATE POLICY "Users can view seasons for their account"
ON seasons
FOR SELECT
TO authenticated
USING (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create seasons for their account"
ON seasons
FOR INSERT
TO authenticated
WITH CHECK (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update seasons for their account"
ON seasons
FOR UPDATE
TO authenticated
USING (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete seasons for their account"
ON seasons
FOR DELETE
TO authenticated
USING (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- 6. PRODUCT_STYLES TABLE
-- ============================================================================
ALTER TABLE product_styles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view product styles for their account" ON product_styles;
DROP POLICY IF EXISTS "Users can create product styles for their account" ON product_styles;
DROP POLICY IF EXISTS "Users can update product styles for their account" ON product_styles;
DROP POLICY IF EXISTS "Users can delete product styles for their account" ON product_styles;

CREATE POLICY "Users can view product styles for their account"
ON product_styles
FOR SELECT
TO authenticated
USING (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create product styles for their account"
ON product_styles
FOR INSERT
TO authenticated
WITH CHECK (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update product styles for their account"
ON product_styles
FOR UPDATE
TO authenticated
USING (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete product styles for their account"
ON product_styles
FOR DELETE
TO authenticated
USING (
  account_id IN (
    SELECT account_id 
    FROM account_members 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- 7. PRODUCT_VARIANTS TABLE
-- ============================================================================
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

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
    WHERE account_id IN (
      SELECT account_id 
      FROM account_members 
      WHERE user_id = auth.uid()
    )
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
    WHERE account_id IN (
      SELECT account_id 
      FROM account_members 
      WHERE user_id = auth.uid()
    )
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
    WHERE account_id IN (
      SELECT account_id 
      FROM account_members 
      WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (
  style_id IN (
    SELECT style_id 
    FROM product_styles 
    WHERE account_id IN (
      SELECT account_id 
      FROM account_members 
      WHERE user_id = auth.uid()
    )
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
    WHERE account_id IN (
      SELECT account_id 
      FROM account_members 
      WHERE user_id = auth.uid()
    )
  )
);

-- ============================================================================
-- 8. INVENTORY_LEVELS TABLE
-- ============================================================================
ALTER TABLE inventory_levels ENABLE ROW LEVEL SECURITY;

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
      WHERE account_id IN (
        SELECT account_id 
        FROM account_members 
        WHERE user_id = auth.uid()
      )
    )
  )
  AND store_id IN (
    SELECT store_id 
    FROM stores 
    WHERE account_id IN (
      SELECT account_id 
      FROM account_members 
      WHERE user_id = auth.uid()
    )
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
      WHERE account_id IN (
        SELECT account_id 
        FROM account_members 
        WHERE user_id = auth.uid()
      )
    )
  )
  AND store_id IN (
    SELECT store_id 
    FROM stores 
    WHERE account_id IN (
      SELECT account_id 
      FROM account_members 
      WHERE user_id = auth.uid()
    )
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
      WHERE account_id IN (
        SELECT account_id 
        FROM account_members 
        WHERE user_id = auth.uid()
      )
    )
  )
  AND store_id IN (
    SELECT store_id 
    FROM stores 
    WHERE account_id IN (
      SELECT account_id 
      FROM account_members 
      WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (
  variant_id IN (
    SELECT variant_id 
    FROM product_variants 
    WHERE style_id IN (
      SELECT style_id 
      FROM product_styles 
      WHERE account_id IN (
        SELECT account_id 
        FROM account_members 
        WHERE user_id = auth.uid()
      )
    )
  )
  AND store_id IN (
    SELECT store_id 
    FROM stores 
    WHERE account_id IN (
      SELECT account_id 
      FROM account_members 
      WHERE user_id = auth.uid()
    )
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
      WHERE account_id IN (
        SELECT account_id 
        FROM account_members 
        WHERE user_id = auth.uid()
      )
    )
  )
  AND store_id IN (
    SELECT store_id 
    FROM stores 
    WHERE account_id IN (
      SELECT account_id 
      FROM account_members 
      WHERE user_id = auth.uid()
    )
  )
);

-- ============================================================================
-- VERIFICATION: Check all policies were created
-- ============================================================================
SELECT 
    tablename,
    policyname,
    cmd,
    roles
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
