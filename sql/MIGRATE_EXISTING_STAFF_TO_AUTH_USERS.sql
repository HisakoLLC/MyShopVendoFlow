-- MIGRATION: Create auth users for existing staff members
-- Run this AFTER running MIGRATE_STAFF_AUTH_USER_ID.sql
-- This script migrates existing staff to the new individual auth user system

-- ============================================================================
-- IMPORTANT: This migration requires SUPABASE_SERVICE_ROLE_KEY
-- Run this from your application code, not SQL Editor (needs admin auth)
-- ============================================================================

-- Step 1: Check existing staff without auth_user_id
-- SELECT 
--   staff_id,
--   email,
--   first_name,
--   last_name,
--   role,
--   account_id,
--   pin_hash IS NOT NULL as has_pin
-- FROM staff
-- WHERE auth_user_id IS NULL
--   AND active = true;

-- Step 2: For each staff member, you need to:
--   1. Generate unique email: staff-{staff_id_without_dashes}@vendoflow.internal
--   2. Create auth.users with PIN as password (if pin_hash exists, you'll need to reset PIN)
--   3. Update staff.auth_user_id
--   4. Create account_members record

-- Example migration script (run from Node.js/TypeScript):
/*
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

async function migrateExistingStaff() {
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // Get all staff without auth_user_id
  const { data: staffList } = await supabaseAdmin
    .from('staff')
    .select('staff_id, email, first_name, last_name, role, account_id, pin_hash')
    .is('auth_user_id', null)
    .eq('active', true)

  for (const staff of staffList || []) {
    try {
      // Generate unique email
      const staffEmail = `staff-${staff.staff_id.replace(/-/g, '')}@vendoflow.internal`
      
      // Generate temporary PIN (owner will need to reset)
      const tempPIN = Math.floor(100000 + Math.random() * 900000).toString()
      
      // Create auth user
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: staffEmail,
        password: tempPIN,
        email_confirm: true,
        user_metadata: {
          is_staff: true,
          staff_id: staff.staff_id
        }
      })

      if (authError || !authUser.user) {
        console.error(`Failed to create auth user for ${staff.email}:`, authError)
        continue
      }

      // Update staff record
      const { error: updateError } = await supabaseAdmin
        .from('staff')
        .update({ auth_user_id: authUser.user.id })
        .eq('staff_id', staff.staff_id)

      if (updateError) {
        console.error(`Failed to update staff ${staff.email}:`, updateError)
        // Cleanup: delete auth user
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
        continue
      }

      // Create account_members record
      const { error: memberError } = await supabaseAdmin
        .from('account_members')
        .insert({
          member_id: crypto.randomUUID(),
          account_id: staff.account_id,
          user_id: authUser.user.id,
          role: staff.role
        })

      if (memberError) {
        console.error(`Failed to create account_members for ${staff.email}:`, memberError)
        // Note: Don't cleanup - staff record is already updated
      }

      console.log(`Migrated ${staff.email} (${staff.staff_id})`)
    } catch (error) {
      console.error(`Error migrating ${staff.email}:`, error)
    }
  }
}
*/

-- ============================================================================
-- Manual migration steps (if running from SQL Editor):
-- ============================================================================

-- 1. For each staff member, manually create auth user via Supabase Dashboard
--    or use the admin API from your application

-- 2. Update staff.auth_user_id:
-- UPDATE staff
-- SET auth_user_id = 'AUTH_USER_ID_HERE'
-- WHERE staff_id = 'STAFF_ID_HERE';

-- 3. Create account_members record:
-- INSERT INTO account_members (member_id, account_id, user_id, role)
-- VALUES (
--   gen_random_uuid(),
--   'ACCOUNT_ID_HERE',
--   'AUTH_USER_ID_HERE',
--   'ROLE_FROM_STAFF_TABLE'
-- );

-- ============================================================================
-- Verify migration:
-- ============================================================================
-- SELECT 
--   s.staff_id,
--   s.email,
--   s.auth_user_id IS NOT NULL as has_auth_user,
--   am.member_id IS NOT NULL as has_account_member
-- FROM staff s
-- LEFT JOIN account_members am ON am.user_id = s.auth_user_id
-- WHERE s.active = true;
