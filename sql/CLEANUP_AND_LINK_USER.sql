-- CLEANUP INVALID RECORDS AND LINK YOUR APP USER
-- This script cleans up broken records and helps you link your actual app user

-- Step 1: Delete all account_members records with null user_id (these are broken)
DELETE FROM account_members 
WHERE user_id IS NULL
RETURNING *;

-- Step 2: List ALL users to find your app login email
SELECT 
    id as user_id,
    email,
    created_at,
    CASE 
        WHEN id = auth.uid() THEN '← Current SQL Editor User'
        ELSE ''
    END as current_session
FROM auth.users
ORDER BY created_at DESC;

-- Step 3: Check current account_members (should only have valid ones now)
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
WHERE am.account_id = '43afb945-9f99-49ea-87d1-c4afe18be712';

-- Step 4: After you identify your app login email from Step 2,
-- replace 'YOUR_APP_EMAIL_HERE' with the email you actually use to login
-- Then run this to link your user:

/*
INSERT INTO account_members (member_id, account_id, user_id, role)
SELECT 
    gen_random_uuid(),
    '43afb945-9f99-49ea-87d1-c4afe18be712',
    u.id,
    'owner'
FROM auth.users u
WHERE u.email = 'YOUR_APP_EMAIL_HERE'  -- Replace with your actual app login email
  AND NOT EXISTS (
    SELECT 1 FROM account_members am 
    WHERE am.user_id = u.id 
    AND am.account_id = '43afb945-9f99-49ea-87d1-c4afe18be712'
  )
RETURNING *;
*/

-- Step 5: Verify final state
/*
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
WHERE am.account_id = '43afb945-9f99-49ea-87d1-c4afe18be712';
*/
