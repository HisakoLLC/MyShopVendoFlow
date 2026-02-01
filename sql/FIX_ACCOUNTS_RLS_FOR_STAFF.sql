-- Allow staff (shared PIN user) to read and update the account for their user_metadata.account_id.
-- Run in Supabase SQL Editor. Fixes "Couldn't load settings" / "Cannot coerce the result to a single JSON object"
-- when staff with role owner open /settings.

-- Staff can SELECT their account (account_id from JWT user_metadata set by bind-staff)
DROP POLICY IF EXISTS "Staff can view their account" ON accounts;
CREATE POLICY "Staff can view their account"
ON accounts FOR SELECT TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'account_id') IS NOT NULL
  AND trim(auth.jwt() -> 'user_metadata' ->> 'account_id') != ''
  AND account_id = (trim(auth.jwt() -> 'user_metadata' ->> 'account_id'))::uuid
);

-- Staff can UPDATE their account (e.g. business name; only staff with role owner should access /settings)
DROP POLICY IF EXISTS "Staff can update their account" ON accounts;
CREATE POLICY "Staff can update their account"
ON accounts FOR UPDATE TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'account_id') IS NOT NULL
  AND trim(auth.jwt() -> 'user_metadata' ->> 'account_id') != ''
  AND account_id = (trim(auth.jwt() -> 'user_metadata' ->> 'account_id'))::uuid
)
WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'account_id') IS NOT NULL
  AND account_id = (trim(auth.jwt() -> 'user_metadata' ->> 'account_id'))::uuid
);
