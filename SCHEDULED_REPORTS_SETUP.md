# Scheduled Reports Setup Guide

This guide will help you configure the scheduled email reports feature so that reports are automatically sent at the scheduled times.

## Prerequisites

Before proceeding, make sure you have:
1. **Supabase Project URL** - Found in your Supabase project settings
2. **Service Role Key** - Found in Supabase Project Settings > API > Service Role Key (keep this secret!)
3. **Resend API Key** - For sending emails (sign up at https://resend.com if needed)

## Step 1: Configure Environment Variables

### For Edge Function (Resend Email)

1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions** > **Settings** (or Project Settings > Edge Functions)
3. Add the following secret:
   - **Name**: `RESEND_API_KEY`
   - **Value**: Your Resend API key

## Step 2: Configure Database Settings for Cron Job

The cron job needs to know your Supabase URL and service role key to trigger the edge function.

### Option A: Using Supabase SQL Editor (Recommended)

1. Open your Supabase project
2. Go to the **SQL Editor**
3. Run the following SQL commands (replace with your actual values):

```sql
-- Set your Supabase project URL
ALTER DATABASE postgres SET app.supabase_url = 'https://your-project-ref.supabase.co';

-- Set your service role key (keep this secret!)
ALTER DATABASE postgres SET app.supabase_service_role_key = 'your-service-role-key-here';
```

**Important:** Replace:
- `your-project-ref` with your actual Supabase project reference (found in Project Settings > General > Reference ID)
- `your-service-role-key-here` with your actual service role key (found in Project Settings > API)

### Example:
```sql
ALTER DATABASE postgres SET app.supabase_url = 'https://abcdefghijklmnop.supabase.co';
ALTER DATABASE postgres SET app.supabase_service_role_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

## Step 3: Verify Configuration

After configuring the database settings, verify everything is set up correctly:

```sql
-- Test the configuration
SELECT * FROM public.test_scheduled_reports_trigger();
```

You should see:
- `status`: "success"
- `message`: "Configuration is valid"
- `url_configured`: true
- `key_configured`: true

If you see any `false` values, recheck your configuration in Step 2.

## Step 4: Check Cron Job Status

Verify the cron job is scheduled:

```sql
-- View the cron job
SELECT * FROM cron.job WHERE jobname = 'send-scheduled-reports';
```

You should see a job scheduled to run every 5 minutes (`*/5 * * * *`).

## Step 5: Monitor Cron Job Execution

### View Recent Cron Job Runs

```sql
SELECT
  start_time,
  end_time,
  status,
  return_message,
  (end_time - start_time) as duration
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-scheduled-reports')
ORDER BY start_time DESC
LIMIT 10;
```

### Use Diagnostic Functions

```sql
-- System health check
SELECT * FROM public.diagnose_scheduled_reports();

-- View upcoming scheduled reports
SELECT * FROM public.show_upcoming_reports();

-- View recent cron runs
SELECT * FROM public.show_recent_cron_runs();
```

## Step 6: Manual Testing

### Test Individual User's Reports

You can manually trigger a test report for a specific user:

1. In the application UI, go to the Reports page
2. Select a person
3. Subscribe to daily reports and set a time
4. Click "Send Test Now" button

### Test via SQL

```sql
-- Manually trigger the edge function
SELECT public.trigger_scheduled_reports();
```

Or test via HTTP:

```bash
curl -X POST 'https://your-project-ref.supabase.co/functions/v1/send-scheduled-report' \
  -H "Authorization: Bearer your-service-role-key" \
  -H "Content-Type: application/json" \
  -d '{"test": true, "userId": "user-uuid-here"}'
```

## Troubleshooting

### Reports Not Being Sent

**Check 1: Verify Database Configuration**
```sql
SELECT * FROM public.test_scheduled_reports_trigger();
```

**Check 2: Verify Active Subscriptions**
```sql
SELECT * FROM report_subscriptions WHERE is_active = true;
```

**Check 3: Check Edge Function Logs**
1. Go to Supabase Dashboard > Edge Functions
2. Select `send-scheduled-report`
3. View the Logs tab for any errors

**Check 4: Verify Cron Job is Running**
```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-scheduled-reports')
ORDER BY start_time DESC LIMIT 5;
```

### Common Issues

1. **"Settings not configured" error**
   - Run the ALTER DATABASE commands in Step 2

2. **"No email found" error**
   - Ensure users have email addresses in their profiles
   - Check: `SELECT email FROM profiles WHERE id = 'user-id'`

3. **Resend API errors**
   - Verify RESEND_API_KEY is set in Edge Function secrets
   - Check your Resend account has credits and verified domains

4. **Wrong timezone / time not matching**
   - This is now fixed! The frontend automatically converts between local time and UTC
   - When you save 2 PM local time, it's stored as UTC in the database
   - When you refresh, it should display 2 PM again (your local time)

## How It Works

1. **User schedules a report** at 2:00 PM local time via the UI
2. **Frontend converts** 2:00 PM local → UTC time (e.g., 18:00 UTC if you're in Asia/Kolkata, UTC+5:30)
3. **Stored in database** as `18:00:00` in the `schedule_time` column (TIME type, UTC)
4. **Cron job runs** every 5 minutes and calls the edge function
5. **Edge function checks** if current UTC time matches any scheduled times (±30 min window)
6. **If matched**, collects data and sends email via Resend
7. **Email delivered** to the user's email address

## Time Format Notes

The scheduled time is stored as `TIME` type in UTC format (HH:MM:SS). This is appropriate for daily recurring events. The frontend handles all timezone conversions automatically:

- **When saving**: Local time → UTC
- **When displaying**: UTC → Local time

You'll always see your local time in the UI, even though it's stored as UTC in the database.

## Next Steps

After configuration:
1. Create a test subscription in the UI
2. Wait for the next cron cycle (max 5 minutes)
3. Check your email for the report
4. Monitor the logs using the diagnostic functions above

## Support

If you encounter issues:
1. Check the Edge Function logs in Supabase Dashboard
2. Run diagnostic queries from Step 5
3. Verify all environment variables are set correctly
