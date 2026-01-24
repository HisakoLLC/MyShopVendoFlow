-- Run this to check if your account_members record exists
-- This will help diagnose why get_account_id() returns null

-- 1. Check your current user ID
SELECT 
    id as user_id,
    email,
    created_at
FROM auth.users
WHERE id = auth.uid();

-- 2. Check if account_members has a record for your user
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

-- 3. If no record found, check all account_members (to see if user_id is different)
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

-- 4. Check all accounts
SELECT 
    account_id,
    business_name,
    owner_email,
    plan_tier,
    subscription_status,
    created_at
FROM accounts
ORDER BY created_at DESC
LIMIT 10;

-- 5. If you need to manually link your user to an account, use this:
-- (Replace the account_id and user_id with actual values from above queries)
-- INSERT INTO account_members (member_id, account_id, user_id, role)
-- VALUES (gen_random_uuid(), 'your-account-id-here', auth.uid(), 'owner');
