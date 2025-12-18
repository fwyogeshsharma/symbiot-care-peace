-- ============================================
-- SCHEDULED REPORTS CRON SETUP
-- Using Configuration Table (No Superuser Needed)
-- ============================================
-- Run this entire file in Supabase SQL Editor
-- ============================================

-- STEP 1: Create secure configuration table
-- ============================================
CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS to protect secrets
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Only service_role can access config" ON public.system_config;

-- Only service_role can access (users have NO access)
CREATE POLICY "Only service_role can access config"
ON public.system_config
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);

-- Allow service_role full access
CREATE POLICY "Service role has full access"
ON public.system_config
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON TABLE public.system_config IS 'Secure configuration storage for system settings. Protected by RLS.';


-- STEP 2: Insert configuration values
-- ============================================
-- ⚠️ IMPORTANT: Replace these values with your actual Supabase project details

INSERT INTO public.system_config (key, value, description) VALUES
  ('supabase_url', 'https://wiyfcvypeifbdaqnfgrr.supabase.co', 'Supabase project URL'),
  ('service_role_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpeWZjdnlwZWlmYmRhcW5mZ3JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTgwMTI0NiwiZXhwIjoyMDc1Mzc3MjQ2fQ.aLEfYBHEgtrjH_99iwriFQTw4pMX5Up7zLq5Bxk0fhs', 'Service role key for internal API calls')
ON CONFLICT (key)
DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- ⚠️ FIND YOUR VALUES HERE:
-- Supabase Dashboard > Project Settings > API
-- - Project URL: The "URL" field
-- - Service Role Key: The "service_role" key under "Project API keys" (keep secret!)


-- STEP 3: Create trigger function
-- ============================================
DROP FUNCTION IF EXISTS public.trigger_scheduled_reports() CASCADE;

CREATE OR REPLACE FUNCTION public.trigger_scheduled_reports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
  response record;
BEGIN
  -- Read configuration from secure table
  SELECT value INTO supabase_url
  FROM public.system_config
  WHERE key = 'supabase_url';

  SELECT value INTO service_role_key
  FROM public.system_config
  WHERE key = 'service_role_key';

  -- Validate configuration exists
  IF supabase_url IS NULL THEN
    RAISE WARNING 'supabase_url not configured in system_config table';
    RETURN;
  END IF;

  IF service_role_key IS NULL THEN
    RAISE WARNING 'service_role_key not configured in system_config table';
    RETURN;
  END IF;

  -- Log the attempt
  RAISE NOTICE 'Triggering scheduled reports at %', NOW();
  RAISE NOTICE 'Target URL: %/functions/v1/send-scheduled-report', supabase_url;

  -- Make HTTP request to edge function
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

    -- Log response
    RAISE NOTICE 'Edge function response status: %', response.status;

    IF response.status >= 200 AND response.status < 300 THEN
      RAISE NOTICE '✅ Successfully triggered scheduled reports';
    ELSE
      RAISE WARNING '⚠️ Edge function returned non-success status: %', response.status;
      RAISE WARNING 'Response body: %', response.content;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ Error calling edge function: %', SQLERRM;
    RETURN;
  END;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.trigger_scheduled_reports() TO postgres;

COMMENT ON FUNCTION public.trigger_scheduled_reports() IS
'Triggers the send-scheduled-report edge function. Called by cron every 5 minutes.';


-- STEP 4: Create test function
-- ============================================
DROP FUNCTION IF EXISTS public.test_scheduled_reports_config() CASCADE;

CREATE OR REPLACE FUNCTION public.test_scheduled_reports_config()
RETURNS TABLE(
  check_name text,
  status text,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
  url_length int;
  key_length int;
BEGIN
  -- Check if config table exists
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_config') THEN
    RETURN QUERY SELECT
      'Config Table'::text,
      '❌ FAIL'::text,
      'system_config table does not exist'::text;
    RETURN;
  END IF;

  -- Read configuration
  SELECT value INTO supabase_url FROM public.system_config WHERE key = 'supabase_url';
  SELECT value INTO service_role_key FROM public.system_config WHERE key = 'service_role_key';

  -- Check Supabase URL
  IF supabase_url IS NULL OR supabase_url = '' OR supabase_url = 'https://yourproject.supabase.co' THEN
    RETURN QUERY SELECT
      'Supabase URL'::text,
      '❌ FAIL'::text,
      'Not configured or still has placeholder value'::text;
  ELSE
    url_length := length(supabase_url);
    RETURN QUERY SELECT
      'Supabase URL'::text,
      '✅ OK'::text,
      format('Configured (%s chars)', url_length)::text;
  END IF;

  -- Check Service Role Key
  IF service_role_key IS NULL OR service_role_key = '' OR service_role_key = 'your-service-role-key-here' THEN
    RETURN QUERY SELECT
      'Service Role Key'::text,
      '❌ FAIL'::text,
      'Not configured or still has placeholder value'::text;
  ELSE
    key_length := length(service_role_key);
    RETURN QUERY SELECT
      'Service Role Key'::text,
      '✅ OK'::text,
      format('Configured (%s chars)', key_length)::text;
  END IF;

  -- Check if cron job exists
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-scheduled-reports' AND active = true) THEN
    RETURN QUERY SELECT
      'Cron Job'::text,
      '✅ OK'::text,
      'Active and scheduled'::text;
  ELSE
    RETURN QUERY SELECT
      'Cron Job'::text,
      '❌ FAIL'::text,
      'Not found or inactive'::text;
  END IF;

  -- Check if http extension is available
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'extensions' AND p.proname = 'http') THEN
    RETURN QUERY SELECT
      'HTTP Extension'::text,
      '✅ OK'::text,
      'Available in extensions schema'::text;
  ELSE
    RETURN QUERY SELECT
      'HTTP Extension'::text,
      '❌ FAIL'::text,
      'Not found - enable in Database > Extensions'::text;
  END IF;

END;
$$;

COMMENT ON FUNCTION public.test_scheduled_reports_config() IS
'Tests the scheduled reports configuration. Run: SELECT * FROM test_scheduled_reports_config();';


-- STEP 5: Unschedule existing cron job (if any)
-- ============================================
DO $$
BEGIN
  PERFORM cron.unschedule('send-scheduled-reports');
  RAISE NOTICE 'Unscheduled existing cron job (if any)';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'No existing cron job to unschedule';
END $$;


-- STEP 6: Schedule the cron job
-- ============================================
SELECT cron.schedule(
  'send-scheduled-reports',    -- Job name
  '*/5 * * * *',               -- Every 5 minutes
  'SELECT public.trigger_scheduled_reports();'
);


-- STEP 7: Verify the setup
-- ============================================
SELECT
  '=== CRON JOB DETAILS ===' as info,
  jobid,
  jobname,
  schedule,
  active,
  database
FROM cron.job
WHERE jobname = 'send-scheduled-reports';


-- ============================================
-- TEST YOUR CONFIGURATION
-- ============================================
-- Run this to check if everything is configured:
SELECT * FROM public.test_scheduled_reports_config();

-- Expected output: All checks should show ✅ OK


-- ============================================
-- MANUAL TRIGGER TEST
-- ============================================
-- Run this to trigger the function immediately:
-- SELECT public.trigger_scheduled_reports();


-- ============================================
-- UPDATE CONFIGURATION (if needed later)
-- ============================================
-- To update the Supabase URL:
-- UPDATE public.system_config
-- SET value = 'https://newproject.supabase.co', updated_at = NOW()
-- WHERE key = 'supabase_url';

-- To update the service role key:
-- UPDATE public.system_config
-- SET value = 'new-service-role-key', updated_at = NOW()
-- WHERE key = 'service_role_key';


-- ============================================
-- VIEW CONFIGURATION (masked)
-- ============================================
-- View your config with masked secrets:
SELECT
  key,
  CASE
    WHEN key LIKE '%key%' OR key LIKE '%secret%' THEN
      left(value, 10) || '...' || right(value, 4)
    ELSE value
  END as value_masked,
  description,
  updated_at
FROM public.system_config
ORDER BY key;


-- ============================================
-- MONITORING
-- ============================================
-- View recent cron executions:
SELECT
  start_time,
  end_time,
  status,
  return_message,
  (end_time - start_time) as duration
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-scheduled-reports')
ORDER BY start_time DESC
LIMIT 20;


-- ============================================
-- CLEANUP (if needed)
-- ============================================
-- To remove everything:
-- SELECT cron.unschedule('send-scheduled-reports');
-- DROP FUNCTION IF EXISTS public.trigger_scheduled_reports() CASCADE;
-- DROP FUNCTION IF EXISTS public.test_scheduled_reports_config() CASCADE;
-- DROP TABLE IF EXISTS public.system_config CASCADE;
