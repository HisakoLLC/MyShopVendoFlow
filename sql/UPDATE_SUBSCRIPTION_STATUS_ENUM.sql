-- ============================================
-- EXPAND SUBSCRIPTION STATUS VALUES
-- ============================================

-- Drop existing constraint
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_subscription_status_check;

-- Add new constraint with all possible values
ALTER TABLE accounts
ADD CONSTRAINT accounts_subscription_status_check CHECK (
  subscription_status IN (
    'trial',                -- Free trial period
    'pending',              -- Checkout created, awaiting payment
    'active',               -- Subscription active and paid
    'past_due',             -- Payment failed, in grace period
    'cancelling',           -- Cancellation requested, awaiting Dodo confirmation
    'cancelled',            -- Subscription cancelled
    'expired',              -- Subscription expired (not renewed)
    'pending_plan_change'   -- User changing plans, awaiting new subscription activation
  )
);

-- Verify
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'accounts_subscription_status_check';

SELECT '✅ Subscription status enum updated' AS status;
