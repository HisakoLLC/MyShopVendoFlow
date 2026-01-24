-- Create table for pending M-Pesa payments
-- This table stores STK Push requests while waiting for customer confirmation

CREATE TABLE IF NOT EXISTS pending_mpesa_payments (
  checkout_request_id TEXT PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES sales(sale_id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed
  mpesa_receipt_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pending_mpesa_sale_id ON pending_mpesa_payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_pending_mpesa_status ON pending_mpesa_payments(status);

-- Add RLS policies (if RLS is enabled)
-- Allow authenticated users to read/write their own account's pending payments
-- This assumes you have account_id in sales table or can join through stores

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON pending_mpesa_payments TO authenticated;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_pending_mpesa_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pending_mpesa_payments_updated_at
  BEFORE UPDATE ON pending_mpesa_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_mpesa_updated_at();
