-- ============================================
-- SET SCHEDULED TIME TO NOW FOR IMMEDIATE TESTING
-- ============================================

-- Step 1: Check current UTC time
SELECT
  (NOW() AT TIME ZONE 'UTC')::TIME as current_utc_time,
  (NOW() AT TIME ZONE 'UTC' + INTERVAL '2 minutes')::TIME as time_plus_2_minutes;

-- Step 2: Update subscription to trigger in 2 minutes from now
UPDATE report_subscriptions
SET
  schedule_time = (NOW() AT TIME ZONE 'UTC' + INTERVAL '2 minutes')::TIME,
  updated_at = NOW()
WHERE is_active = true;

-- Step 3: Verify the update
SELECT
  id,
  schedule_time as new_schedule_time_utc,
  (NOW() AT TIME ZONE 'UTC')::TIME as current_time_utc,
  timezone as user_timezone,
  is_active
FROM report_subscriptions
WHERE is_active = true;

-- Step 4: Show when it will trigger
SELECT * FROM public.show_upcoming_reports();

-- Step 5: Manually trigger it RIGHT NOW (don't wait for cron)
SELECT public.trigger_scheduled_reports();

-- ============================================
-- WHAT TO DO NEXT:
-- ============================================
-- After running this script:
-- 1. Wait 5-7 minutes for the cron job to run automatically
-- 2. OR trigger it manually using Step 5 above
-- 3. Check your email inbox for the report
-- 4. Check edge function logs: Dashboard → Edge Functions → send-scheduled-report → Logs
-- 5. Check cron runs: SELECT * FROM public.show_recent_cron_runs();
