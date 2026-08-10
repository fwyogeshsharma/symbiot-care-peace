-- Let the dashboard's "All health metrics" card scope the summary to a single device.
--
-- Multiple devices can report for the same person (e.g. a wearable and a Withings scale),
-- and each publishes a different subset of metrics. The card previously always combined
-- every device's readings, which is right for "show me everything" but cannot answer "what
-- does *this* device report" — a device that only ever sends weight would still show heart
-- rate populated from another device, with nothing to indicate the split.
--
-- p_device_id is optional and defaults to NULL (= no filter), so every existing caller that
-- passes only p_person_id/p_since keeps working unchanged.

-- The old two-argument overload must go first: a new three-argument overload with a
-- default on the third parameter would otherwise leave both signatures resolvable for a
-- two-argument call, and Postgres raises "function is not unique" rather than picking one.
DROP FUNCTION IF EXISTS public.device_metric_summary(uuid, timestamptz);

CREATE OR REPLACE FUNCTION public.device_metric_summary(
  p_person_id uuid,
  p_since timestamptz,
  p_device_id uuid DEFAULT NULL
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
      AND (p_device_id IS NULL OR d.device_id = p_device_id)
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
      AND (p_device_id IS NULL OR d.device_id = p_device_id)
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

COMMENT ON FUNCTION public.device_metric_summary(uuid, timestamptz, uuid) IS
  'One row per data_type ever recorded for a person (optionally scoped to one device): reading count within the given window, plus the latest value, unit and timestamp regardless of window.';

GRANT EXECUTE ON FUNCTION public.device_metric_summary(uuid, timestamptz, uuid) TO authenticated;
