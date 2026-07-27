# Cron Job Setup Guide for Scheduled Reports

## Problem

The scheduled reports cron job needs to trigger the edge function, but requires proper configuration to work.

## Solution Steps

### Step 1: Apply the New Migration

```bash
# Push the migration to Supabase
supabase db push
```

Or manually run the migration file in Supabase SQL Editor:
- File: `supabase/migrations/20251218130000_fix_scheduled_reports_trigger.sql`

### Step 2: Configure Database Settings

In your **Supabase Dashboard → SQL Editor**, run these commands:

```sql
-- Replace with your actual values
ALTER DATABASE postgres SET app.supabase_url = 'https://your-project-ref.supabase.co';
ALTER DATABASE postgres SET app.supabase_service_role_key = 'eyJhbGc...your-service-role-key';
```

**How to find these values:**

1. **Supabase URL**: Go to Project Settings → API → Project URL
2. **Service Role Key**: Go to Project Settings → API → service_role key (under "Project API keys")

⚠️ **IMPORTANT**: The service_role key is sensitive! Never commit it to git.

### Step 3: Test the Configuration

```sql
-- Test if settings are configured correctly
SELECT * FROM public.test_scheduled_reports_trigger();
```

**Expected Output:**
```
status    | message                      | url_configured | key_configured
----------|------------------------------|----------------|---------------
success   | Configuration is valid       | true           | true
```

### Step 4: Manually Trigger the Function (Test)

```sql
-- This will trigger the edge function immediately
SELECT public.trigger_scheduled_reports();
```

**Check the output:**
- Should show NOTICE messages about the trigger
- Should show the HTTP response status (200 = success)

### Step 5: Verify the Cron Job is Running

```sql
-- View the cron job
SELECT * FROM cron.job WHERE jobname = 'send-scheduled-reports';
```

**Expected Output:**
```
jobid | schedule    | command                                      | active
------|-------------|----------------------------------------------|-------
1     | */5 * * * * | SELECT public.trigger_scheduled_reports();   | true
```

### Step 6: Monitor Cron Job Execution

```sql
-- View recent cron job runs
SELECT
  jobid,
  runid,
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-scheduled-reports')
ORDER BY start_time DESC
LIMIT 10;
```

### Step 7: Check Edge Function Logs

1. Go to **Supabase Dashboard → Edge Functions**
2. Click on **send-scheduled-report**
3. Click on **Logs** tab
4. You should see execution logs every 5 minutes

---

## Alternative Method: Direct Edge Function Invocation

If the HTTP approach isn't working, here's an alternative using Supabase's native edge function invocation:

### Create Alternative Trigger Function

```sql
-- This approach uses Supabase's built-in edge function invocation
CREATE OR REPLACE FUNCTION public.trigger_scheduled_reports_v2()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  subscription_record RECORD;
  current_utc_time TIME;
  schedule_time_utc TIME;
  minute_diff INTEGER;
BEGIN
  -- Get current UTC time
  current_utc_time := (NOW() AT TIME ZONE 'UTC')::TIME;

  RAISE NOTICE 'Checking for subscriptions due at UTC time: %', current_utc_time;

  -- Find subscriptions that are due now
  FOR subscription_record IN
    SELECT
      rs.*,
      ep.full_name as person_name,
      p.email as user_email
    FROM report_subscriptions rs
    INNER JOIN elderly_persons ep ON ep.id = rs.elderly_person_id
    INNER JOIN profiles p ON p.id = rs.user_id
    WHERE rs.is_active = true
      AND rs.report_type = 'daily_summary'
  LOOP
    -- Parse schedule time
    schedule_time_utc := subscription_record.schedule_time;

    -- Calculate minute difference
    minute_diff := ABS(
      EXTRACT(EPOCH FROM (current_utc_time - schedule_time_utc)) / 60
    )::INTEGER;

    -- Handle day boundary
    IF minute_diff > 720 THEN
      minute_diff := 1440 - minute_diff;
    END IF;

    -- If within 5 minute window, log it
    IF minute_diff <= 5 THEN
      RAISE NOTICE 'Subscription % is due: % for % (user: %)',
        subscription_record.id,
        schedule_time_utc,
        subscription_record.person_name,
        subscription_record.user_email;

      -- Here you would trigger the report sending
      -- For now, just log that we found a match
    END IF;
  END LOOP;
END;
$$;

-- Update cron job to use new function
SELECT cron.unschedule('send-scheduled-reports');
SELECT cron.schedule(
  'send-scheduled-reports',
  '*/5 * * * *',
  'SELECT public.trigger_scheduled_reports_v2();'
);
```

---

## Troubleshooting

### Issue 1: "Settings not configured" error

**Solution**: Run the ALTER DATABASE commands from Step 2.

```sql
-- Check current settings
SELECT current_setting('app.supabase_url', true);
SELECT current_setting('app.supabase_service_role_key', true);

-- If NULL, configure them
ALTER DATABASE postgres SET app.supabase_url = 'your-url';
ALTER DATABASE postgres SET app.supabase_service_role_key = 'your-key';

-- Reconnect to database for changes to take effect
```

### Issue 2: Cron job not appearing

**Solution**: Ensure pg_cron extension is enabled.

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant permissions
GRANT USAGE ON SCHEMA cron TO postgres;

-- Re-run the schedule command
SELECT cron.schedule(
  'send-scheduled-reports',
  '*/5 * * * *',
  'SELECT public.trigger_scheduled_reports();'
);
```

### Issue 3: HTTP extension errors

**Solution**: Ensure http extension is properly installed.

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Test HTTP extension
SELECT status, content
FROM extensions.http((
  'GET',
  'https://httpbin.org/status/200',
  ARRAY[]::extensions.http_header[],
  NULL,
  NULL
)::extensions.http_request);
```

### Issue 4: Edge function not being called

**Solution**: Check edge function directly via curl.

```bash
# Replace with your values
curl -X POST https://your-project.supabase.co/functions/v1/send-scheduled-report \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

If this works but the cron doesn't, the issue is with the trigger function.

### Issue 5: Cron job runs but no reports sent

**Possible causes:**

1. **No subscriptions match current time**
   ```sql
   -- Check active subscriptions
   SELECT id, schedule_time, timezone, is_active
   FROM report_subscriptions
   WHERE is_active = true;

   -- Check current UTC time
   SELECT (NOW() AT TIME ZONE 'UTC')::TIME as current_utc_time;
   ```

2. **Time window mismatch**
   - Cron runs every 5 minutes
   - Edge function checks ±30 minute window
   - If subscription time is outside window, it won't trigger

3. **Edge function error**
   - Check Edge Function logs in Supabase Dashboard
   - Look for errors in the execution logs

---

## Testing Checklist

- [ ] Database settings configured (Step 2)
- [ ] Test function returns success (Step 3)
- [ ] Manual trigger works (Step 4)
- [ ] Cron job is active (Step 5)
- [ ] Cron job executions appear in logs (Step 6)
- [ ] Edge function logs show executions (Step 7)
- [ ] Test report can be sent via frontend "Send Test Now" button
- [ ] Actual scheduled report is sent at correct time

---

## Monitoring Commands

```sql
-- Quick status check
SELECT
  'Cron Job' as component,
  jobname,
  active,
  schedule
FROM cron.job
WHERE jobname = 'send-scheduled-reports'

UNION ALL

SELECT
  'Settings' as component,
  'app.supabase_url' as jobname,
  (current_setting('app.supabase_url', true) IS NOT NULL)::text::boolean as active,
  current_setting('app.supabase_url', true) as schedule

UNION ALL

SELECT
  'Settings' as component,
  'app.supabase_service_role_key' as jobname,
  (current_setting('app.supabase_service_role_key', true) IS NOT NULL)::text::boolean as active,
  'configured' as schedule;

-- Last 5 cron runs
SELECT
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-scheduled-reports')
ORDER BY start_time DESC
LIMIT 5;
```

---

## Production Recommendations

1. **Monitor cron job health**: Set up alerts for failed cron executions
2. **Log retention**: Edge function logs are retained for 7 days
3. **Scaling**: Current setup handles hundreds of subscriptions; for thousands, consider batching
4. **Timezone DST**: Current UTC storage handles DST automatically
5. **Backup trigger**: Consider a backup daily trigger for missed reports

---

## Need Help?

If you're still having issues:

1. Run the diagnostic command above and share the output
2. Check Supabase Edge Function logs for errors
3. Verify your subscription schedule times are in UTC format
4. Ensure user emails are valid in the profiles table
