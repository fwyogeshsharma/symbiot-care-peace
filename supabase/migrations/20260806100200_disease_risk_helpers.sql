-- Shared helpers for disease-risk detection.

-- How many distinct calendar days, within the lookback window, does this person have
-- at least one reading of any of the given data_types? This is the "days of data" gate
-- that decides which of the 5 fixed checkpoints (15/30/60/90/180) a disease check qualifies for.
CREATE OR REPLACE FUNCTION public.count_distinct_data_days(
  p_elderly_person_id UUID,
  p_data_types TEXT[],
  p_lookback_days INTEGER
) RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(DISTINCT date_trunc('day', recorded_at))::INTEGER
  FROM public.device_data
  WHERE elderly_person_id = p_elderly_person_id
    AND data_type = ANY(p_data_types)
    AND recorded_at >= now() - (p_lookback_days || ' days')::interval;
$$;

-- Given how many days of data are available and a disease's two checkpoint requirements,
-- decide the confidence tier, which checkpoint window to actually query with, and the
-- star rating to report. Pure function of its inputs so it can be reused by both the
-- dispatcher (to pick the query window) and the upsert (to persist the same decision).
CREATE OR REPLACE FUNCTION public.disease_risk_tier(
  p_days_available INTEGER,
  p_min_bucket INTEGER,
  p_rec_bucket INTEGER,
  p_base_stars SMALLINT
) RETURNS TABLE(tier TEXT, window_days INTEGER, stars SMALLINT)
LANGUAGE sql IMMUTABLE AS $$
  SELECT
    CASE
      WHEN p_days_available < p_min_bucket THEN 'insufficient_data'
      WHEN p_days_available >= p_rec_bucket THEN 'recommended'
      ELSE 'preliminary'
    END,
    CASE
      WHEN p_days_available < p_min_bucket THEN p_days_available
      WHEN p_days_available >= p_rec_bucket THEN p_rec_bucket
      ELSE p_min_bucket
    END,
    CASE
      WHEN p_days_available < p_min_bucket THEN 0::SMALLINT
      WHEN p_days_available >= p_rec_bucket THEN p_base_stars
      ELSE GREATEST(1, p_base_stars - 1)::SMALLINT
    END;
$$;

-- Persist one disease's result for one person. Re-derives tier/stars/window from
-- p_days_available via disease_risk_tier() so the stored row always matches the same
-- logic the dispatcher used to decide what to compute in the first place.
CREATE OR REPLACE FUNCTION public.upsert_disease_risk_flag(
  p_elderly_person_id UUID,
  p_disease_key TEXT,
  p_days_available INTEGER,
  p_flagged BOOLEAN,
  p_score NUMERIC,
  p_details JSONB,
  p_message TEXT
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_min_bucket INTEGER;
  v_rec_bucket INTEGER;
  v_base_stars SMALLINT;
  v_tier TEXT;
  v_window INTEGER;
  v_stars SMALLINT;
BEGIN
  SELECT min_bucket_days, recommended_bucket_days, base_confidence_stars
    INTO v_min_bucket, v_rec_bucket, v_base_stars
  FROM public.disease_risk_thresholds
  WHERE disease_key = p_disease_key;

  IF v_min_bucket IS NULL THEN
    RAISE EXCEPTION 'Unknown disease_key: %', p_disease_key;
  END IF;

  SELECT t.tier, t.window_days, t.stars
    INTO v_tier, v_window, v_stars
  FROM public.disease_risk_tier(p_days_available, v_min_bucket, v_rec_bucket, v_base_stars) t;

  INSERT INTO public.disease_risk_flags AS f (
    elderly_person_id, disease_key, flagged, confidence_tier, confidence_stars,
    days_of_data, window_days_used, score, details, message, computed_date, updated_at
  ) VALUES (
    p_elderly_person_id,
    p_disease_key,
    CASE WHEN v_tier = 'insufficient_data' THEN false ELSE COALESCE(p_flagged, false) END,
    v_tier,
    v_stars,
    p_days_available,
    v_window,
    CASE WHEN v_tier = 'insufficient_data' THEN NULL ELSE p_score END,
    COALESCE(p_details, '{}'::jsonb),
    COALESCE(
      p_message,
      CASE WHEN v_tier = 'insufficient_data'
        THEN format('Need %s more day(s) of data to begin screening for this condition', v_min_bucket - p_days_available)
        ELSE NULL
      END
    ),
    CURRENT_DATE,
    now()
  )
  ON CONFLICT (elderly_person_id, disease_key) DO UPDATE SET
    flagged = EXCLUDED.flagged,
    confidence_tier = EXCLUDED.confidence_tier,
    confidence_stars = EXCLUDED.confidence_stars,
    days_of_data = EXCLUDED.days_of_data,
    window_days_used = EXCLUDED.window_days_used,
    score = EXCLUDED.score,
    details = EXCLUDED.details,
    message = EXCLUDED.message,
    computed_date = EXCLUDED.computed_date,
    updated_at = now();
END;
$$;
