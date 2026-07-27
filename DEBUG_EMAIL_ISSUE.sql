-- ============================================
-- DEBUG: Why emails are not being triggered
-- ============================================

-- Step 1: Check if database settings are configured
SELECT 'STEP 1: Database Settings' as debug_step;
SELECT
  current_setting('app.supabase_url', true) as supabase_url,
  CASE
    WHEN current_setting('app.supabase_service_role_key', true) IS NOT NULL
    THEN 'CONFIGURED (hidden for security)'
    ELSE 'NOT CONFIGURED'
  END as service_role_key_status;

-- Step 2: Check active subscriptions with ALL required data
SELECT 'STEP 2: Active Subscriptions Detail' as debug_step;
SELECT
  rs.id as subscription_id,
  rs.user_id,
  rs.elderly_person_id,
  rs.schedule_time,
  rs.timezone,
  rs.is_active,
  rs.report_type,
  p.email as user_email,
  p.full_name as user_name,
  ep.full_name as elderly_person_name
FROM report_subscriptions rs
LEFT JOIN profiles p ON p.id = rs.user_id
LEFT JOIN elderly_persons ep ON ep.id = rs.elderly_person_id
WHERE rs.is_active = true;

-- Step 3: Check if user has email
SELECT 'STEP 3: User Email Check' as debug_step;
SELECT
  p.id,
  p.email,
  CASE
    WHEN p.email IS NULL THEN '❌ NO EMAIL - This is the problem!'
    WHEN p.email = '' THEN '❌ EMPTY EMAIL - This is the problem!'
    ELSE '✅ Email exists: ' || p.email
  END as email_status
FROM profiles p
WHERE p.id IN (SELECT user_id FROM report_subscriptions WHERE is_active = true);

-- Step 4: Check if elderly person exists
SELECT 'STEP 4: Elderly Person Check' as debug_step;
SELECT
  ep.id,
  ep.full_name,
  CASE
    WHEN ep.full_name IS NULL THEN '❌ NO NAME'
    ELSE '✅ Name exists: ' || ep.full_name
  END as name_status
FROM elderly_persons ep
WHERE ep.id IN (SELECT elderly_person_id FROM report_subscriptions WHERE is_active = true);

-- Step 5: Run full diagnostic
SELECT 'STEP 5: Full System Diagnostic' as debug_step;
SELECT * FROM public.diagnose_scheduled_reports();

-- Step 6: Manually trigger and see detailed response
SELECT 'STEP 6: Manual Trigger Test' as debug_step;
SELECT public.trigger_scheduled_reports();

-- Step 7: Check cron job exists
SELECT 'STEP 7: Cron Job Status' as debug_step;
SELECT
  jobname,
  schedule,
  active,
  jobid
FROM cron.job
WHERE jobname = 'send-scheduled-reports';

-- Step 8: Check recent cron runs for errors
SELECT 'STEP 8: Recent Cron Runs' as debug_step;
SELECT
  start_time,
  end_time,
  status,
  return_message,
  CASE
    WHEN status = 'failed' THEN '❌ FAILED - Check error'
    WHEN status = 'succeeded' THEN '✅ Success'
    ELSE status
  END as status_icon
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-scheduled-reports')
ORDER BY start_time DESC
LIMIT 10;

-- ============================================
-- COMMON ISSUES AND SOLUTIONS:
-- ============================================

-- Issue 1: No email in profiles table
-- Solution: Update user profile with email
-- UPDATE profiles SET email = 'your-email@example.com' WHERE id = 'your-user-id';

-- Issue 2: Database settings not configured
-- Solution: Run these commands:
-- ALTER DATABASE postgres SET app.supabase_url = 'https://your-project.supabase.co';
-- ALTER DATABASE postgres SET app.supabase_service_role_key = 'your-service-role-key';

-- Issue 3: Edge function not deployed
-- Solution: Deploy edge function
-- supabase functions deploy send-scheduled-report

-- Issue 4: Resend API key not configured
-- Solution: Set edge function secret
-- supabase secrets set RESEND_API_KEY=your-resend-api-key
