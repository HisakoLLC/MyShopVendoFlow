# Troubleshooting: Signup Still Failing After Policies Are Set

## ✅ Good News: Policies Are Created!

Your verification shows all policies exist:
- ✅ `accounts` INSERT policy
- ✅ `accounts` SELECT policy  
- ✅ `accounts` UPDATE policy
- ✅ `account_members` INSERT policy
- ✅ `account_members` SELECT policy
- ✅ `account_members` UPDATE policy

## 🔍 Why It Might Still Fail

Even with policies in place, signup can fail due to:

### Issue 1: Auth Session Not Established Yet

**Problem:** The auth user is created, but the session cookies aren't set when the server action runs.

**Solution:** Add a small delay or ensure the session is established.

### Issue 2: Server Action Not Getting Auth Context

**Problem:** The server action might not be receiving the authenticated user's context.

**Solution:** Verify the server action can access `auth.uid()`.

## 🛠️ Diagnostic Steps

### Step 1: Check If User Is Authenticated in Server Action

Add this to `app/signup/actions.ts` temporarily to debug:

```typescript
export async function createAccountAfterSignup(
  userId: string,
  businessName: string,
  ownerEmail: string
) {
  const supabase = await createServerSupabaseClient()
  
  // DEBUG: Check if we can get the user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  console.log("DEBUG - User in server action:", user?.id, "Error:", userError)
  console.log("DEBUG - Passed userId:", userId)
  
  // ... rest of the function
}
```

### Step 2: Verify Auth User Was Created

In Supabase SQL Editor, run:

```sql
-- Check if auth user exists
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;
```

### Step 3: Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Try signing up
4. Look for any errors or warnings

### Step 4: Check Network Tab

1. Open browser DevTools → Network tab
2. Try signing up
3. Look for the API call to create account
4. Check the response - what error does it show?

## 🔧 Potential Fixes

### Fix 1: Ensure Session Is Set Before Server Action

The signup page should wait for the session to be established. Check if `app/signup/page.tsx` does this:

```typescript
// After signup, wait for session
const { data: { session } } = await supabase.auth.getSession()
if (!session) {
  // Wait a bit and retry
  await new Promise(resolve => setTimeout(resolve, 500))
}
```

### Fix 2: Use Service Role Key for Account Creation (Not Recommended for Production)

If the issue persists, you could temporarily use the service role key in the server action, but this bypasses RLS and is less secure.

### Fix 3: Check RLS Is Actually Enabled

Run this to verify:

```sql
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('accounts', 'account_members');
```

Both should show `true` for `rls_enabled`.

### Fix 4: Check for Conflicting Policies

Sometimes multiple policies can conflict. Check if there are duplicate policies:

```sql
SELECT 
    tablename,
    policyname,
    cmd,
    COUNT(*) as count
FROM pg_policies
WHERE tablename IN ('accounts', 'account_members')
GROUP BY tablename, policyname, cmd
HAVING COUNT(*) > 1;
```

If this returns rows, you have duplicate policies that need to be dropped.

## 🎯 Quick Test

Try this in Supabase SQL Editor to test if INSERT works manually:

```sql
-- First, get your user ID
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 1;

-- Then try to insert (replace USER_ID with actual ID from above)
-- This simulates what the server action does
SET LOCAL request.jwt.claim.sub = 'YOUR_USER_ID_HERE';

INSERT INTO accounts (account_id, business_name, owner_email, plan_tier, subscription_status)
VALUES (
  gen_random_uuid(),
  'Test Business',
  'test@example.com',
  'starter',
  'trial'
);
```

If this fails, the issue is with RLS. If it succeeds, the issue is with the server action not getting auth context.

## 📋 Complete Checklist

- [ ] Policies exist (✅ confirmed from your output)
- [ ] RLS is enabled on both tables
- [ ] No duplicate policies
- [ ] Auth user is created successfully
- [ ] Session is established before server action runs
- [ ] Server action can access `auth.uid()`
- [ ] Browser console shows no errors
- [ ] Network tab shows the actual error response

## 🚨 Most Likely Issue

Based on the policies existing, the most likely issue is:

**The server action is running before the auth session is fully established.**

The signup flow:
1. Creates auth user ✅
2. Immediately calls server action ❌ (session might not be ready)
3. Server action tries to insert → fails because `auth.uid()` is null

**Solution:** Add a small delay or ensure session is ready before calling the server action.

---

**Next Step:** Check the browser console and network tab to see the exact error message. That will tell us what's really happening.
