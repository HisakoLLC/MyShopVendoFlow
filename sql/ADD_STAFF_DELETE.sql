-- Allow owners to delete staff for their account (fixes "Delete permanently" failing).
-- Run in Supabase SQL Editor. Requires get_user_account_ids() to include staff (run FIX_STORES_RLS_FOR_STAFF.sql if you use staff PIN login).

-- Table-level: allow authenticated to delete from staff
GRANT DELETE ON TABLE public.staff TO authenticated;
GRANT DELETE ON TABLE public.staff TO service_role;

-- RLS: owners can delete staff rows for their account (account_id from get_user_account_ids())
DROP POLICY IF EXISTS "Users can delete staff for their account" ON staff;
CREATE POLICY "Users can delete staff for their account"
ON staff FOR DELETE TO authenticated
USING (account_id IN (SELECT account_id FROM get_user_account_ids()));
