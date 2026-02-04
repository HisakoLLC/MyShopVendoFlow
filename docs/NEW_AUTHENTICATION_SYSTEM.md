# New Secure PIN-Only Staff Authentication System

## Overview

This document describes the new secure PIN-only authentication system for staff members. The new system eliminates session collisions, removes the need for `account_id` during login, provides proper audit trails, and stores roles securely in the database.

## Key Changes

### ✅ What's New

1. **Individual Auth Users**: Each staff member now has their own Supabase auth user
2. **PIN-Only Login**: Staff enter only their 6-digit PIN (no account_id/store_id needed)
3. **Global PIN Uniqueness**: PINs are unique across all accounts
4. **Database Role Storage**: Roles stored in `staff` table, not `user_metadata`
5. **Proper Audit Trail**: Each staff login is tracked via unique `auth.users.id`

### ❌ What's Removed

1. **Shared User System**: No more `pos-staff@vendoflow.internal` shared user
2. **bind-staff API**: No longer needed (removed `/api/auth/bind-staff`)
3. **account_id Requirement**: Staff no longer need account_id/store_id to log in
4. **user_metadata Role**: Roles now come from database queries

## Architecture

### Staff Creation Flow

When an owner creates a staff member in `/settings/staff`:

1. **Generate Unique PIN**: Uses `generateUniquePIN()` to ensure global uniqueness
2. **Create Auth User**: Creates individual Supabase auth user with:
   - Email: `staff-{staff_id}@vendoflow.internal` (internal-only)
   - Password: The 6-digit PIN
   - Metadata: `{ is_staff: true, staff_id: staff_id }`
3. **Create Staff Record**: Inserts into `staff` table with `auth_user_id`
4. **Create Account Member**: Links staff to account via `account_members` table
5. **Show PIN**: Displays PIN to owner once (never stored after display)

### PIN Login Flow

1. **Staff enters 6-digit PIN** on `/auth/pin-login`
2. **API searches globally** for matching PIN hash in `staff` table
3. **On match**:
   - Resets failed attempts
   - Records `last_login_at`
   - Generates magic link for staff's individual auth user
   - Returns sign-in link
4. **Frontend** exchanges magic link for session
5. **Redirects to POS** - middleware validates role from database

## Database Schema

### New Column: `staff.auth_user_id`

```sql
ALTER TABLE staff 
ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) UNIQUE;
```

### New Indexes

```sql
-- Ensure each staff has unique auth user
CREATE UNIQUE INDEX idx_staff_auth_user ON staff(auth_user_id) 
WHERE auth_user_id IS NOT NULL;

-- Global PIN uniqueness (prevents collisions across accounts)
CREATE UNIQUE INDEX idx_staff_pin_hash ON staff(pin_hash) 
WHERE pin_hash IS NOT NULL AND active = true;
```

## Security Features

### 1. Global PIN Uniqueness
- PINs are checked globally before assignment
- Prevents two staff (even across different accounts) from having the same PIN
- Enforced via unique index on `pin_hash`

### 2. Rate Limiting
- 3 failed attempts → 5-minute lockout
- Tracked in `staff.failed_attempts` and `staff.locked_until`
- Reset on successful login

### 3. Role from Database
- Roles stored in `staff.role` (not `user_metadata`)
- Middleware queries database for role on each request
- Prevents tampering with role in JWT

### 4. Individual Audit Trail
- Each staff has unique `auth.users.id`
- Login events tracked per staff member
- No session collisions between staff

## Migration Steps

### Step 1: Run Database Migration

```sql
-- Run in Supabase SQL Editor
-- See: sql/MIGRATE_STAFF_AUTH_USER_ID.sql
```

### Step 2: Migrate Existing Staff

For existing staff members, you need to:
1. Create individual auth users
2. Update `staff.auth_user_id`
3. Create `account_members` records

See `sql/MIGRATE_EXISTING_STAFF_TO_AUTH_USERS.sql` for migration script.

### Step 3: Deploy Code Changes

All code changes are complete. Deploy the updated application.

## API Changes

### PIN Login API (`/api/auth/pin-login`)

**Before:**
```json
POST /api/auth/pin-login
{
  "pin": "123456",
  "account_id": "uuid-here",  // Required
  "store_id": "uuid-here"      // Optional
}
```

**After:**
```json
POST /api/auth/pin-login
{
  "pin": "123456"  // Only PIN needed!
}
```

### Removed APIs

- `/api/auth/bind-staff` - No longer needed

## Middleware Changes

### Role Resolution

**Before:**
```typescript
// Role from user_metadata (tamperable)
const role = user.user_metadata?.role
```

**After:**
```typescript
// Role from database (secure)
const { data: staffRecord } = await supabase
  .from("staff")
  .select("role")
  .eq("auth_user_id", user.id)
  .single()
const role = staffRecord?.role
```

## Testing Checklist

- [ ] Staff enters only 6-digit PIN (no account_id needed)
- [ ] Login works in under 2 seconds
- [ ] Two staff can log in simultaneously without session collision
- [ ] Each staff has separate audit trail (unique auth.users.id)
- [ ] PIN brute force triggers 5-minute lockout
- [ ] Role changes in database immediately affect permissions
- [ ] Deactivated staff cannot log in
- [ ] PIN uniqueness enforced (no collisions across accounts)
- [ ] Owner can create staff and see PIN once
- [ ] Owner can reset staff PIN

## Troubleshooting

### Staff Cannot Log In

1. Check `staff.active = true`
2. Verify `staff.auth_user_id` is set
3. Check `staff.pin_hash` exists
4. Verify auth user exists in `auth.users`

### PIN Already Exists Error

- This means PIN collision occurred during generation
- System retries up to 10 times
- If still fails, check database for duplicate `pin_hash` values

### Role Not Working

- Verify `staff.role` is set correctly in database
- Check middleware is querying `staff` table (not `user_metadata`)
- Ensure `account_members.role` matches `staff.role`

## Files Changed

### Core Authentication
- `lib/auth/pin-auth.ts` - Added `generateUniquePIN()`
- `app/api/auth/pin-login/route.ts` - Complete rewrite
- `app/auth/pin-login/page.tsx` - Removed account_id requirement
- `app/auth/callback/page.tsx` - Simplified (no staff_id/account_id params)
- `middleware.ts` - Role from database, not user_metadata

### Staff Management
- `app/settings/staff/actions.ts` - Creates individual auth users
- `app/settings/staff/page.tsx` - Updated owner check

### POS
- `app/pos/page.tsx` - Removed bind-staff logic

### Deleted Files
- `app/api/auth/bind-staff/route.ts` - No longer needed
- `app/pos/BindStaffThenPOS.tsx` - No longer needed

### Database Migrations
- `sql/MIGRATE_STAFF_AUTH_USER_ID.sql` - Adds auth_user_id column
- `sql/MIGRATE_EXISTING_STAFF_TO_AUTH_USERS.sql` - Migration script

## Benefits

1. **Better UX**: Staff only need PIN, no account context
2. **More Secure**: Roles in database, not tamperable JWT
3. **No Collisions**: Individual auth users prevent session conflicts
4. **Audit Trail**: Each staff login tracked separately
5. **Simpler Code**: No bind-staff logic, cleaner flow
