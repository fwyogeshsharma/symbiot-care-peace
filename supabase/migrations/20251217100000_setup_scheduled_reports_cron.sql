-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create a function to invoke the edge function
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
  -- These should be configured in your database
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

-- Schedule the cron job to run every 5 minutes
-- This ensures reports are sent within 5 minutes of their scheduled time
SELECT cron.schedule(
  'send-scheduled-reports',      -- Job name
  '*/5 * * * *',                 -- Every 5 minutes
  'SELECT public.trigger_scheduled_reports();'
);

-- To configure the settings, run these commands in your Supabase SQL editor:
-- ALTER DATABASE postgres SET app.supabase_url = 'https://your-project.supabase.co';
-- ALTER DATABASE postgres SET app.supabase_service_role_key = 'your-service-role-key';
