-- Add has_demo_data column to accounts table
-- This tracks whether an account has been populated with demo data

ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS has_demo_data BOOLEAN DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN accounts.has_demo_data IS 'Indicates if account has been populated with demo data for onboarding';
