-- Add last_login_at to staff so we can show when each staff member last signed in via PIN.
-- Run in Supabase SQL Editor.

ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS last_login_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.staff.last_login_at IS 'Set on successful PIN login (pin-login API).';
