-- STORE_PROFILE_FIELDS.sql
-- ============================================================================
-- Add per-store profile fields: logo, phone, address.
-- Run after initial schema is in place.
-- ============================================================================

BEGIN;

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS logo_on_receipt boolean;

COMMIT;

SELECT '✅ Store profile fields added to public.stores' AS status;

