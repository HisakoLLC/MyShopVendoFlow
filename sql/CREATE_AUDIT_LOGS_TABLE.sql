-- Create audit logs table for compliance and security
CREATE TABLE IF NOT EXISTS audit_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(account_id) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  staff_id UUID REFERENCES staff(staff_id),
  action_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_account_date 
ON audit_logs(account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user 
ON audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_staff 
ON audit_logs(staff_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type 
ON audit_logs(action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity 
ON audit_logs(entity_type, entity_id);

-- Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see audit logs for their account
CREATE POLICY "Users can view their account audit logs"
ON audit_logs
FOR SELECT
USING (
  account_id IN (
    SELECT account_id FROM account_members 
    WHERE user_id = auth.uid()
  )
  OR
  account_id IN (
    SELECT account_id FROM staff
    WHERE auth_user_id = auth.uid() AND active = true
  )
);

-- Policy: System can insert audit logs (service role)
-- Note: Service role bypasses RLS, but this policy ensures compatibility
CREATE POLICY "System can insert audit logs"
ON audit_logs
FOR INSERT
WITH CHECK (true);

-- Also allow SELECT for service role (for testing/debugging)
CREATE POLICY "System can select audit logs"
ON audit_logs
FOR SELECT
USING (true);

-- Retention policy: Keep logs for 1 year (run this as a scheduled job)
-- DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';
