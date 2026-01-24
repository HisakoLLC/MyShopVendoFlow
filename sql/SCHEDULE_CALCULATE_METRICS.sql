-- Schedule the calculate-metrics Edge Function to run nightly at 2 AM UTC
-- Run this in Supabase Dashboard → SQL Editor
--
-- IMPORTANT: Replace 'YOUR_ANON_KEY' below with your actual anon key from:
-- Dashboard → Project Settings → API → anon/public key

-- First, ensure pg_cron and pg_net extensions are enabled
-- (These should already be enabled, but this ensures they are)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the function to run daily at 2:00 AM UTC
-- Cron expression: 0 2 * * * (minute hour day month weekday)
-- This will call the Edge Function via HTTP POST
--
-- NOTE: Replace 'YOUR_ANON_KEY' with your actual anon key from Project Settings → API
-- The anon key is safe to use here as the function uses SERVICE_ROLE_KEY internally

SELECT cron.schedule(
  'calculate-variant-metrics-nightly',  -- Job name (unique identifier)
  '0 2 * * *',                          -- Cron: Every day at 2:00 AM UTC
  $$
  SELECT net.http_post(
    url := 'https://gipmbcmzmbddavelbayk.supabase.co/functions/v1/calculate-metrics',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY'  -- REPLACE THIS with your anon key
    ),
    body := jsonb_build_object(),
    timeout_milliseconds := 300000  -- 5 minutes timeout (function may take time for large datasets)
  ) as request_id;
  $$
);

-- Verify the schedule was created
SELECT * FROM cron.job WHERE jobname = 'calculate-variant-metrics-nightly';

-- To view all scheduled jobs:
-- SELECT * FROM cron.job;

-- To view job execution history:
-- SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'calculate-variant-metrics-nightly');

-- To unschedule/delete the job later:
-- SELECT cron.unschedule('calculate-variant-metrics-nightly');
