-- Diagnostic query to check PIN login setup
-- Run this in Supabase SQL Editor to diagnose PIN login issues

-- 1. Check if staff members have PIN hashes and auth_user_id
SELECT 
  staff_id,
  email,
  first_name,
  last_name,
  role,
  active,
  pin_hash IS NOT NULL as has_pin_hash,
  auth_user_id IS NOT NULL as has_auth_user_id,
  last_login_at
FROM staff
ORDER BY created_at DESC
LIMIT 20;

-- 2. Count active staff with complete PIN setup
SELECT 
  COUNT(*) as total_staff,
  COUNT(*) FILTER (WHERE active = true) as active_staff,
  COUNT(*) FILTER (WHERE active = true AND pin_hash IS NOT NULL) as active_with_pin_hash,
  COUNT(*) FILTER (WHERE active = true AND auth_user_id IS NOT NULL) as active_with_auth_user,
  COUNT(*) FILTER (WHERE active = true AND pin_hash IS NOT NULL AND auth_user_id IS NOT NULL) as ready_for_pin_login
FROM staff;

-- 3. Check if auth users exist for staff
SELECT 
  s.staff_id,
  s.email as staff_email,
  s.auth_user_id,
  au.email as auth_email,
  au.email_confirmed_at IS NOT NULL as email_confirmed
FROM staff s
LEFT JOIN auth.users au ON s.auth_user_id = au.id
WHERE s.active = true
ORDER BY s.created_at DESC
LIMIT 20;

-- 4. Check pin_login_attempts table (for rate limiting)
SELECT 
  ip_address,
  attempt_count,
  locked_until,
  last_attempt_at
FROM pin_login_attempts
ORDER BY last_attempt_at DESC
LIMIT 10;
