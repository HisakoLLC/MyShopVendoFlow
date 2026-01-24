# Complete Fix: Permission Denied + Account Not Created

## 🚨 Your Problems

1. ❌ "Permission denied" errors everywhere
2. ❌ Account not created during signup (no records in `accounts` or `account_members`)
3. ❌ Onboarding shows "Account not found"

## ✅ Root Causes

1. **RLS policies are blocking operations** - Even with service role key, conflicting policies can cause issues
2. **Service role key might not be set** - Required for account creation during signup
3. **Policies might be conflicting** - Multiple policies on same table can conflict

## 🔧 Complete Fix (15 minutes)

### Step 1: Fix RLS Policies (CRITICAL)

1. Go to **Supabase Dashboard → SQL Editor**
2. Copy **entire contents** of `sql/FIX_ALL_RLS_ISSUES.sql`
3. Click **Run**
4. Wait for completion - should show summary of policies created

**This will:**
- Reset all RLS policies for `accounts`, `account_members`, `stores`
- Create proper policies that allow account creation
- Create helper function for stores

### Step 2: Set Service Role Key (CRITICAL)

**Check `.env.local` file exists and has:**

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Get the key:**
1. Supabase Dashboard → Settings → API
2. Find `service_role` key (NOT `anon` key)
3. Copy entire key (very long, starts with `eyJ...`)
4. Add to `.env.local`:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

**Important:**
- No quotes, no spaces
- Must be in `.env.local` (not `.env`)
- Restart dev server: `npm run dev`

### Step 3: Verify get_account_id() Function Exists

Run in Supabase SQL Editor:

```sql
-- Check if function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_account_id';
```

If it doesn't exist, run `sql/FIX_GET_ACCOUNT_ID.sql`

### Step 4: Test Signup

1. **Clear browser cache** or use incognito
2. **Sign up with a new email**
3. **Check browser console** (F12) - should see:
   ```
   Calling createAccountAfterSignup with: { userId: "...", ... }
   Creating account: { accountId: "...", ... }
   Account created successfully: ...
   Creating account_members record: { ... }
   Account member created successfully: ...
   ```

4. **Check terminal** (where `npm run dev` is running) - should see same logs

### Step 5: Verify Database

Run in Supabase SQL Editor:

```sql
-- Check latest account
SELECT 
    account_id,
    business_name,
    owner_email,
    created_at
FROM accounts 
ORDER BY created_at DESC 
LIMIT 1;

-- Check latest account_members
SELECT 
    member_id,
    user_id,
    account_id,
    role,
    created_at
FROM account_members 
ORDER BY created_at DESC 
LIMIT 1;
```

**Both should show your new records!**

### Step 6: Test Onboarding

1. After signup, should redirect to `/onboarding`
2. Step 1: Create store - should work ✅
3. Step 2: Add categories - should work ✅
4. Step 3: Choose plan - should work ✅

## 🔍 If Still Not Working

### Diagnostic 1: Check Service Role Key

In your terminal (where `npm run dev` is running), you should see logs when signing up. If you see:
- "Service role key not configured" → Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`
- "Failed to create account: permission denied" → Service role key is wrong or RLS is still blocking

### Diagnostic 2: Run Diagnostic Script

Run `sql/DIAGNOSE_RLS_ISSUES.sql` to see:
- Which tables have RLS enabled
- What policies exist
- If there are conflicts

### Diagnostic 3: Check Browser Console

1. Open DevTools (F12) → Console
2. Try signing up
3. Look for error messages
4. Share the exact error message

### Diagnostic 4: Check Server Logs

In terminal where `npm run dev` is running, look for:
- "Creating account:" log
- Any error messages
- "Account created successfully:" log

## 🎯 Expected Flow After Fix

1. **User signs up:**
   - Auth user created ✅
   - Server action called with service role key ✅
   - Account created in `accounts` table ✅
   - Membership created in `account_members` table ✅
   - Redirects to `/onboarding` ✅

2. **Onboarding Step 1:**
   - Calls `get_account_id()` ✅
   - Returns account_id ✅
   - Creates store ✅
   - No "Account not found" error ✅

3. **Database:**
   - `accounts` table has record ✅
   - `account_members` table has record ✅
   - `stores` table has record (after Step 1) ✅

## ⚠️ Common Mistakes

1. **Not restarting dev server** after adding env var
2. **Using `anon` key instead of `service_role` key**
3. **Extra spaces/quotes in env var**
4. **Running SQL scripts in wrong order**
5. **Not running the complete `FIX_ALL_RLS_ISSUES.sql` script**

## 📋 Final Checklist

- [ ] Run `sql/FIX_ALL_RLS_ISSUES.sql` ✅
- [ ] `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` ✅
- [ ] Dev server restarted ✅
- [ ] `get_account_id()` function exists ✅
- [ ] Test signup - check console logs ✅
- [ ] Verify database has records ✅
- [ ] Test onboarding - all steps work ✅

---

**After these fixes, everything should work automatically!** The account creation is automated - you don't need to manually create records. 🎉
