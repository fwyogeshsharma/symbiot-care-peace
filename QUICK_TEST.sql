-- ============================================
-- QUICK TEST & SETUP FOR SCHEDULED REPORTS
-- ============================================
-- Copy and paste these commands into Supabase SQL Editor

-- STEP 1: Configure database settings (REQUIRED - UPDATE WITH YOUR VALUES!)
-- ========================================================================
-- Get these values from: Project Settings → API
ALTER DATABASE postgres SET app.supabase_url = 'https://your-project-ref.supabase.co';
ALTER DATABASE postgres SET app.supabase_service_role_key = 'eyJhbGc...your-service-role-key-here';

-- STEP 2: Run diagnostics
-- ========================================================================
SELECT * FROM public.diagnose_scheduled_reports();

-- Expected output: All checks should show "PASSED"
-- If any show "FAILED", follow the action_needed instructions

-- STEP 3: Test the configuration
-- ========================================================================
SELECT * FROM public.test_scheduled_reports_trigger();

-- Expected: status = 'success', both configured columns = true

-- STEP 4: View active subscriptions and when they'll trigger
-- ========================================================================
SELECT * FROM public.show_upcoming_reports();

-- This shows all active subscriptions and when they'll next run

-- STEP 5: Manually trigger the cron function (TEST)
-- ========================================================================
SELECT public.trigger_scheduled_reports();

-- Check the NOTICE messages in the output
-- Should show: "Triggered send-scheduled-report function, status: 200"

-- STEP 6: Check recent cron runs
-- ========================================================================
SELECT * FROM public.show_recent_cron_runs();

-- Shows last 20 cron job executions

-- STEP 7: View the cron job configuration
-- ========================================================================
SELECT
  jobname,
  schedule,
  command,
  active,
  jobid
FROM cron.job
WHERE jobname = 'send-scheduled-reports';

-- Expected: active = true, schedule = '*/5 * * * *'

-- STEP 8: Check current UTC time
-- ========================================================================
SELECT
  NOW() AT TIME ZONE 'UTC' as current_utc_timestamp,
  (NOW() AT TIME ZONE 'UTC')::TIME as current_utc_time;

-- Compare this with your subscription schedule_time values

-- STEP 9: View all active subscriptions with times
-- ========================================================================
SELECT
  rs.id,
  ep.full_name as person,
  p.email as user_email,
  rs.schedule_time as schedule_utc,
  rs.timezone as user_tz,
  rs.is_active,
  rs.created_at
FROM report_subscriptions rs
INNER JOIN elderly_persons ep ON ep.id = rs.elderly_person_id
INNER JOIN profiles p ON p.id = rs.user_id
WHERE rs.is_active = true
ORDER BY rs.schedule_time;

-- ============================================
-- TROUBLESHOOTING COMMANDS
-- ============================================

-- If cron job is missing, recreate it:
/*
SELECT cron.schedule(
  'send-scheduled-reports',
  '*/5 * * * *',
  'SELECT public.trigger_scheduled_reports();'
);
*/

-- To disable the cron job temporarily:
/*
SELECT cron.unschedule('send-scheduled-reports');
*/

-- To test edge function directly (replace with your values):
/*
-- This requires curl or similar HTTP client
curl -X POST https://your-project.supabase.co/functions/v1/send-scheduled-report \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
*/

-- View PostgreSQL logs (if available):
/*
SELECT * FROM pg_stat_statements WHERE query LIKE '%trigger_scheduled_reports%';
*/

-- ============================================
-- MANUAL TESTING WITH A SPECIFIC USER
-- ============================================

-- Send test report to a specific user (replace USER_ID):
/*
-- This calls the edge function in test mode
-- Use your frontend "Send Test Now" button or call the edge function:

{
  "test": true,
  "userId": "your-user-id-here"
}
*/
