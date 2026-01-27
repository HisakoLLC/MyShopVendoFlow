# Quick Fix: Onboarding "Permission Denied" Error

## 🚨 Error You're Seeing

```
Failed to create account: permission denied for table accounts. Code: 42501
```

## ✅ Root Cause

The error occurs because either:

1. **Table-level GRANTs** are missing: the `authenticated` role needs explicit `GRANT SELECT, INSERT, UPDATE, DELETE` on `accounts` and `account_members`. RLS only restricts access; it does not grant it.
2. **RLS policies** are missing or misconfigured for `accounts` and `account_members`.

The app now creates the account using your **logged-in session** (when you run the SQL fix below), so onboarding works even if `SUPABASE_SERVICE_ROLE_KEY` is not set (e.g. on Vercel).

## 🔧 Fix (5 minutes)

### Step 1: Run the SQL Fix Script

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to **SQL Editor** (left sidebar)

2. **Run the Fix Script**
   - Open the file `sql/FIX_ALL_RLS_ISSUES.sql` in your project
   - Copy the **entire contents** of the file
   - Paste it into the SQL Editor
   - Click **Run** (or press Ctrl+Enter)
   - Wait for it to complete - you should see a summary showing policies were created

### Step 2: Verify Service Role Key (Optional but Recommended)

Check your `.env.local` file has:

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**To get the key:**
- Supabase Dashboard → Settings → API
- Copy the `service_role` key (NOT the `anon` key)
- It's very long (200+ characters), starts with `eyJ...`

**Important:**
- No quotes, no spaces around the `=`
- Must be in `.env.local` (not `.env`)
- Restart dev server after adding: `npm run dev`

### Step 3: Test the Fix

1. **Refresh your browser** (or clear cache)
2. **Go to the onboarding page** (`/onboarding`)
3. **Fill in the store details** and click "Next"
4. **The error should be gone!** ✅

## 🔍 What the SQL Script Does

The `FIX_ALL_RLS_ISSUES.sql` script:

1. **Grants table-level permissions** to `authenticated` and `service_role` on `accounts`, `account_members`, and `stores` (fixes 42501 when RLS is not the only issue)
2. **Enables RLS** on `accounts`, `account_members`, and `stores` tables
3. **Creates INSERT policies** that allow authenticated users to:
   - Create accounts (needed during signup)
   - Create account memberships (needed during signup)
   - Create stores (needed during onboarding)
3. **Creates SELECT/UPDATE policies** for proper data access control
4. **Creates helper functions** for store access

## ⚠️ Still Having Issues?

If the error persists after running the SQL script:

1. **Check the SQL ran successfully** - Look for any error messages in the SQL Editor
2. **Verify policies exist** - Run this in SQL Editor:
   ```sql
   SELECT tablename, policyname, cmd 
   FROM pg_policies 
   WHERE tablename IN ('accounts', 'account_members', 'stores')
   ORDER BY tablename, policyname;
   ```
   You should see policies for INSERT, SELECT, UPDATE operations.

3. **Check server logs** - Look at your terminal where `npm run dev` is running for any error messages

4. **Verify service role key** - Check that `SUPABASE_SERVICE_ROLE_KEY` is set and the server was restarted after adding it

## 📋 Alternative: Quick RLS Fix (If Full Script Fails)

If the full script doesn't work, try this minimal fix in SQL Editor:

```sql
-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create their own account" ON accounts;
DROP POLICY IF EXISTS "Users can create their own membership" ON account_members;

-- Create INSERT policies
CREATE POLICY "Users can create their own account"
ON accounts FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can create their own membership"
ON account_members FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
```

Then test again!
