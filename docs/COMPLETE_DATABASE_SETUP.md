# Complete Database Setup - Step by Step

## 🎯 Goal

Set up your Supabase database so that signup and onboarding work correctly.

## ✅ Prerequisites

- Supabase project created
- Access to Supabase SQL Editor
- Your app running locally

## 📋 Setup Steps (Run in Order)

### Step 1: Fix Accounts & Account Members (SIGNUP)

**File:** `sql/FIX_ACCOUNTS_SIGNUP_ERROR.sql`

**Why:** Allows users to create accounts during signup.

**Action:**
1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `sql/FIX_ACCOUNTS_SIGNUP_ERROR.sql`
3. Click **Run**
4. Verify output shows 6 policies created

**Verify:**
```sql
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('accounts', 'account_members')
ORDER BY tablename, cmd;
```

Should show:
- accounts: INSERT, SELECT, UPDATE
- account_members: INSERT, SELECT, UPDATE

### Step 2: Create get_account_id() Function

**File:** `sql/FIX_GET_ACCOUNT_ID.sql`

**Why:** Needed for RLS policies and account lookups.

**Action:**
1. Copy entire contents of `sql/FIX_GET_ACCOUNT_ID.sql`
2. Run in SQL Editor
3. Verify no errors

**Verify:**
```sql
SELECT get_account_id();
```

Should return your account_id (or NULL if not logged in).

### Step 3: Set Up RLS for All Other Tables

**File:** `sql/SETUP_ALL_RLS.sql`

**Why:** Sets up security policies for stores, products, sales, etc.

**Action:**
1. Copy entire contents of `sql/SETUP_ALL_RLS.sql`
2. Run in SQL Editor
3. This is a large script - wait for it to complete

**Verify:**
```sql
SELECT COUNT(*) as policy_count 
FROM pg_policies 
WHERE schemaname = 'public';
```

Should show many policies (20+).

### Step 4: Create create_account() Function (Optional)

**File:** `sql/FIX_PLAN_TIER.sql`

**Why:** Provides an RPC function for account creation (alternative method).

**Action:**
1. Copy entire contents of `sql/FIX_PLAN_TIER.sql`
2. Run in SQL Editor

**Note:** This is optional - the direct INSERT method should work after Step 1.

### Step 5: Add Demo Data Column

**File:** `scripts/ADD_HAS_DEMO_DATA_COLUMN.sql`

**Why:** Tracks if account has demo data.

**Action:**
1. Copy entire contents
2. Run in SQL Editor

### Step 6: Create Storage Buckets

**In Supabase Dashboard:**

1. Go to **Storage**
2. Create bucket: `product-images`
   - Public: **Yes**
   - File size limit: 5MB
3. Create bucket: `business-logos`
   - Public: **Yes**
   - File size limit: 200KB

### Step 7: Deploy Edge Function

1. Go to **Edge Functions**
2. Create function: `calculate-metrics`
3. Copy code from `supabase/functions/calculate-metrics/index.ts`
4. Deploy

### Step 8: Schedule Edge Function (Optional)

**File:** `sql/SCHEDULE_CALCULATE_METRICS.sql`

**Why:** Runs metrics calculation daily.

**Action:**
1. Copy entire contents
2. Run in SQL Editor
3. Replace placeholders with your actual values

## 🧪 Testing

After setup, test:

1. **Signup:**
   - Go to `/signup`
   - Create account
   - Should succeed ✅

2. **Onboarding:**
   - Should redirect to `/onboarding`
   - Step 1: Create store - should work ✅
   - Step 2: Add categories - should work ✅
   - Step 3: Choose plan - should work ✅

3. **Verify Database:**
   ```sql
   -- Check account was created
   SELECT * FROM accounts ORDER BY created_at DESC LIMIT 1;
   
   -- Check account_members was created
   SELECT * FROM account_members ORDER BY created_at DESC LIMIT 1;
   
   -- Check store was created
   SELECT * FROM stores ORDER BY created_at DESC LIMIT 1;
   ```

## 🚨 Common Issues

### Issue: "Permission denied" after running scripts

**Solution:** 
1. Check RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'accounts';`
2. Verify policies exist: `SELECT * FROM pg_policies WHERE tablename = 'accounts';`
3. Re-run the fix script

### Issue: "Function get_account_id does not exist"

**Solution:** Run `sql/FIX_GET_ACCOUNT_ID.sql`

### Issue: Signup works but onboarding fails

**Solution:** 
1. Run `sql/FIX_STORES_PERMISSION_NOW.sql` OR
2. Ensure `sql/SETUP_ALL_RLS.sql` was run completely

## ✅ Final Verification

Run this comprehensive check:

```sql
-- 1. Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('accounts', 'account_members', 'stores', 'categories')
ORDER BY tablename;

-- 2. Check policies exist
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('accounts', 'account_members', 'stores', 'categories')
GROUP BY tablename
ORDER BY tablename;

-- 3. Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_account_id', 'create_account', 'get_user_account_ids')
ORDER BY routine_name;
```

All should return results showing RLS enabled, policies exist, and functions exist.

---

**Once all steps are complete, signup and onboarding should work!** 🎉
