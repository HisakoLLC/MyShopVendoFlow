# Quick Fix: "Permission denied for table stores" Error

## 🚨 Problem

You're seeing the error: **"permission denied for table stores"** when trying to create a store during onboarding.

## ✅ Solution (5 minutes)

### Step 1: Run the Quick Fix SQL Script

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the entire contents of `sql/FIX_STORES_PERMISSION_NOW.sql`
4. Click **Run**

This will:
- Enable RLS on the stores table
- Create a helper function to bypass RLS circular dependencies
- Create all necessary policies for the stores table

### Step 2: Verify Your Account Setup

After running the SQL, verify you have an account:

1. In Supabase SQL Editor, run this query:

```sql
SELECT 
    am.member_id,
    am.user_id,
    am.account_id,
    am.role,
    a.business_name
FROM account_members am
JOIN accounts a ON am.account_id = a.account_id
WHERE am.user_id = auth.uid();
```

2. If this returns **no rows**, you need to:
   - Sign up again, OR
   - Manually create the account_members record

### Step 3: Test Onboarding Again

1. Refresh your browser
2. Try creating a store again in the onboarding flow
3. The error should be gone!

## 🔍 Why This Happened

The error occurs because:
1. **RLS (Row Level Security) is enabled** on the stores table
2. **No policies exist** to allow authenticated users to insert stores
3. The policies need to check if the user belongs to an account via `account_members`

## 📋 Complete Database Setup (Recommended)

If you haven't run the full database setup yet, you should run these scripts **in order**:

1. `sql/SETUP_ALL_RLS.sql` - Sets up RLS for all tables
2. `sql/FIX_GET_ACCOUNT_ID.sql` - Creates the `get_account_id()` function
3. `sql/FIX_PLAN_TIER.sql` - Creates the `create_account()` function
4. `scripts/ADD_HAS_DEMO_DATA_COLUMN.sql` - Adds demo data tracking
5. `sql/FIX_STORES_PERMISSION_NOW.sql` - Fixes stores permissions (or use SETUP_ALL_RLS.sql which includes this)

## ⚠️ Still Having Issues?

If the error persists after running the fix:

1. **Check if you're authenticated:**
   - Make sure you're logged in
   - Check browser console for auth errors

2. **Check if account_members record exists:**
   ```sql
   SELECT * FROM account_members WHERE user_id = auth.uid();
   ```
   - If empty, you need to complete signup first

3. **Check if get_account_id() function works:**
   ```sql
   SELECT get_account_id();
   ```
   - Should return your account_id UUID
   - If it errors, run `sql/FIX_GET_ACCOUNT_ID.sql`

4. **Verify RLS policies exist:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'stores';
   ```
   - Should show 4 policies (SELECT, INSERT, UPDATE, DELETE)

## 🎯 Next Steps

Once this is fixed:
1. Complete the onboarding flow
2. Continue with the rest of the database setup
3. Test all features
4. Deploy to production

---

**Need more help?** Check `DATABASE_SETUP.md` for the complete setup guide.
