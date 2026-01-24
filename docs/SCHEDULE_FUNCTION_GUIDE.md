# How to Schedule the calculate-metrics Edge Function

Since you don't have the Supabase CLI installed, here are two ways to schedule your Edge Function to run nightly.

## Method 1: Using SQL (pg_cron) - Recommended

This is the most reliable method and gives you full control.

### Step 1: Get Your Anon Key

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `gipmbcmzmbddavelbayk`
3. Navigate to **Project Settings** → **API**
4. Find the **anon/public** key (it starts with `eyJ...`)
5. Copy the entire key

### Step 2: Run the SQL Script

1. Go to **SQL Editor** in your Supabase Dashboard
2. Open the file `SCHEDULE_CALCULATE_METRICS.sql`
3. **Replace `YOUR_ANON_KEY`** with the anon key you copied in Step 1
4. Click **Run** to execute the script

The script will:
- Enable `pg_cron` and `pg_net` extensions (if not already enabled)
- Schedule the function to run daily at 2:00 AM UTC
- Show you the created schedule

### Step 3: Verify It's Scheduled

After running the script, you should see output showing the job was created. You can also verify by running:

```sql
SELECT * FROM cron.job WHERE jobname = 'calculate-variant-metrics-nightly';
```

### View Execution History

To see when the function has run:

```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (
  SELECT jobid FROM cron.job 
  WHERE jobname = 'calculate-variant-metrics-nightly'
)
ORDER BY start_time DESC;
```

---

## Method 2: Using Supabase Dashboard (If Available)

Some Supabase projects have a visual Cron Jobs interface:

1. Go to **Integrations** → **Cron** → **Jobs** in your Dashboard
2. Click **Create job**
3. Fill in:
   - **Name**: `calculate-variant-metrics-nightly`
   - **Schedule**: `0 2 * * *` (or use the visual scheduler)
   - **Job Type**: **Supabase Edge Function**
   - **Function**: `calculate-metrics`
   - **HTTP Method**: `POST`
4. Click **Create**

---

## Adjusting the Schedule

### Change Time

To run at a different time, modify the cron expression in the SQL:

- `0 2 * * *` - 2:00 AM UTC daily (current)
- `0 0 * * *` - Midnight UTC daily
- `0 14 * * *` - 2:00 PM UTC daily
- `0 2 * * 0` - 2:00 AM UTC every Sunday

### Cron Format

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
* * * * *
```

### Time Zone Note

Cron jobs run in **UTC**. If you want it to run at 2 AM in your local timezone:
- EST (UTC-5): Use `0 7 * * *` (7 AM UTC = 2 AM EST)
- PST (UTC-8): Use `0 10 * * *` (10 AM UTC = 2 AM PST)

---

## Troubleshooting

### Job Not Running

1. **Check if pg_cron is enabled:**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. **Check job status:**
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'calculate-variant-metrics-nightly';
   ```

3. **Check execution logs:**
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'calculate-variant-metrics-nightly')
   ORDER BY start_time DESC
   LIMIT 10;
   ```

4. **Check Edge Function logs:**
   - Go to **Edge Functions** → **calculate-metrics** → **Logs**
   - Look for entries around the scheduled time

### Remove/Unschedule the Job

To remove the scheduled job:

```sql
SELECT cron.unschedule('calculate-variant-metrics-nightly');
```

---

## Testing the Schedule

To test immediately without waiting for the scheduled time:

1. **Manual Invoke via Dashboard:**
   - Go to **Edge Functions** → **calculate-metrics**
   - Click **Invoke** or **Test**
   - Check the response

2. **Manual Invoke via SQL:**
   ```sql
   SELECT net.http_post(
     url := 'https://gipmbcmzmbddavelbayk.supabase.co/functions/v1/calculate-metrics',
     headers := jsonb_build_object(
       'Content-Type', 'application/json',
       'Authorization', 'Bearer YOUR_ANON_KEY'
     ),
     body := jsonb_build_object(),
     timeout_milliseconds := 300000
   ) as request_id;
   ```

---

## Next Steps

Once scheduled, the function will:
- Run automatically every night at 2 AM UTC
- Calculate metrics for all product variants
- Update the `variant_metrics` table
- Log execution details in Edge Function logs

You can monitor it in:
- **Edge Functions** → **calculate-metrics** → **Logs**
- **SQL Editor** → Run the "View Execution History" query above
