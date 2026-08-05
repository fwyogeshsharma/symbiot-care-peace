-- The dashboard's window buttons (24h/7d/30d) were also cutting off the "latest value" a
-- metric shows: device_metric_summary filtered latest_value/latest_recorded_at by p_since,
-- so a metric that has not synced within the selected window (e.g. sleep, when no device has
-- reported it for a few days) fell back to "Not recorded" even though an earlier reading
-- exists. That reads as data loss and invites clearing a metric that is simply between syncs.
--
-- The latest reading for a data_type should stay on the dashboard - stamped with its own
-- age - until a newer reading from any device for that person overrides it. p_since now only
-- scopes reading_count (how much synced in the selected window); latest_value and
-- latest_recorded_at always reflect the most recent row ever recorded for that data_type.

CREATE INDEX IF NOT EXISTS idx_device_data_person_type_recorded_at
  ON public.device_data (elderly_person_id, data_type, recorded_at DESC);

CREATE OR REPLACE FUNCTION public.device_metric_summary(
  p_person_id uuid,
  p_since timestamptz
)
RETURNS TABLE (
  data_type text,
  reading_count bigint,
  latest_value jsonb,
  latest_unit text,
  latest_recorded_at timestamptz
)
LANGUAGE sql
STABLE
-- SECURITY INVOKER (the default, stated for the avoidance of doubt): the caller's RLS on
-- device_data still applies, so this exposes nothing a direct SELECT would not.
SECURITY INVOKER
SET search_path = public
AS $$
  WITH latest AS (
    SELECT DISTINCT ON (d.data_type)
      d.data_type,
      d.value,
      d.unit,
      d.recorded_at
    FROM public.device_data d
    WHERE d.elderly_person_id = p_person_id
    -- DISTINCT ON takes the first row per group, so this ordering is what makes it "latest".
    -- Unscoped by p_since on purpose: a stale metric keeps its last known reading rather than
    -- disappearing when it falls outside the dashboard's selected window.
    ORDER BY d.data_type, d.recorded_at DESC
  ),
  counts AS (
    SELECT d.data_type, COUNT(*) AS reading_count
    FROM public.device_data d
    WHERE d.elderly_person_id = p_person_id
      AND d.recorded_at >= p_since
    GROUP BY d.data_type
  )
  SELECT
    latest.data_type,
    COALESCE(counts.reading_count, 0) AS reading_count,
    latest.value AS latest_value,
    latest.unit AS latest_unit,
    latest.recorded_at AS latest_recorded_at
  FROM latest
  LEFT JOIN counts ON counts.data_type = latest.data_type;
$$;

COMMENT ON FUNCTION public.device_metric_summary(uuid, timestamptz) IS
  'One row per data_type ever recorded for a person: reading count within the given window, plus the latest value, unit and timestamp regardless of window.';

GRANT EXECUTE ON FUNCTION public.device_metric_summary(uuid, timestamptz) TO authenticated;
