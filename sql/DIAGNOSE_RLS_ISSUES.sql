-- DIAGNOSE RLS ISSUES
-- Run this to see what's blocking account creation

-- 1. Check if RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('accounts', 'account_members', 'stores', 'categories')
ORDER BY tablename;

-- 2. Check all policies for accounts and account_members
SELECT 
    tablename,
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('accounts', 'account_members')
ORDER BY tablename, cmd;

-- 3. Check if service role can bypass RLS
-- (This should return true - service role bypasses RLS)
SELECT 
    current_setting('role') as current_role,
    current_setting('request.jwt.claims', true) as jwt_claims;

-- 4. Test if authenticated users can insert (simulate)
-- Replace 'YOUR_USER_ID' with an actual user ID from auth.users
SELECT 
    'Test INSERT policy' as test,
    EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'accounts' 
        AND cmd = 'INSERT' 
        AND roles = '{authenticated}'
    ) as insert_policy_exists;

-- 5. Check for conflicting policies
SELECT 
    tablename,
    COUNT(*) as policy_count,
    array_agg(cmd) as commands
FROM pg_policies
WHERE tablename IN ('accounts', 'account_members')
GROUP BY tablename;
