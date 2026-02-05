-- Test if audit_logs insert works with service role
-- Run this in Supabase SQL Editor to verify RLS policies

-- First, check if the table exists and has the right structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'audit_logs'
ORDER BY ordinal_position;

-- Check RLS status
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'audit_logs';

-- Check existing policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'audit_logs';

-- Try a test insert (this should work with service role)
-- Note: This will only work if run with service role key
-- In Supabase Dashboard, service role bypasses RLS automatically

-- Check if there are any existing audit logs
SELECT COUNT(*) as total_logs FROM audit_logs;

-- Check recent audit logs by type
SELECT 
  action_type,
  COUNT(*) as count,
  MAX(created_at) as last_occurrence
FROM audit_logs
GROUP BY action_type
ORDER BY last_occurrence DESC;
