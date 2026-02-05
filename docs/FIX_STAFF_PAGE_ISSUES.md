# Fix Staff Page Issues

## Problems Reported
1. Can't add new staff
2. Can't delete staff  
3. Can't log in with generated PIN

## Root Causes

### 1. PIN Login Issue (FIXED)
**Problem:** Admin client `signInWithPassword()` doesn't create user sessions properly.

**Fix Applied:** Changed to use `admin.generateLink()` with type 'magiclink' to extract tokens from `linkData.properties`.

**Status:** ✅ Fixed in commit `b01ff5a`

### 2. Database Migrations Not Run
**Problem:** The new tables (`audit_logs`, `pin_login_attempts`) don't exist, and old columns (`failed_attempts`, `locked_until`) may still exist.

**Solution:** Run these SQL migrations in Supabase SQL Editor (in order):

1. **CREATE_AUDIT_LOGS_TABLE.sql**
   ```sql
   -- Creates audit_logs table for compliance logging
   -- Run: sql/CREATE_AUDIT_LOGS_TABLE.sql
   ```

2. **CREATE_PIN_LOGIN_ATTEMPTS_TABLE.sql**
   ```sql
   -- Creates pin_login_attempts table for IP-based rate limiting
   -- Run: sql/CREATE_PIN_LOGIN_ATTEMPTS_TABLE.sql
   ```

3. **REMOVE_STAFF_FAILED_ATTEMPTS_COLUMNS.sql** (if columns exist)
   ```sql
   -- Removes old failed_attempts and locked_until columns
   -- Run: sql/REMOVE_STAFF_FAILED_ATTEMPTS_COLUMNS.sql
   ```

### 3. Staff Creation May Fail If Audit Logging Fails
**Problem:** If `audit_logs` table doesn't exist, staff creation will fail when trying to log the event.

**Fix:** The audit logger has error handling (never throws), but if the table doesn't exist, the insert will fail silently. Run the audit logs migration first.

## Troubleshooting Steps

### Step 1: Check Database Tables
Run in Supabase SQL Editor:
```sql
-- Check if audit_logs exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'audit_logs'
);

-- Check if pin_login_attempts exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'pin_login_attempts'
);

-- Check if failed_attempts column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'staff' 
AND column_name IN ('failed_attempts', 'locked_until');
```

### Step 2: Run Missing Migrations
If tables/columns are missing, run the SQL files in order:
1. `sql/CREATE_AUDIT_LOGS_TABLE.sql`
2. `sql/CREATE_PIN_LOGIN_ATTEMPTS_TABLE.sql`
3. `sql/REMOVE_STAFF_FAILED_ATTEMPTS_COLUMNS.sql` (if columns exist)

### Step 3: Test Staff Creation
1. Go to `/settings/staff`
2. Click "Add Staff Member"
3. Fill in the form and check "Generate PIN"
4. Click "Create Staff Member"
5. Check browser console for errors
6. Check Supabase logs for database errors

### Step 4: Test PIN Login
1. Copy the generated PIN
2. Go to `/auth/pin-login`
3. Enter the 6-digit PIN
4. Should redirect to `/pos` on success

### Step 5: Test Delete Staff
1. Go to `/settings/staff`
2. Click delete icon on a staff member
3. Confirm deletion
4. Check for errors

## Common Errors

### Error: "relation 'audit_logs' does not exist"
**Solution:** Run `sql/CREATE_AUDIT_LOGS_TABLE.sql`

### Error: "relation 'pin_login_attempts' does not exist"
**Solution:** Run `sql/CREATE_PIN_LOGIN_ATTEMPTS_TABLE.sql`

### Error: "column 'failed_attempts' does not exist"
**Solution:** The column was already removed. This is fine - the code no longer uses it.

### Error: "Failed to create sign-in session"
**Solution:** Check Supabase service role key is set correctly in environment variables.

### Error: "Authentication failed" during PIN login
**Solution:** 
1. Verify the PIN was generated correctly
2. Check that `auth_user_id` is set on the staff record
3. Verify the auth user exists in `auth.users`
4. Check Supabase logs for auth errors

## Verification Checklist

After running migrations, verify:
- ✅ `audit_logs` table exists
- ✅ `pin_login_attempts` table exists  
- ✅ `staff.failed_attempts` column removed (if it existed)
- ✅ `staff.locked_until` column removed (if it existed)
- ✅ Can create new staff member
- ✅ PIN is generated and displayed
- ✅ Can log in with generated PIN
- ✅ Can delete staff member
- ✅ Audit logs are created for staff actions

## Next Steps

1. Run the SQL migrations in Supabase
2. Test staff creation
3. Test PIN login
4. Test staff deletion
5. Check audit_logs table for entries

If issues persist after running migrations, check:
- Browser console for client-side errors
- Supabase logs for server-side errors
- Network tab for API errors
