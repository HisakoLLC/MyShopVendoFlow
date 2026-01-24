# Fix: Account Not Created + Permission Denied Everywhere

## 🚨 Problem

1. Signup succeeds but no records in `accounts` or `account_members` tables
2. "Permission denied" errors everywhere
3. Onboarding shows "Account not found"

## ✅ Root Cause

**Two issues:**
1. RLS policies are blocking account creation
2. Service role key might not be set or server action isn't using it properly

## 🔧 Fix (10 minutes)

### Step 1: Fix RLS Policies

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste **entire contents** of `sql/FIX_ALL_RLS_ISSUES.sql`
3. Click **Run**
4. Wait for it to complete (should show "Policies created" summary)

This will:
- Reset all RLS policies for `accounts`, `account_members`, and `stores`
- Create proper policies that allow account creation during signup
- Create helper function for stores

### Step 2: Verify Service Role Key

**Check `.env.local` file:**

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Get it from:**
- Supabase Dashboard → Settings → API
- Copy the `service_role` key (NOT `anon` key)
- It's very long, starts with `eyJ...`

**Important:** 
- Must be in `.env.local` (not `.env` or `.env.example`)
- No quotes, no spaces
- Restart dev server after adding: `npm run dev`

### Step 3: Test Account Creation

1. **Clear browser cache** or use incognito
2. **Sign up with a new email**
3. **Check browser console** (F12) - should see:
   ```
   Calling createAccountAfterSignup with: { userId: "...", ... }
   Creating account: { accountId: "...", ... }
   Account created successfully: ...
   ```

4. **Verify in database:**
   ```sql
   -- Should show your new account
   SELECT * FROM accounts ORDER BY created_at DESC LIMIT 1;
   
   -- Should show your new membership
   SELECT * FROM account_members ORDER BY created_at DESC LIMIT 1;
   ```

### Step 4: Test Onboarding

1. After signup, you should be redirected to `/onboarding`
2. Step 1: Create store - should work ✅
3. Step 2: Add categories - should work ✅
4. Step 3: Choose plan - should work ✅

## 🔍 Diagnostic

If still not working, run `sql/DIAGNOSE_RLS_ISSUES.sql` to see what's blocking.

## ⚠️ Common Issues

### Issue 1: Service Role Key Not Set

**Symptom:** Browser console shows "Service role key not configured"

**Fix:** Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` and restart server

### Issue 2: Service Role Key Wrong

**Symptom:** "Failed to create account: permission denied"

**Fix:** 
1. Double-check the key in Supabase Dashboard
2. Make sure you copied the entire key (it's very long)
3. No extra spaces or quotes

### Issue 3: RLS Still Blocking

**Symptom:** Account creation fails even with service role key

**Fix:**
1. Run `sql/FIX_ALL_RLS_ISSUES.sql` again
2. Check for conflicting policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'accounts';
   ```
3. Should only see 3 policies: INSERT, SELECT, UPDATE

### Issue 4: Tables Don't Exist

**Symptom:** "relation does not exist" error

**Fix:** You need to create the database schema first. Check if tables exist:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('accounts', 'account_members');
```

## 🎯 Expected Behavior After Fix

1. **Signup:**
   - User fills form → clicks "Create Account"
   - Auth user created ✅
   - Account created in `accounts` table ✅
   - Membership created in `account_members` table ✅
   - Redirects to `/onboarding` ✅

2. **Onboarding:**
   - Step 1: Create store - works ✅
   - Step 2: Add categories - works ✅
   - Step 3: Choose plan - works ✅
   - Redirects to `/dashboard` ✅

3. **Database:**
   - `accounts` table has new record ✅
   - `account_members` table has new record ✅
   - `stores` table has new record (after Step 1) ✅

## 📋 Checklist

- [ ] Run `sql/FIX_ALL_RLS_ISSUES.sql` ✅
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set in `.env.local` ✅
- [ ] Dev server restarted after adding env var ✅
- [ ] Test signup - check browser console for logs ✅
- [ ] Verify records in database ✅
- [ ] Test onboarding - all 3 steps work ✅

---

**After these fixes, account creation should be automated and work correctly!** 🎉
