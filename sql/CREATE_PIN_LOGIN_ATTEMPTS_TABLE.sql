-- Track PIN login attempts by IP address (rate limiting)
CREATE TABLE IF NOT EXISTS pin_login_attempts (
  ip_address INET PRIMARY KEY,
  attempt_count INTEGER DEFAULT 1,
  locked_until TIMESTAMPTZ,
  first_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  last_attempt_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_pin_attempts_locked 
ON pin_login_attempts(locked_until) 
WHERE locked_until IS NOT NULL;

-- Index for cleanup of old attempts
CREATE INDEX IF NOT EXISTS idx_pin_attempts_last_attempt 
ON pin_login_attempts(last_attempt_at);

-- Cleanup old attempts (run hourly via cron)
-- DELETE FROM pin_login_attempts 
-- WHERE last_attempt_at < NOW() - INTERVAL '1 hour' 
-- AND locked_until IS NULL;
