-- =============================================================================
-- FIX: permission denied for pin_login_attempts and audit_logs
-- Run this entire script in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- =============================================================================

-- 1) pin_login_attempts: ensure RLS policies exist and grant access
-- -----------------------------------------------------------------------------
ALTER TABLE pin_login_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage pin_login_attempts" ON pin_login_attempts;
DROP POLICY IF EXISTS "System can insert pin_login_attempts" ON pin_login_attempts;
DROP POLICY IF EXISTS "System can update pin_login_attempts" ON pin_login_attempts;
DROP POLICY IF EXISTS "System can delete pin_login_attempts" ON pin_login_attempts;
DROP POLICY IF EXISTS "System can select pin_login_attempts" ON pin_login_attempts;

CREATE POLICY "System can insert pin_login_attempts"
ON pin_login_attempts FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update pin_login_attempts"
ON pin_login_attempts FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "System can delete pin_login_attempts"
ON pin_login_attempts FOR DELETE USING (true);

CREATE POLICY "System can select pin_login_attempts"
ON pin_login_attempts FOR SELECT USING (true);

GRANT ALL ON TABLE pin_login_attempts TO service_role;
GRANT ALL ON TABLE pin_login_attempts TO authenticated;


-- 2) audit_logs: ensure INSERT policy is correct (not SELECT) and grant access
-- -----------------------------------------------------------------------------
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can select audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can view their account audit logs" ON audit_logs;

CREATE POLICY "System can insert audit logs"
ON audit_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their account audit logs"
ON audit_logs FOR SELECT
USING (
  account_id IN (SELECT account_id FROM account_members WHERE user_id = auth.uid())
  OR
  account_id IN (SELECT account_id FROM staff WHERE auth_user_id = auth.uid() AND active = true)
);

GRANT ALL ON TABLE audit_logs TO service_role;
GRANT ALL ON TABLE audit_logs TO authenticated;
GRANT SELECT ON TABLE audit_logs TO anon;


-- 3) Verify
-- -----------------------------------------------------------------------------
SELECT 'pin_login_attempts policies:' AS step;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'pin_login_attempts';

SELECT 'audit_logs policies:' AS step;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'audit_logs';
