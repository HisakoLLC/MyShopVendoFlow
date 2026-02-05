-- Remove failed_attempts and locked_until columns from staff table
-- These are no longer needed since we use IP-based rate limiting in pin_login_attempts table

ALTER TABLE staff DROP COLUMN IF EXISTS failed_attempts;
ALTER TABLE staff DROP COLUMN IF EXISTS locked_until;

-- Note: These columns were used for per-staff rate limiting, which caused issues
-- where innocent staff would get locked out. IP-based rate limiting is more secure
-- and prevents this problem.
