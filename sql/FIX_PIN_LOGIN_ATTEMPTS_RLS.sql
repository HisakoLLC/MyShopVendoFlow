-- Fix pin_login_attempts RLS to allow service role access
-- Service role should bypass RLS, but this ensures the policy is correct

-- Check current RLS status
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'pin_login_attempts';

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role can manage pin_login_attempts" ON pin_login_attempts;
DROP POLICY IF EXISTS "System can insert pin_login_attempts" ON pin_login_attempts;
DROP POLICY IF EXISTS "System can update pin_login_attempts" ON pin_login_attempts;
DROP POLICY IF EXISTS "System can delete pin_login_attempts" ON pin_login_attempts;

-- Create permissive policies for service role
-- Service role bypasses RLS, but these policies ensure regular operations work too

-- Allow inserts (for tracking failed attempts)
CREATE POLICY "System can insert pin_login_attempts"
ON pin_login_attempts
FOR INSERT
WITH CHECK (true);

-- Allow updates (for incrementing attempt counts)
CREATE POLICY "System can update pin_login_attempts"
ON pin_login_attempts
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow deletes (for clearing attempts after successful login)
CREATE POLICY "System can delete pin_login_attempts"
ON pin_login_attempts
FOR DELETE
USING (true);

-- Allow selects (for checking attempt counts)
CREATE POLICY "System can select pin_login_attempts"
ON pin_login_attempts
FOR SELECT
USING (true);

-- Verify policies were created
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'pin_login_attempts';
