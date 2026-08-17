-- Shared helpers for rehab-progress scoring.
--
-- Unlike disease-risk (which compares a rolling lookback window against itself), rehab
-- progress compares a fixed baseline window (the first baseline_window_days of the
-- program, from rehab_enrollments.program_start_date) against the most recent window of
-- the same length. "Improvement" only means something measured against where the person
-- started, not against last month.

-- Baseline = [program_start_date, program_start_date + baseline_days). Recent = the most
-- current window of the same length, ending now. Callers must guard against the two
-- windows overlapping (see compute_rehab_progress_for_person in 20260817130300_*.sql) —
-- this function just computes bounds, it doesn't validate them.
CREATE OR REPLACE FUNCTION public.rehab_window_bounds(
  p_program_start_date DATE,
  p_baseline_days INTEGER
) RETURNS TABLE(baseline_start TIMESTAMPTZ, baseline_end TIMESTAMPTZ, recent_start TIMESTAMPTZ, recent_end TIMESTAMPTZ)
LANGUAGE sql STABLE AS $$
  SELECT
    p_program_start_date::timestamptz,
    p_program_start_date::timestamptz + (p_baseline_days || ' days')::interval,
    now() - (p_baseline_days || ' days')::interval,
    now();
$$;

-- How many distinct calendar days, within an explicit range, does this person have at
-- least one reading of any of the given data_types? Same idea as disease-risk's
-- count_distinct_data_days, but bounded by an explicit [start, end) range instead of "last
-- N days from now" — rehab needs this for the baseline window too, which is anchored in
-- the past, not relative to now().
CREATE OR REPLACE FUNCTION public.count_distinct_data_days_in_range(
  p_elderly_person_id UUID,
  p_data_types TEXT[],
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
) RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(DISTINCT date_trunc('day', recorded_at))::INTEGER
  FROM public.device_data
  WHERE elderly_person_id = p_elderly_person_id
    AND data_type = ANY(p_data_types)
    AND recorded_at >= p_start
    AND recorded_at < p_end;
$$;

-- Trend-metric normalizer: turns a baseline-to-recent percentage change into a 0-100
-- score. 50 = no change, 100 = >= max_expected_pct improvement, 0 = >= max_expected_pct
-- decline. max_expected_pct is metric-specific (e.g. 30 for steps, 15 for resting heart
-- rate, 5 for oxygen saturation) so physiologically narrow vitals get a tight clamp and
-- activity counts get a wide one. NULL input (e.g. no baseline reading to compare against)
-- propagates to NULL output, so callers don't need to special-case missing data here.
CREATE OR REPLACE FUNCTION public.rehab_normalize_score(
  p_pct_change NUMERIC,
  p_higher_is_better BOOLEAN,
  p_max_expected_pct NUMERIC
) RETURNS NUMERIC
LANGUAGE sql IMMUTABLE AS $$
  SELECT ROUND((50 + 50 * GREATEST(-1, LEAST(1,
    (CASE WHEN p_higher_is_better THEN p_pct_change ELSE -p_pct_change END)
      / NULLIF(p_max_expected_pct, 0)
  )))::numeric, 1);
$$;

-- Closeness-to-target normalizer, for metrics where "closer to a healthy target" is the
-- goal rather than "more" or "less" — weight and sleep duration. 100 = at target, 0 = at or
-- beyond max_deviation_pct away from it (in either direction).
CREATE OR REPLACE FUNCTION public.rehab_stability_score(
  p_recent_avg NUMERIC,
  p_target NUMERIC,
  p_max_deviation_pct NUMERIC
) RETURNS NUMERIC
LANGUAGE sql IMMUTABLE AS $$
  SELECT ROUND((100 * GREATEST(0, 1 -
    (ABS(p_recent_avg - p_target) / NULLIF(ABS(p_target), 0)) / NULLIF(p_max_deviation_pct / 100.0, 0)
  ))::numeric, 1);
$$;

-- Bounded-ordinal-scale normalizer: for metrics like pain (0-10) where a percentage change
-- is meaningless (a baseline of 0 makes pct-change undefined) but an absolute delta on a
-- known scale is meaningful. max_expected_delta is the scale movement that counts as a
-- full-scale improvement (e.g. 5 points on a 0-10 pain scale).
CREATE OR REPLACE FUNCTION public.rehab_delta_score(
  p_baseline_avg NUMERIC,
  p_recent_avg NUMERIC,
  p_higher_is_better BOOLEAN,
  p_max_expected_delta NUMERIC
) RETURNS NUMERIC
LANGUAGE sql IMMUTABLE AS $$
  SELECT ROUND((50 + 50 * GREATEST(-1, LEAST(1,
    (CASE WHEN p_higher_is_better THEN (p_recent_avg - p_baseline_avg) ELSE (p_baseline_avg - p_recent_avg) END)
      / NULLIF(p_max_expected_delta, 0)
  )))::numeric, 1);
$$;

-- Decide the confidence tier for one domain from how many days of data are actually
-- available on each side of the comparison, vs. the enrollment's baseline_window_days.
CREATE OR REPLACE FUNCTION public.rehab_score_confidence(
  p_baseline_days INTEGER,
  p_recent_days INTEGER,
  p_required_days INTEGER
) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN COALESCE(p_baseline_days, 0) < CEIL(p_required_days / 2.0)
      OR COALESCE(p_recent_days, 0) < CEIL(p_required_days / 2.0)
      THEN 'insufficient_data'
    WHEN p_baseline_days >= p_required_days AND p_recent_days >= p_required_days
      THEN 'established'
    ELSE 'preliminary'
  END;
$$;

-- Single write path for rehab_domain_scores, mirroring upsert_disease_risk_flag's shape.
-- Derives trend from score so every caller gets the same improving/stable/declining
-- thresholds, and forces score/trend to NULL whenever confidence is insufficient_data so a
-- half-computed score never gets displayed as if it were meaningful.
CREATE OR REPLACE FUNCTION public.upsert_rehab_domain_score(
  p_elderly_person_id UUID,
  p_domain_key TEXT,
  p_confidence TEXT,
  p_score NUMERIC,
  p_baseline_days INTEGER,
  p_recent_days INTEGER,
  p_details JSONB,
  p_message TEXT
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_score NUMERIC;
  v_trend TEXT;
BEGIN
  v_score := CASE WHEN p_confidence = 'insufficient_data' THEN NULL ELSE p_score END;
  v_trend := CASE
    WHEN v_score IS NULL THEN NULL
    WHEN v_score >= 60 THEN 'improving'
    WHEN v_score <= 40 THEN 'declining'
    ELSE 'stable'
  END;

  INSERT INTO public.rehab_domain_scores AS d (
    elderly_person_id, domain_key, confidence, score, trend,
    baseline_days_available, recent_days_available, details, message, computed_date, updated_at
  ) VALUES (
    p_elderly_person_id, p_domain_key, p_confidence, v_score, v_trend,
    COALESCE(p_baseline_days, 0), COALESCE(p_recent_days, 0), COALESCE(p_details, '{}'::jsonb), p_message,
    CURRENT_DATE, now()
  )
  ON CONFLICT (elderly_person_id, domain_key) DO UPDATE SET
    confidence = EXCLUDED.confidence,
    score = EXCLUDED.score,
    trend = EXCLUDED.trend,
    baseline_days_available = EXCLUDED.baseline_days_available,
    recent_days_available = EXCLUDED.recent_days_available,
    details = EXCLUDED.details,
    message = EXCLUDED.message,
    computed_date = EXCLUDED.computed_date,
    updated_at = now();
END;
$$;
