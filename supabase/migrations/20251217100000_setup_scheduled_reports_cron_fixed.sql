-- Fixed version: Setup scheduled reports cron job
-- This handles cases where pg_cron may already exist

-- Step 1: Enable pg_cron extension (skip if already exists)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  RAISE NOTICE 'pg_cron extension enabled';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron may already be installed, continuing...';
END $$;

-- Step 2: Enable HTTP extension (skip if already exists)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;
  RAISE NOTICE 'http extension enabled';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'http extension may already be installed, continuing...';
END $$;

-- Step 3: Grant permissions (ignore if already granted)
DO $$
BEGIN
  GRANT USAGE ON SCHEMA cron TO postgres;
  RAISE NOTICE 'Granted USAGE on schema cron to postgres';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Permissions may already exist, continuing...';
END $$;

-- Step 4: Drop existing function if exists
DROP FUNCTION IF EXISTS public.trigger_scheduled_reports();

-- Step 5: Create the trigger function
CREATE OR REPLACE FUNCTION public.trigger_scheduled_reports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
  response_status integer;
BEGIN
  -- Get the Supabase URL and service role key from app settings
  BEGIN
    supabase_url := current_setting('app.supabase_url', true);
    service_role_key := current_setting('app.supabase_service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Settings not configured. Please run: ALTER DATABASE postgres SET app.supabase_url = ''your-url''; ALTER DATABASE postgres SET app.supabase_service_role_key = ''your-key'';';
    RETURN;
  END;

  -- Make HTTP request to the edge function
  IF supabase_url IS NOT NULL AND service_role_key IS NOT NULL THEN
    SELECT status INTO response_status
    FROM extensions.http((
      'POST',
      supabase_url || '/functions/v1/send-scheduled-report',
      ARRAY[extensions.http_header('Authorization', 'Bearer ' || service_role_key),
            extensions.http_header('Content-Type', 'application/json')],
      'application/json',
      '{}'
    )::extensions.http_request);

    RAISE NOTICE 'Triggered send-scheduled-report function, status: %', response_status;
  END IF;
END;
$$;

-- Step 6: Unschedule existing job if it exists
DO $$
BEGIN
  PERFORM cron.unschedule('send-scheduled-reports');
  RAISE NOTICE 'Unscheduled existing cron job';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'No existing cron job to unschedule';
END $$;

-- Step 7: Schedule the cron job
DO $$
BEGIN
  PERFORM cron.schedule(
    'send-scheduled-reports',      -- Job name
    '*/5 * * * *',                 -- Every 5 minutes
    'SELECT public.trigger_scheduled_reports();'
  );
  RAISE NOTICE 'Scheduled cron job successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to schedule cron job: %', SQLERRM;
END $$;

-- Step 8: Verify the setup
DO $$
DECLARE
  job_count integer;
BEGIN
  SELECT COUNT(*) INTO job_count
  FROM cron.job
  WHERE jobname = 'send-scheduled-reports';

  IF job_count > 0 THEN
    RAISE NOTICE '✅ Cron job setup complete! Job is scheduled.';
  ELSE
    RAISE WARNING '⚠️ Cron job was not scheduled. Check permissions.';
  END IF;
END $$;

-- Instructions
COMMENT ON FUNCTION public.trigger_scheduled_reports() IS
'Triggers the send-scheduled-report edge function every 5 minutes via cron job.
To configure, run:
ALTER DATABASE postgres SET app.supabase_url = ''https://your-project.supabase.co'';
ALTER DATABASE postgres SET app.supabase_service_role_key = ''your-service-role-key'';';
