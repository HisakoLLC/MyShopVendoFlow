-- FIND AND LINK YOUR APP USER TO ACCOUNT
-- This script helps you find your app user and link them to the account

-- Step 1: List all users in auth.users (to find your app user)
SELECT 
    id as user_id,
    email,
    created_at,
    CASE 
        WHEN id = auth.uid() THEN '← Current SQL Editor User'
        ELSE ''
    END as current_session
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- Step 2: Check what account_members records exist
SELECT 
    am.member_id,
    am.user_id,
    am.account_id,
    am.role,
    u.email as user_email,
    a.business_name
FROM account_members am
LEFT JOIN auth.users u ON am.user_id = u.id
LEFT JOIN accounts a ON am.account_id = a.account_id
ORDER BY am.created_at DESC
LIMIT 10;

-- Step 3: Check what accounts exist
SELECT 
    account_id,
    business_name,
    owner_email,
    created_at
FROM accounts
ORDER BY created_at DESC
LIMIT 5;

-- Step 4: Manual link instructions
-- After running Steps 1-3, you'll see:
--   - Your app user_id (from Step 1, the email you use to login to the app)
--   - The account_id (should be '43afb945-9f99-49ea-87d1-c4afe18be712' for Demo Boutique)
--
-- Then run this (replace 'YOUR_APP_USER_ID' with the user_id from Step 1):
--
-- INSERT INTO account_members (member_id, account_id, user_id, role)
-- VALUES (
--     gen_random_uuid(),
--     '43afb945-9f99-49ea-87d1-c4afe18be712',
--     'YOUR_APP_USER_ID'::uuid,
--     'owner'
-- )
-- ON CONFLICT (account_id, user_id) DO NOTHING
-- RETURNING *;

-- Step 5: After linking, verify it worked
-- SELECT 
--     am.member_id,
--     am.user_id,
--     am.account_id,
--     am.role,
--     u.email as user_email,
--     a.business_name
-- FROM account_members am
-- LEFT JOIN auth.users u ON am.user_id = u.id
-- LEFT JOIN accounts a ON am.account_id = a.account_id
-- WHERE am.account_id = '43afb945-9f99-49ea-87d1-c4afe18be712';
