-- VERIFY EVERYTHING IS SET UP CORRECTLY
-- Run this to verify your setup

-- Step 1: Verify account_members record exists for your user
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
WHERE u.email = 'inamaxmud01@gmail.com';

-- Step 2: Test get_account_id() function directly
-- Note: This will only work if you're logged into SQL Editor as inamaxmud01@gmail.com
-- If you're logged in as a different user, this will return null (that's expected)
SELECT get_account_id() as account_id_from_function;

-- Step 3: Test if you can query stores (this should work if RLS is set up)
SELECT 
    store_id,
    name,
    account_id
FROM stores
WHERE account_id = '43afb945-9f99-49ea-87d1-c4afe18be712'
LIMIT 5;

-- Step 4: Test if you can query sales (this should work if RLS is set up)
SELECT COUNT(*) as sales_count
FROM sales
WHERE store_id IN (
    SELECT store_id 
    FROM stores 
    WHERE account_id = '43afb945-9f99-49ea-87d1-c4afe18be712'
);

-- Step 5: Verify get_user_account_ids() function works
SELECT account_id FROM get_user_account_ids();

-- Step 6: Check all RLS policies are in place
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('stores', 'sales', 'sale_line_items', 'account_members', 'accounts')
GROUP BY tablename
ORDER BY tablename;
