-- Per-metric summary for the dashboard's full-catalogue view.
--
-- The dashboard now lists every metric the sync can record, marking the ones with no data
-- as "Not recorded". Deriving that from a plain SELECT is wrong: the client caps its pull
-- at a few thousand rows ordered newest-first across all types, so a high-frequency metric
-- (heart rate, one row a minute) crowds out everything else. A weight reading from last
-- week then falls outside the cap and the card claims it was never recorded — precisely the
-- misreading the "Not recorded" label exists to prevent.
--
-- One row per data_type, so the count and latest reading are exact regardless of how
-- lopsided the underlying volume is. The client still pulls raw rows for the sparklines,
-- where sampling the most recent window is fine.

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
  SELECT DISTINCT ON (d.data_type)
    d.data_type,
    COUNT(*) OVER (PARTITION BY d.data_type) AS reading_count,
    d.value,
    d.unit,
    d.recorded_at
  FROM public.device_data d
  WHERE d.elderly_person_id = p_person_id
    AND d.recorded_at >= p_since
  -- DISTINCT ON takes the first row per group, so this ordering is what makes it "latest".
  ORDER BY d.data_type, d.recorded_at DESC;
$$;

COMMENT ON FUNCTION public.device_metric_summary(uuid, timestamptz) IS
  'One row per data_type for a person since a cutoff: exact reading count plus the latest value, unit and timestamp.';

GRANT EXECUTE ON FUNCTION public.device_metric_summary(uuid, timestamptz) TO authenticated;
