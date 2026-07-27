-- Fix the scheduled reports trigger function to work properly with edge functions
-- This migration improves the trigger function with better error handling and configuration

-- Drop the existing cron job first
SELECT cron.unschedule('send-scheduled-reports');

-- Drop the old function
DROP FUNCTION IF EXISTS public.trigger_scheduled_reports();

-- Create an improved function that uses environment variables or direct configuration
CREATE OR REPLACE FUNCTION public.trigger_scheduled_reports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
  response record;
  request_id bigint;
BEGIN
  -- Try to get settings from database configuration
  BEGIN
    supabase_url := current_setting('app.supabase_url', true);
    service_role_key := current_setting('app.supabase_service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    -- Settings not found, log error
    RAISE WARNING 'Supabase settings not configured in database';

    -- Try to get from pg_settings or use a fallback approach
    -- You can also hardcode these values temporarily for testing
    -- supabase_url := 'https://your-project.supabase.co';
    -- service_role_key := 'your-service-role-key';

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

  -- Log the attempt
  RAISE NOTICE 'Triggering scheduled reports at %', NOW();
  RAISE NOTICE 'Target URL: %', supabase_url || '/functions/v1/send-scheduled-report';

  -- Make HTTP request to the edge function
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

    -- Log the response
    RAISE NOTICE 'Edge function response status: %', response.status;
    RAISE NOTICE 'Edge function response body: %', response.content;

    -- Check if request was successful
    IF response.status >= 200 AND response.status < 300 THEN
      RAISE NOTICE 'Successfully triggered scheduled reports';
    ELSE
      RAISE WARNING 'Edge function returned non-success status: %', response.status;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error calling edge function: %', SQLERRM;
    RETURN;
  END;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.trigger_scheduled_reports() TO postgres;

-- Create a test function that can be called manually
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
  -- Check configuration
  BEGIN
    supabase_url := current_setting('app.supabase_url', true);
    service_role_key := current_setting('app.supabase_service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT
      'error'::text,
      'Settings not configured. Run: ALTER DATABASE postgres SET app.supabase_url = ''your-url''; ALTER DATABASE postgres SET app.supabase_service_role_key = ''your-key'';'::text,
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

-- Re-create the cron job
SELECT cron.schedule(
  'send-scheduled-reports',
  '*/5 * * * *',  -- Every 5 minutes
  'SELECT public.trigger_scheduled_reports();'
);

-- Add a comment to the cron job
COMMENT ON FUNCTION public.trigger_scheduled_reports() IS
'Triggers the send-scheduled-report edge function every 5 minutes via cron job.
Requires app.supabase_url and app.supabase_service_role_key to be configured in database settings.';

-- Instructions for configuration (shown as comments)
-- To configure the settings, run these commands in Supabase SQL Editor:
--
-- ALTER DATABASE postgres SET app.supabase_url = 'https://your-project-ref.supabase.co';
-- ALTER DATABASE postgres SET app.supabase_service_role_key = 'your-service-role-key-here';
--
-- To test the configuration:
-- SELECT * FROM public.test_scheduled_reports_trigger();
--
-- To manually trigger the function:
-- SELECT public.trigger_scheduled_reports();
--
-- To view cron job status:
-- SELECT * FROM cron.job WHERE jobname = 'send-scheduled-reports';
--
-- To view cron job logs:
-- SELECT * FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-scheduled-reports')
-- ORDER BY start_time DESC LIMIT 10;
