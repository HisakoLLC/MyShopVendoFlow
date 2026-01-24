-- FIND YOUR ACTUAL APP LOGIN USER AND LINK THEM
-- This script helps you find the user you actually log in with

-- Step 1: List ALL users in the system (to see which one is yours)
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

-- Step 2: Check what account_members records currently exist
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
ORDER BY am.created_at DESC;

-- Step 3: After you identify your app login email from Step 1, 
-- replace 'YOUR_APP_EMAIL_HERE' with the email you use to login to the app
-- Then run this:

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

-- Step 4: After linking, verify
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
