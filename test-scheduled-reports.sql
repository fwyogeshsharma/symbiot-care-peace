-- ============================================
-- Scheduled Reports Testing & Verification
-- ============================================
-- Run these queries in order to test and verify
-- the scheduled reports feature
-- ============================================

-- 1. CHECK CONFIGURATION
-- ============================================
-- This should return status='success' with both flags true
SELECT * FROM public.test_scheduled_reports_trigger();

-- Expected output:
-- status: "success"
-- message: "Configuration is valid"
-- url_configured: true
-- key_configured: true


-- 2. SYSTEM HEALTH CHECK
-- ============================================
SELECT * FROM public.diagnose_scheduled_reports();


-- 3. VIEW ACTIVE SUBSCRIPTIONS
-- ============================================
-- Check if there are any active report subscriptions
SELECT
  id,
  user_id,
  elderly_person_id,
  report_type,
  schedule_time AS schedule_time_utc,
  timezone AS user_timezone,
  is_active,
  created_at,
  updated_at
FROM report_subscriptions
WHERE is_active = true
ORDER BY schedule_time;


-- 4. VIEW UPCOMING REPORTS
-- ============================================
-- See when reports are scheduled to be sent
SELECT * FROM public.show_upcoming_reports();


-- 5. CHECK CRON JOB STATUS
-- ============================================
-- Verify the cron job exists and is active
SELECT
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job
WHERE jobname = 'send-scheduled-reports';

-- Expected:
-- schedule: */5 * * * * (every 5 minutes)
-- active: true


-- 6. VIEW RECENT CRON EXECUTIONS
-- ============================================
-- Check if the cron job has been running
SELECT
  runid,
  jobid,
  start_time,
  end_time,
  status,
  return_message,
  (end_time - start_time) as duration
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-scheduled-reports')
ORDER BY start_time DESC
LIMIT 20;


-- 7. MANUALLY TRIGGER THE EDGE FUNCTION (TEST)
-- ============================================
-- This will trigger the send-scheduled-report function immediately
-- It will check all active subscriptions and send reports if within time window
SELECT public.trigger_scheduled_reports();


-- 8. VIEW USER EMAILS (for debugging)
-- ============================================
-- Check if users have valid email addresses
SELECT
  p.id,
  p.email,
  p.full_name,
  rs.schedule_time as report_time_utc,
  rs.timezone as user_timezone,
  rs.is_active
FROM profiles p
INNER JOIN report_subscriptions rs ON rs.user_id = p.id
WHERE rs.is_active = true;


-- 9. TEST TIME CONVERSION
-- ============================================
-- Test if a specific time would trigger now
-- Replace '14:00:00' with a time you want to test
DO $$
DECLARE
  test_schedule_time TIME := '14:00:00';  -- UTC time
  current_utc_time TIME;
  schedule_hour INT;
  schedule_minute INT;
  current_hour INT;
  current_minute INT;
  schedule_total_minutes INT;
  current_total_minutes INT;
  minute_diff INT;
BEGIN
  current_utc_time := (NOW() AT TIME ZONE 'UTC')::TIME;

  schedule_hour := EXTRACT(HOUR FROM test_schedule_time);
  schedule_minute := EXTRACT(MINUTE FROM test_schedule_time);
  current_hour := EXTRACT(HOUR FROM current_utc_time);
  current_minute := EXTRACT(MINUTE FROM current_utc_time);

  schedule_total_minutes := schedule_hour * 60 + schedule_minute;
  current_total_minutes := current_hour * 60 + current_minute;
  minute_diff := ABS(current_total_minutes - schedule_total_minutes);

  -- Handle day boundary
  IF minute_diff > 720 THEN
    minute_diff := 1440 - minute_diff;
  END IF;

  RAISE NOTICE 'Current UTC time: %', current_utc_time;
  RAISE NOTICE 'Test schedule time: %', test_schedule_time;
  RAISE NOTICE 'Minute difference: %', minute_diff;
  RAISE NOTICE 'Within 30-minute window: %', (minute_diff <= 30);
END $$;


-- 10. CREATE A TEST SUBSCRIPTION (if needed)
-- ============================================
-- Uncomment and modify the values below to create a test subscription
/*
INSERT INTO report_subscriptions (
  user_id,
  elderly_person_id,
  report_type,
  schedule_time,
  timezone,
  is_active
) VALUES (
  'your-user-id-here',        -- Replace with actual user UUID
  'elderly-person-id-here',   -- Replace with actual elderly person UUID
  'daily_summary',
  '14:00:00',                 -- UTC time (e.g., 14:00 UTC = 7:30 PM IST)
  'Asia/Kolkata',             -- Your timezone
  true
);
*/


-- 11. VIEW DIAGNOSTIC LOGS
-- ============================================
-- If you have logging enabled, check recent logs
SELECT * FROM public.show_recent_cron_runs();


-- 12. CLEAN UP TEST DATA (optional)
-- ============================================
-- Uncomment to delete test subscriptions
/*
DELETE FROM report_subscriptions
WHERE user_id = 'test-user-id';
*/


-- ============================================
-- TROUBLESHOOTING CHECKLIST
-- ============================================
-- If reports are not being sent, verify:
-- [ ] Database settings configured (query #1 returns success)
-- [ ] RESEND_API_KEY is set in Edge Function secrets
-- [ ] Active subscriptions exist (query #3 shows rows)
-- [ ] Cron job is active (query #5 shows active=true)
-- [ ] Cron job is running (query #6 shows recent executions)
-- [ ] Users have valid email addresses (query #8)
-- [ ] Edge function logs show no errors (check Supabase Dashboard)
-- [ ] Schedule time is within ±30 minutes of current UTC time


-- ============================================
-- QUICK TEST PROCEDURE
-- ============================================
-- 1. Run queries 1-3 to verify setup
-- 2. Create a subscription with schedule_time = current UTC time + 2 minutes
-- 3. Wait 2-7 minutes (cron runs every 5 minutes)
-- 4. Check email inbox for report
-- 5. Run query #6 to see if cron executed
-- 6. Check Edge Function logs in Supabase Dashboard


-- ============================================
-- TIMEZONE REFERENCE
-- ============================================
-- Common timezone conversions:
-- If your local time is 2:00 PM (14:00):
-- - Asia/Kolkata (UTC+5:30): 14:00 local = 08:30 UTC
-- - America/New_York (UTC-5): 14:00 local = 19:00 UTC
-- - Europe/London (UTC+0): 14:00 local = 14:00 UTC
-- - Asia/Tokyo (UTC+9): 14:00 local = 05:00 UTC
--
-- Use this to calculate what UTC time to expect in the database
