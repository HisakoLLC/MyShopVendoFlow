-- FIX_STAFF_RLS_SELF_ACCESS.sql
-- ============================================================================
-- Fix: Cashiers/managers must be able to read their own staff row (role + assigned_store_id)
-- without reintroducing infinite recursion in staff policies.
--
-- This keeps staff management owner-only, but allows:
--   - authenticated staff users to SELECT their OWN staff row (auth_user_id = auth.uid()).
--
-- Run in Supabase SQL Editor.
-- ============================================================================

BEGIN;

-- Drop prior staff policies (safe to re-run)
DROP POLICY IF EXISTS "noncashier_select_staff" ON public.staff;
DROP POLICY IF EXISTS "noncashier_insert_staff" ON public.staff;
DROP POLICY IF EXISTS "noncashier_update_staff" ON public.staff;
DROP POLICY IF EXISTS "noncashier_delete_staff" ON public.staff;

DROP POLICY IF EXISTS "owner_select_staff" ON public.staff;
DROP POLICY IF EXISTS "owner_insert_staff" ON public.staff;
DROP POLICY IF EXISTS "owner_update_staff" ON public.staff;
DROP POLICY IF EXISTS "owner_delete_staff" ON public.staff;

DROP POLICY IF EXISTS "self_select_staff" ON public.staff;

-- Owners can read/manage all staff in their account (joins to account_members; no recursion)
CREATE POLICY "owner_select_staff"
ON public.staff
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.account_members am
    WHERE am.account_id = public.staff.account_id
      AND am.user_id = auth.uid()
      AND am.role = 'owner'
  )
);

CREATE POLICY "owner_insert_staff"
ON public.staff
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.account_members am
    WHERE am.account_id = public.staff.account_id
      AND am.user_id = auth.uid()
      AND am.role = 'owner'
  )
);

CREATE POLICY "owner_update_staff"
ON public.staff
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.account_members am
    WHERE am.account_id = public.staff.account_id
      AND am.user_id = auth.uid()
      AND am.role = 'owner'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.account_members am
    WHERE am.account_id = public.staff.account_id
      AND am.user_id = auth.uid()
      AND am.role = 'owner'
  )
);

CREATE POLICY "owner_delete_staff"
ON public.staff
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.account_members am
    WHERE am.account_id = public.staff.account_id
      AND am.user_id = auth.uid()
      AND am.role = 'owner'
  )
);

-- Staff can read their own row (needed for POS store assignment + role resolution).
-- No get_account_id(), and no subquery on staff -> avoids recursion.
CREATE POLICY "self_select_staff"
ON public.staff
FOR SELECT
TO authenticated
USING (public.staff.auth_user_id = auth.uid());

COMMIT;

SELECT '✅ staff RLS updated: owners manage all; staff can read self' AS status;

