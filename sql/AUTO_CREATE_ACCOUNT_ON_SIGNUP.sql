-- AUTO-CREATE ACCOUNT ON SIGNUP
-- Run this once in Supabase SQL Editor. Every new user will get an account + membership
-- automatically, so get_account_id() will never return null for new users.
-- No manual linking or app env vars required.

-- ============================================================================
-- 1. Function: create account + account_members when a new auth user is inserted
-- ============================================================================
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
  -- Get email: NEW.email or from raw_user_meta_data (Supabase sometimes puts it there)
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
    'trial'
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
    -- Log but don't block auth user creation
    RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. Trigger: run after each insert on auth.users
-- ============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 3. Ensure get_account_id() exists (so dashboard works)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_account_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT account_id INTO v_account_id
  FROM public.account_members
  WHERE user_id = v_user_id
  LIMIT 1;
  RETURN v_account_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_account_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_account_id() TO service_role;

-- ============================================================================
-- 4. Backfill existing users (run once if you have users who signed up before
--    the trigger existed; each gets their own account)
-- ============================================================================
DO $$
DECLARE
  r RECORD;
  v_account_id uuid;
  v_member_id uuid;
BEGIN
  FOR r IN
    SELECT u.id AS user_id, COALESCE(TRIM(u.email::text), '') AS email
    FROM auth.users u
    WHERE NOT EXISTS (SELECT 1 FROM public.account_members am WHERE am.user_id = u.id)
  LOOP
    v_account_id := gen_random_uuid();
    v_member_id := gen_random_uuid();
    INSERT INTO public.accounts (account_id, business_name, owner_email, plan_tier, subscription_status)
    VALUES (v_account_id, 'My Business', r.email, NULL, 'trial');
    INSERT INTO public.account_members (member_id, account_id, user_id, role)
    VALUES (v_member_id, v_account_id, r.user_id, 'owner');
    RAISE NOTICE 'Created account for user %', r.user_id;
  END LOOP;
END $$;
