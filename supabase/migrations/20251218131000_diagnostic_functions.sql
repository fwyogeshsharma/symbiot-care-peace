-- Diagnostic functions to help troubleshoot scheduled reports system
-- Run these functions to check if everything is configured correctly

-- Function 1: Complete system diagnostic
CREATE OR REPLACE FUNCTION public.diagnose_scheduled_reports()
RETURNS TABLE(
  check_name text,
  status text,
  details text,
  action_needed text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  url_setting text;
  key_setting text;
  cron_exists boolean;
  active_subs integer;
  current_utc_time_text text;
BEGIN
  -- Check 1: Database settings
  BEGIN
    url_setting := current_setting('app.supabase_url', true);
    key_setting := current_setting('app.supabase_service_role_key', true);

    IF url_setting IS NULL OR url_setting = '' THEN
      RETURN QUERY SELECT
        'Database Settings'::text,
        'FAILED'::text,
        'Supabase URL not configured'::text,
        'Run: ALTER DATABASE postgres SET app.supabase_url = ''your-url'';'::text;
    ELSIF key_setting IS NULL OR key_setting = '' THEN
      RETURN QUERY SELECT
        'Database Settings'::text,
        'FAILED'::text,
        'Service role key not configured'::text,
        'Run: ALTER DATABASE postgres SET app.supabase_service_role_key = ''your-key'';'::text;
    ELSE
      RETURN QUERY SELECT
        'Database Settings'::text,
        'PASSED'::text,
        'URL and key are configured'::text,
        'None'::text;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT
      'Database Settings'::text,
      'ERROR'::text,
      SQLERRM::text,
      'Check error message'::text;
  END;

  -- Check 2: Cron job exists
  SELECT EXISTS(
    SELECT 1 FROM cron.job WHERE jobname = 'send-scheduled-reports'
  ) INTO cron_exists;

  IF cron_exists THEN
    RETURN QUERY SELECT
      'Cron Job'::text,
      'PASSED'::text,
      'Cron job ''send-scheduled-reports'' exists and is scheduled'::text,
      'None'::text;
  ELSE
    RETURN QUERY SELECT
      'Cron Job'::text,
      'FAILED'::text,
      'Cron job not found'::text,
      'Re-run migration: 20251218130000_fix_scheduled_reports_trigger.sql'::text;
  END IF;

  -- Check 3: Active subscriptions
  SELECT COUNT(*) INTO active_subs
  FROM report_subscriptions
  WHERE is_active = true;

  IF active_subs > 0 THEN
    RETURN QUERY SELECT
      'Active Subscriptions'::text,
      'PASSED'::text,
      active_subs || ' active subscription(s) found'::text,
      'None'::text;
  ELSE
    RETURN QUERY SELECT
      'Active Subscriptions'::text,
      'WARNING'::text,
      'No active subscriptions found'::text,
      'Create a subscription in the frontend to test'::text;
  END IF;

  -- Check 4: HTTP extension
  BEGIN
    PERFORM * FROM pg_extension WHERE extname = 'http';
    RETURN QUERY SELECT
      'HTTP Extension'::text,
      'PASSED'::text,
      'HTTP extension is installed'::text,
      'None'::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT
      'HTTP Extension'::text,
      'FAILED'::text,
      'HTTP extension not found'::text,
      'Run: CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;'::text;
  END;

  -- Check 5: Current UTC time and next scheduled times
  current_utc_time_text := (NOW() AT TIME ZONE 'UTC')::TIME::text;
  RETURN QUERY SELECT
    'Current UTC Time'::text,
    'INFO'::text,
    'Current UTC time: ' || current_utc_time_text,
    'Reports will trigger within ±30 minutes of their schedule_time'::text;

END;
$$;

-- Function 2: Show upcoming scheduled reports
CREATE OR REPLACE FUNCTION public.show_upcoming_reports()
RETURNS TABLE(
  subscription_id uuid,
  person_name text,
  user_email text,
  schedule_time_utc time,
  user_timezone text,
  minutes_until_next_run integer,
  will_trigger_soon boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_utc_time TIME;
  current_total_minutes INTEGER;
BEGIN
  current_utc_time := (NOW() AT TIME ZONE 'UTC')::TIME;
  current_total_minutes := EXTRACT(HOUR FROM current_utc_time)::INTEGER * 60 +
                          EXTRACT(MINUTE FROM current_utc_time)::INTEGER;

  RETURN QUERY
  SELECT
    rs.id as subscription_id,
    ep.full_name as person_name,
    p.email as user_email,
    rs.schedule_time as schedule_time_utc,
    rs.timezone as user_timezone,
    -- Calculate minutes until next run
    CASE
      WHEN (EXTRACT(HOUR FROM rs.schedule_time)::INTEGER * 60 +
            EXTRACT(MINUTE FROM rs.schedule_time)::INTEGER) >= current_total_minutes
      THEN (EXTRACT(HOUR FROM rs.schedule_time)::INTEGER * 60 +
            EXTRACT(MINUTE FROM rs.schedule_time)::INTEGER) - current_total_minutes
      ELSE 1440 - current_total_minutes +
           (EXTRACT(HOUR FROM rs.schedule_time)::INTEGER * 60 +
            EXTRACT(MINUTE FROM rs.schedule_time)::INTEGER)
    END as minutes_until_next_run,
    -- Will it trigger in the next 30 minutes?
    ABS((EXTRACT(HOUR FROM rs.schedule_time)::INTEGER * 60 +
         EXTRACT(MINUTE FROM rs.schedule_time)::INTEGER) - current_total_minutes) <= 30
    as will_trigger_soon
  FROM report_subscriptions rs
  INNER JOIN elderly_persons ep ON ep.id = rs.elderly_person_id
  INNER JOIN profiles p ON p.id = rs.user_id
  WHERE rs.is_active = true
    AND rs.report_type = 'daily_summary'
  ORDER BY minutes_until_next_run ASC;
END;
$$;

-- Function 3: View recent cron job runs
CREATE OR REPLACE FUNCTION public.show_recent_cron_runs()
RETURNS TABLE(
  run_time timestamp with time zone,
  duration interval,
  status text,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    jrd.start_time as run_time,
    jrd.end_time - jrd.start_time as duration,
    jrd.status::text,
    jrd.return_message as message
  FROM cron.job_run_details jrd
  WHERE jrd.jobid = (
    SELECT jobid FROM cron.job WHERE jobname = 'send-scheduled-reports'
  )
  ORDER BY jrd.start_time DESC
  LIMIT 20;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.diagnose_scheduled_reports() TO authenticated;
GRANT EXECUTE ON FUNCTION public.show_upcoming_reports() TO authenticated;
GRANT EXECUTE ON FUNCTION public.show_recent_cron_runs() TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION public.diagnose_scheduled_reports() IS
'Run this function to diagnose issues with the scheduled reports system. Returns a checklist of all components.';

COMMENT ON FUNCTION public.show_upcoming_reports() IS
'Shows all active subscriptions with their scheduled times and when they will next trigger.';

COMMENT ON FUNCTION public.show_recent_cron_runs() IS
'Shows the last 20 cron job executions with their status and any error messages.';
