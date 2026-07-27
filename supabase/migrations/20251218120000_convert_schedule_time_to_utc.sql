-- Migration: Convert report subscription schedule times to UTC
-- This migration updates the schedule_time column to store times in UTC instead of local time
-- The timezone column is kept for display purposes only

-- Step 1: Add comment to clarify that schedule_time is now in UTC
COMMENT ON COLUMN public.report_subscriptions.schedule_time IS 'Scheduled report delivery time in UTC';
COMMENT ON COLUMN public.report_subscriptions.timezone IS 'User timezone (for display purposes only, schedule_time is stored in UTC)';

-- Step 2: Create function to convert local time to UTC
CREATE OR REPLACE FUNCTION public.convert_schedule_time_to_utc(
  local_time TIME,
  tz TEXT
) RETURNS TIME AS $$
DECLARE
  utc_time TIME;
  base_date TIMESTAMP;
  local_timestamp TIMESTAMPTZ;
BEGIN
  -- Use today's date as base for conversion
  base_date := CURRENT_DATE + local_time;

  -- Convert to timestamptz in the user's timezone
  local_timestamp := timezone(tz, base_date);

  -- Convert to UTC and extract time portion
  utc_time := (local_timestamp AT TIME ZONE 'UTC')::TIME;

  RETURN utc_time;
EXCEPTION
  WHEN OTHERS THEN
    -- If timezone conversion fails, return the original time
    RETURN local_time;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 3: Migrate existing data from local time to UTC
UPDATE public.report_subscriptions
SET schedule_time = public.convert_schedule_time_to_utc(schedule_time, timezone)
WHERE timezone IS NOT NULL AND timezone != 'UTC';

-- Step 4: Update default timezone to UTC (new subscriptions will use UTC by default)
ALTER TABLE public.report_subscriptions
ALTER COLUMN timezone SET DEFAULT 'UTC';

-- Step 5: Create helper function for triggers to use UTC time
CREATE OR REPLACE FUNCTION public.get_subscriptions_due_now(
  time_window_minutes INTEGER DEFAULT 30
) RETURNS TABLE (
  id UUID,
  user_id UUID,
  elderly_person_id UUID,
  report_type TEXT,
  schedule_time TIME,
  timezone TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  current_utc_time TIME;
  window_start TIME;
  window_end TIME;
BEGIN
  -- Get current UTC time
  current_utc_time := (NOW() AT TIME ZONE 'UTC')::TIME;

  -- Calculate time window (±30 minutes by default)
  window_start := current_utc_time - (time_window_minutes || ' minutes')::INTERVAL;
  window_end := current_utc_time + (time_window_minutes || ' minutes')::INTERVAL;

  -- Return subscriptions that are due now
  RETURN QUERY
  SELECT
    rs.id,
    rs.user_id,
    rs.elderly_person_id,
    rs.report_type,
    rs.schedule_time,
    rs.timezone,
    rs.created_at,
    rs.updated_at
  FROM public.report_subscriptions rs
  WHERE rs.is_active = true
    AND rs.schedule_time >= window_start
    AND rs.schedule_time <= window_end;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION public.get_subscriptions_due_now(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_subscriptions_due_now(INTEGER) TO authenticated;
