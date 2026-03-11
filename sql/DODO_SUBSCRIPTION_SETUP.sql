-- ============================================
-- DODO PAYMENTS SUBSCRIPTION SETUP
-- ============================================

-- Add Dodo Payments columns to accounts table
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS dodo_customer_id TEXT,
ADD COLUMN IF NOT EXISTS dodo_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_current_period_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_payment_amount NUMERIC,
ADD COLUMN IF NOT EXISTS next_payment_date TIMESTAMPTZ;

-- Indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_accounts_dodo_customer_id 
  ON accounts(dodo_customer_id);

CREATE INDEX IF NOT EXISTS idx_accounts_dodo_subscription_id 
  ON accounts(dodo_subscription_id);

CREATE INDEX IF NOT EXISTS idx_accounts_next_payment_date 
  ON accounts(next_payment_date) 
  WHERE subscription_status = 'active';

-- Subscription events table (audit trail)
CREATE TABLE IF NOT EXISTS subscription_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(account_id) NOT NULL,
  event_type TEXT NOT NULL, -- 'subscription_created', 'payment_succeeded', etc.
  dodo_event_id TEXT,
  subscription_id TEXT,
  amount NUMERIC,
  currency TEXT DEFAULT 'KES',
  status TEXT,
  event_data JSONB, -- Store full webhook payload
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_account_id 
  ON subscription_events(account_id);

CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at 
  ON subscription_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_events_type 
  ON subscription_events(event_type);

-- Verification query
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'accounts'
  AND (column_name LIKE '%dodo%' OR column_name LIKE '%subscription%')
ORDER BY ordinal_position;

SELECT '✅ Dodo subscription schema ready' AS status;

