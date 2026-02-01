# Troubleshooting: Add Staff, PIN Login, Sign Up, Onboarding

## "duplicate key value violates unique constraint accounts_owner_email_key" on onboarding

**What it means:** An account with your email as `owner_email` already exists (e.g. from signup), but the app tried to create another one.

**What we fixed:** Onboarding now:
- Looks up an existing account by `owner_email` if you don’t have an `account_members` row yet, and links you to that account instead of creating a new one.
- If an insert fails with code `23505` (unique violation), it finds the existing account and links you to it.

**What to do:** Refresh the onboarding page and click **Next** again on Step 1. You should be linked to your existing account and can continue.

## "An error occurred in the Server Components render" when adding staff

**What we fixed:** The staff page now uses safe serialization and `router.refresh()` instead of a full reload after creating staff, so the server component should not throw.

**If you still see it:**
- Hard-refresh the page (Ctrl+F5 or Cmd+Shift+R) and try adding staff again.
- Ensure you're on the latest deploy; the fix is in the staff page and add-staff flow.

---

## "Sign-in failed. Use the PIN you were given..." (PIN login)

This means the app **found** the staff by PIN but **Supabase Auth** rejected the sign-in (email + PIN as password).

**Fix:**
1. In **Settings → Staff**, click the **key (PIN)** icon for that staff member.
2. Click **Reset PIN** and complete the flow.
3. **Use the new PIN** shown (and share it with the staff). The app now updates both the staff PIN and the Auth password when you reset.

If it still fails after a reset, check that `SUPABASE_SERVICE_ROLE_KEY` is set in your environment (e.g. Vercel) so the reset can update the Auth user's password.

---

## Can't sign up

**Common causes:**

1. **Signup disabled in Supabase**  
   Supabase Dashboard → Authentication → Providers → Email → enable "Confirm email" if you want, but ensure signup is allowed.

2. **Missing or wrong env vars**  
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be set.  
   - For account creation after signup, `SUPABASE_SERVICE_ROLE_KEY` must be set (see `docs/FIX_ONBOARDING_NOW.md`).

3. **RLS / permissions**  
   If you see "Permission denied" when creating the account, run the SQL in `sql/FIX_ALL_RLS_ISSUES.sql` in the Supabase SQL Editor (see `docs/FIX_ONBOARDING_NOW.md`).

4. **Invalid service role key**  
   The service role key must be the long JWT from Supabase Dashboard → Settings → API → **service_role** (not the anon key). If it’s too short or wrong, signup can fail when creating the account.

---

## Account deletion: data export and permanent purge

**Customer asks for their data (data request / export):**  
Run **`sql/EXPORT_ACCOUNT_DATA.sql`** in the Supabase SQL Editor. Replace every `'YOUR_ACCOUNT_ID_HERE'` with the account's UUID (from `accounts` where `owner_email = '…'` or from `account_members`). Run each `SELECT` and export the results (e.g. Download as CSV). Storage (logos, product images) must be exported separately from the Storage buckets.

**Permanently delete all data for an account (after 90 days or when authorized):**  
Run **`sql/PURGE_ACCOUNT_DATA.sql`** in the Supabase SQL Editor. Replace every `'YOUR_ACCOUNT_ID_HERE'` with the account's UUID. Run the whole script. This deletes all rows for that account in the correct order. It does **not** delete Auth users or Storage files; do those separately if required.
