# Supabase Database Setup Instructions

## Required Database Functions

To fix the "permission denied" error when creating accounts, you need to create a database function in Supabase.

### Step 1: Create the `create_account` RPC Function

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run the following SQL to create the function:

```sql
CREATE OR REPLACE FUNCTION create_account(
  p_business_name TEXT,
  p_owner_email TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id UUID;
  v_member_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the current authenticated user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Check if user already has an account
  SELECT account_id INTO v_account_id
  FROM account_members
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_account_id IS NOT NULL THEN
    RETURN v_account_id;
  END IF;

  -- Generate new IDs
  v_account_id := gen_random_uuid();
  v_member_id := gen_random_uuid();

  -- Create account
  INSERT INTO accounts (
    account_id,
    business_name,
    owner_email,
    plan_tier,
    subscription_status
  ) VALUES (
    v_account_id,
    p_business_name,
    p_owner_email,
    'starter',  -- Valid values: 'starter', 'core', 'scale'
    'active'
  );

  -- Link user to account
  INSERT INTO account_members (
    member_id,
    account_id,
    user_id,
    role
  ) VALUES (
    v_member_id,
    v_account_id,
    v_user_id,
    'owner'
  );

  RETURN v_account_id;
END;
$$;
```

### Step 2: Grant Execute Permission

Run this SQL to allow authenticated users to execute the function:

```sql
GRANT EXECUTE ON FUNCTION create_account(TEXT, TEXT) TO authenticated;
```

### Alternative: Update RLS Policies (Easier - Recommended if RPC doesn't work)

If the RPC function approach isn't working, you can update your RLS policies to allow direct inserts:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run the following SQL to create RLS policies:

```sql
-- Enable RLS if not already enabled
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_members ENABLE ROW LEVEL SECURITY;

-- Policy for accounts table - allow authenticated users to insert
CREATE POLICY "Users can create their own account"
ON accounts
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy for account_members table - allow users to create their own membership
CREATE POLICY "Users can create their own membership"
ON account_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
```

**Note:** 
- The RPC function approach is more secure and recommended, as it ensures proper data integrity and prevents users from creating multiple accounts.
- However, if you're having issues with the RPC function, the RLS policy approach will work and is simpler to set up.
- Make sure RLS is enabled on both tables before creating these policies.
