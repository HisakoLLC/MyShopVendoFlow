-- DEBUG ACCOUNT LINK ISSUE
-- Run these queries one by one to diagnose the problem

-- Step 1: Check your current user ID
SELECT 
    id as user_id,
    email,
    created_at
FROM auth.users
WHERE id = auth.uid();

-- Step 2: Check if account_members has a record for your user
SELECT 
    am.member_id,
    am.user_id,
    am.account_id,
    am.role,
    am.created_at as member_created_at,
    a.business_name,
    a.owner_email,
    a.created_at as account_created_at
FROM account_members am
LEFT JOIN accounts a ON am.account_id = a.account_id
WHERE am.user_id = auth.uid();

-- Step 3: Check ALL account_members records (to see if user_id format is different)
SELECT 
    am.member_id,
    am.user_id,
    am.account_id,
    am.role,
    u.email as user_email
FROM account_members am
LEFT JOIN auth.users u ON am.user_id = u.id
ORDER BY am.created_at DESC
LIMIT 10;

-- Step 4: Check the get_account_id function definition
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_account_id'
AND n.nspname = 'public';

-- Step 5: Test get_account_id function directly
SELECT get_account_id() as account_id;

-- Step 6: If account_members has no record, manually create it
-- First, get your user ID from Step 1, then run:
-- INSERT INTO account_members (member_id, account_id, user_id, role)
-- VALUES (
--     gen_random_uuid(), 
--     '43afb945-9f99-49ea-87d1-c4afe18be712', 
--     auth.uid(), 
--     'owner'
-- )
-- ON CONFLICT (member_id) DO NOTHING;

-- Step 7: If the INSERT above doesn't work, try with explicit user_id
-- (Replace 'YOUR_USER_ID_HERE' with the user_id from Step 1)
-- INSERT INTO account_members (member_id, account_id, user_id, role)
-- VALUES (
--     gen_random_uuid(), 
--     '43afb945-9f99-49ea-87d1-c4afe18be712', 
--     'YOUR_USER_ID_HERE'::uuid, 
--     'owner'
-- )
-- ON CONFLICT DO NOTHING;

-- Step 8: After inserting, verify again
SELECT 
    am.member_id,
    am.user_id,
    am.account_id,
    am.role,
    a.business_name
FROM account_members am
LEFT JOIN accounts a ON am.account_id = a.account_id
WHERE am.user_id = auth.uid();

-- Step 9: Test get_account_id again
SELECT get_account_id() as account_id;
