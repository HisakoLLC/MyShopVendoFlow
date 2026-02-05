# Fix PIN Login and Staff Creation Issues

## Problems Identified

1. **PIN Reset Issue**: When PIN is reset, if the auth user password update fails silently, the PIN hash in the database gets updated but the password doesn't, causing login to fail even though PIN verification succeeds.

2. **Staff Creation Error**: Server Components render error occurs after staff creation, even though staff is created successfully.

3. **Audit Logs Empty**: Audit logging might be failing silently, preventing events from being recorded.

## Fixes Applied

### 1. PIN Reset - Ensure Password Update Success

**File**: `app/settings/staff/actions.ts`

**Change**: Made password update failure throw an error instead of silently failing.

```typescript
// Before: Silent failure
await supabaseAdmin.auth.admin.updateUserById(staffRow.auth_user_id, {
  password: newPIN,
}).catch(() => {
  console.error("Failed to update auth user password")
})

// After: Fail loudly if password update fails
const { error: passwordUpdateError } = await supabaseAdmin.auth.admin.updateUserById(staffRow.auth_user_id, {
  password: newPIN,
})

if (passwordUpdateError) {
  throw new Error(`Failed to update staff password: ${passwordUpdateError.message}. PIN reset incomplete.`)
}
```

**Why**: If the password update fails, PIN login will fail because:
- PIN hash verification succeeds (hash was updated)
- But `signInWithPassword` fails (password wasn't updated)

### 2. Staff Creation - Non-Blocking Audit Logging

**File**: `app/settings/staff/actions.ts`

**Change**: Made audit logging non-blocking to prevent it from causing render errors.

```typescript
// Before: Blocking await
await logAuditEvent({ ... })

// After: Non-blocking
logAuditEvent({ ... }).catch((err) => {
  console.error("Audit log error (non-blocking):", err)
})
```

**Why**: Audit logging failures shouldn't prevent staff creation or cause render errors.

### 3. Improved Error Handling

- Added better error messages for PIN reset failures
- Made audit logging completely non-blocking
- Ensured revalidation happens properly

## Testing Checklist

After deployment, test:

1. **Create New Staff**:
   - [ ] Create a new staff member
   - [ ] Verify PIN is displayed without errors
   - [ ] Verify staff appears in list immediately
   - [ ] Verify no Server Components render error

2. **Reset PIN**:
   - [ ] Reset PIN for existing staff
   - [ ] Verify PIN is displayed
   - [ ] Verify login works with new PIN immediately
   - [ ] Verify error if password update fails

3. **PIN Login**:
   - [ ] Login with PIN for newly created staff
   - [ ] Login with PIN for staff with reset PIN
   - [ ] Verify audit logs are being written
   - [ ] Check Vercel logs for `[PIN Login]` messages

## Diagnostic Queries

Run these in Supabase SQL Editor to verify:

```sql
-- Check if staff have auth_user_id and PIN hash
SELECT 
  staff_id,
  email,
  pin_hash IS NOT NULL as has_pin_hash,
  auth_user_id IS NOT NULL as has_auth_user_id
FROM staff
WHERE active = true;

-- Check audit logs
SELECT 
  action_type,
  COUNT(*) as count
FROM audit_logs
GROUP BY action_type
ORDER BY count DESC;
```

## Common Issues

### PIN Login Fails Even With Correct PIN

**Possible Causes**:
1. PIN hash updated but auth user password wasn't (fixed in this update)
2. Staff doesn't have `auth_user_id` (run migration)
3. Staff is inactive
4. IP is locked (check `pin_login_attempts` table)

**Solution**: Check Vercel function logs for `[PIN Login]` messages to see where it fails.

### Staff Creation Shows Error But Staff Is Created

**Possible Causes**:
1. Audit logging failure causing render error (fixed - now non-blocking)
2. Revalidation issue (should be fixed)

**Solution**: Staff should now be created without errors. If error persists, check server logs.

### Audit Logs Empty

**Possible Causes**:
1. `audit_logs` table doesn't exist (run `CREATE_AUDIT_LOGS_TABLE.sql`)
2. Audit logging is failing silently (check server logs)
3. No events have been triggered yet

**Solution**: Check server logs for audit log errors. The logging is now non-blocking, so it won't break functionality.
