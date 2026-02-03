-- REMOVE TRIAL / 14-DAY FREE TRIAL FEATURE
-- Run this in Supabase SQL Editor to:
-- 1. Set all existing 'trial' accounts to 'active'
-- 2. Update the signup trigger to create new accounts with subscription_status = 'active' (no trial)

-- 1. Migrate existing trial accounts to active
UPDATE public.accounts
SET subscription_status = 'active'
WHERE subscription_status = 'trial';

-- 2. Update handle_new_user() so new signups get 'active' instead of 'trial'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id uuid;
  v_member_id uuid;
  v_email text;
BEGIN
  v_account_id := gen_random_uuid();
  v_member_id := gen_random_uuid();
  v_email := COALESCE(
    TRIM(NEW.email::text),
    TRIM((NEW.raw_user_meta_data->>'email')::text),
    ''
  );

  INSERT INTO public.accounts (
    account_id,
    business_name,
    owner_email,
    plan_tier,
    subscription_status
  ) VALUES (
    v_account_id,
    'My Business',
    v_email,
    NULL,
    'active'
  );

  INSERT INTO public.account_members (
    member_id,
    account_id,
    user_id,
    role
  ) VALUES (
    v_member_id,
    v_account_id,
    NEW.id,
    'owner'
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Note: trial_ends_at column is kept for account deletion (90-day purge date).
-- It is no longer used for trial end dates.
