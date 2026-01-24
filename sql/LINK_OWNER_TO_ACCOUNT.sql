-- LINK ACCOUNT OWNER TO ACCOUNT
-- This script finds the owner email user and links them to the account

-- Step 1: Find the user with the owner email
SELECT 
    id as user_id,
    email,
    created_at,
    'This is the owner email from accounts table' as note
FROM auth.users
WHERE email = 'inamaxmud01@gmail.com';

-- Step 2: Check if they're already linked
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
WHERE u.email = 'inamaxmud01@gmail.com'
   OR am.account_id = '43afb945-9f99-49ea-87d1-c4afe18be712';

-- Step 3: Link the owner email user to the account
-- This will find the user_id from Step 1 and link them
INSERT INTO account_members (member_id, account_id, user_id, role)
SELECT 
    gen_random_uuid(),
    '43afb945-9f99-49ea-87d1-c4afe18be712',
    u.id,
    'owner'
FROM auth.users u
WHERE u.email = 'inamaxmud01@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM account_members am 
    WHERE am.user_id = u.id 
    AND am.account_id = '43afb945-9f99-49ea-87d1-c4afe18be712'
  )
RETURNING *;

-- Step 4: Verify the link
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

-- Step 5: Test get_account_id() - this should work now when logged in as that user
-- Note: This will only work if you're logged into SQL Editor as that user
-- In your app, it should work after you log in with inamaxmud01@gmail.com
SELECT get_account_id() as account_id;
