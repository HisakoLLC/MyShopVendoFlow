-- Fix audit_logs RLS to ensure service role can insert
-- The service role should bypass RLS, but this ensures the policy is correct

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

-- Create a more permissive INSERT policy
-- Service role bypasses RLS, but this ensures regular inserts work too
CREATE POLICY "System can insert audit logs"
ON audit_logs
FOR INSERT
WITH CHECK (true);

-- Verify the policy exists
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'audit_logs';
