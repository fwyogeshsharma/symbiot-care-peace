-- ============================================
-- MANUAL CRON JOB SETUP FOR SCHEDULED REPORTS
-- ============================================
-- Run this directly in Supabase SQL Editor
-- This avoids migration issues with pg_cron
-- ============================================

-- STEP 1: Check if pg_cron is already enabled
-- ============================================
SELECT
  extname as extension_name,
  extversion as version
FROM pg_extension
WHERE extname IN ('pg_cron', 'http');

-- Expected output: You should see pg_cron and http listed
-- If not, enable them in Supabase Dashboard > Database > Extensions


-- STEP 2: Check if extensions.http is available
-- ============================================
SELECT COUNT(*) as http_functions_available
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'extensions' AND p.proname = 'http';

-- Expected: Should return 1 or more


-- STEP 3: Drop existing function (if any)
-- ============================================
DROP FUNCTION IF EXISTS public.trigger_scheduled_reports() CASCADE;


-- STEP 4: Create the trigger function
-- ============================================
CREATE OR REPLACE FUNCTION public.trigger_scheduled_reports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
  response record;
BEGIN
  -- Get settings
  BEGIN
    supabase_url := current_setting('app.supabase_url', true);
    service_role_key := current_setting('app.supabase_service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Database settings not configured!';
    RAISE WARNING 'Run: ALTER DATABASE postgres SET app.supabase_url = ''your-url'';';
    RAISE WARNING 'Run: ALTER DATABASE postgres SET app.supabase_service_role_key = ''your-key'';';
    RETURN;
  END;

  -- Validate settings
  IF supabase_url IS NULL OR supabase_url = '' THEN
    RAISE WARNING 'Supabase URL is not configured';
    RETURN;
  END IF;

  IF service_role_key IS NULL OR service_role_key = '' THEN
    RAISE WARNING 'Service role key is not configured';
    RETURN;
  END IF;

  -- Log attempt
  RAISE NOTICE 'Triggering scheduled reports at %', NOW();
  RAISE NOTICE 'Target URL: %/functions/v1/send-scheduled-report', supabase_url;

  -- Make HTTP request
  BEGIN
    SELECT * INTO response
    FROM extensions.http((
      'POST',
      supabase_url || '/functions/v1/send-scheduled-report',
      ARRAY[
        extensions.http_header('Authorization', 'Bearer ' || service_role_key),
        extensions.http_header('Content-Type', 'application/json')
      ],
      'application/json',
      '{}'
    )::extensions.http_request);

    RAISE NOTICE 'Response status: %', response.status;

    IF response.status >= 200 AND response.status < 300 THEN
      RAISE NOTICE 'Successfully triggered scheduled reports';
    ELSE
      RAISE WARNING 'Edge function returned status: %', response.status;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error calling edge function: %', SQLERRM;
  END;
END;
$$;


-- STEP 5: Grant execute permission
-- ============================================
GRANT EXECUTE ON FUNCTION public.trigger_scheduled_reports() TO postgres;


-- STEP 6: Test the function configuration
-- ============================================
CREATE OR REPLACE FUNCTION public.test_scheduled_reports_trigger()
RETURNS TABLE(
  status text,
  message text,
  url_configured boolean,
  key_configured boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
BEGIN
  BEGIN
    supabase_url := current_setting('app.supabase_url', true);
    service_role_key := current_setting('app.supabase_service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT
      'error'::text,
      'Settings not configured!'::text,
      false::boolean,
      false::boolean;
    RETURN;
  END;

  RETURN QUERY SELECT
    'success'::text,
    'Configuration is valid'::text,
    (supabase_url IS NOT NULL AND supabase_url != '')::boolean,
    (service_role_key IS NOT NULL AND service_role_key != '')::boolean;
END;
$$;


-- STEP 7: Remove existing cron job (if any)
-- ============================================
SELECT cron.unschedule('send-scheduled-reports')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-scheduled-reports'
);


-- STEP 8: Schedule the cron job
-- ============================================
SELECT cron.schedule(
  'send-scheduled-reports',
  '*/5 * * * *',
  'SELECT public.trigger_scheduled_reports();'
);


-- STEP 9: Verify setup
-- ============================================
SELECT
  jobid,
  jobname,
  schedule,
  active,
  database
FROM cron.job
WHERE jobname = 'send-scheduled-reports';

-- Expected output: One row with jobname='send-scheduled-reports', active=true


-- ============================================
-- CONFIGURATION (Run these with your values!)
-- ============================================
-- IMPORTANT: Replace with your actual values before running

-- Example (REPLACE THESE VALUES):
-- ALTER DATABASE postgres SET app.supabase_url = 'https://yourproject.supabase.co';
-- ALTER DATABASE postgres SET app.supabase_service_role_key = 'eyJhbGc...your-key-here';


-- ============================================
-- TEST CONFIGURATION
-- ============================================
-- Run this to check if everything is configured correctly:
SELECT * FROM public.test_scheduled_reports_trigger();


-- ============================================
-- MANUAL TEST
-- ============================================
-- Trigger the function manually to test:
-- SELECT public.trigger_scheduled_reports();


-- ============================================
-- MONITORING
-- ============================================
-- View recent cron job executions:
SELECT
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-scheduled-reports')
ORDER BY start_time DESC
LIMIT 10;


-- ============================================
-- CLEANUP (if needed)
-- ============================================
-- To remove the cron job:
-- SELECT cron.unschedule('send-scheduled-reports');

-- To remove the function:
-- DROP FUNCTION IF EXISTS public.trigger_scheduled_reports() CASCADE;
-- DROP FUNCTION IF EXISTS public.test_scheduled_reports_trigger() CASCADE;
