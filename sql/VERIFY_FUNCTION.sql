-- Run this SQL in Supabase SQL Editor to verify the function exists and works

-- 1. Check if function exists
SELECT 
    routine_name, 
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'create_account';

-- 2. Check function permissions
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    CASE 
        WHEN p.prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END as security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'create_account';

-- 3. Test the function (replace with your actual email)
-- Uncomment and run this after verifying the function exists:
-- SELECT create_account('Test Business', 'your-email@example.com');
