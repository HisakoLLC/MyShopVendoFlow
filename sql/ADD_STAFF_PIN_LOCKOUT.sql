-- Add PIN lockout columns to staff table (wrong PIN 3 times = lock 5 minutes)
-- Run in Supabase SQL Editor

ALTER TABLE staff
ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until timestamptz;

COMMENT ON COLUMN staff.failed_attempts IS 'Count of failed PIN attempts; reset on success';
COMMENT ON COLUMN staff.locked_until IS 'Lock PIN login until this time (e.g. after 3 failed attempts)';
