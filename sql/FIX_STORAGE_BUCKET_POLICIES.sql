-- FIX: Storage buckets "business-logos" and "product-images" – allow upload/read by account
-- Run this in Supabase SQL Editor. Paths use format: {account_id}/{filename}
-- Ensures get_user_account_ids() exists, then creates RLS policies on storage.objects.

-- ============================================================================
-- 1. Ensure helper function exists (idempotent)
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
  SELECT am.account_id
  FROM account_members am
  WHERE am.user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_account_ids() TO authenticated;

-- ============================================================================
-- 2. Allow storage schema usage (required for policies on storage.objects)
-- ============================================================================
GRANT USAGE ON SCHEMA storage TO authenticated;

-- ============================================================================
-- 3. BUSINESS-LOGOS bucket – SELECT, INSERT, UPDATE, DELETE by account folder
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own business logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload business logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own business logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own business logos" ON storage.objects;

CREATE POLICY "Users can view own business logos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'business-logos'
  AND (storage.foldername(name))[1] IN (SELECT account_id::text FROM get_user_account_ids())
);

CREATE POLICY "Users can upload business logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'business-logos'
  AND (storage.foldername(name))[1] IN (SELECT account_id::text FROM get_user_account_ids())
);

CREATE POLICY "Users can update own business logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'business-logos'
  AND (storage.foldername(name))[1] IN (SELECT account_id::text FROM get_user_account_ids())
)
WITH CHECK (
  bucket_id = 'business-logos'
  AND (storage.foldername(name))[1] IN (SELECT account_id::text FROM get_user_account_ids())
);

CREATE POLICY "Users can delete own business logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'business-logos'
  AND (storage.foldername(name))[1] IN (SELECT account_id::text FROM get_user_account_ids())
);

-- ============================================================================
-- 4. PRODUCT-IMAGES bucket – SELECT, INSERT, UPDATE, DELETE by account folder
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own product images" ON storage.objects;

CREATE POLICY "Users can view own product images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] IN (SELECT account_id::text FROM get_user_account_ids())
);

CREATE POLICY "Users can upload product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] IN (SELECT account_id::text FROM get_user_account_ids())
);

CREATE POLICY "Users can update own product images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] IN (SELECT account_id::text FROM get_user_account_ids())
)
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] IN (SELECT account_id::text FROM get_user_account_ids())
);

CREATE POLICY "Users can delete own product images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] IN (SELECT account_id::text FROM get_user_account_ids())
);
