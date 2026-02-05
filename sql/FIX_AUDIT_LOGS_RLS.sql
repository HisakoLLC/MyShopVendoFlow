-- Fix audit_logs RLS to ensure service role can insert
-- The service role should bypass RLS, but this ensures the policy is correct

-- Check current RLS status
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'audit_logs';

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can view their account audit logs" ON audit_logs;

-- Create permissive INSERT policy (allows service role and system inserts)
CREATE POLICY "System can insert audit logs"
ON audit_logs
FOR SELECT
USING (true);

-- Create SELECT policy for users to view their account logs
CREATE POLICY "Users can view their account audit logs"
ON audit_logs
FOR SELECT
USING (
  account_id IN (
    SELECT account_id FROM account_members 
    WHERE user_id = auth.uid()
  )
  OR
  account_id IN (
    SELECT account_id FROM staff
    WHERE auth_user_id = auth.uid() AND active = true
  )
);

-- Verify the policies exist
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'audit_logs';
