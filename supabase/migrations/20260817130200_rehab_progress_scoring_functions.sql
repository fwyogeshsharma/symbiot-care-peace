-- Per-domain rehab progress scoring functions, one per domain_key in rehab_domain_scores.
-- Naming convention: public._rehab_score_<domain_key>(p_person uuid, p_baseline_start,
--   p_baseline_end, p_recent_start, p_recent_end timestamptz)
--   RETURNS TABLE(score numeric, baseline_days integer, recent_days integer, details jsonb, message text)
--
-- Unlike disease-risk (0=no risk, 100=high risk), these are "higher is better": each
-- component metric is normalized so 50 = no change since the baseline window, 100 = at or
-- beyond the max expected improvement, 0 = at or beyond the max expected decline. A
-- domain's score is the average of whichever of its component metrics have data in both
-- the baseline and recent windows; components missing from either window are skipped and
-- named in `message`, not treated as zero.
--
-- Progress signals only, same disclaimer as disease-risk: thresholds (max_expected_pct,
-- max_deviation_pct, max_expected_delta) are illustrative starting points, not clinically
-- validated, and nothing here is a substitute for a PT/clinician's own assessment.

-- =========================================================================
-- 1. Mobility — steps, distance, exercise time, floors climbed, gait speed,
--    wheelchair pushes (only scored when present, for wheelchair users)
-- =========================================================================
CREATE OR REPLACE FUNCTION public._rehab_score_mobility(
  p_person UUID, p_baseline_start TIMESTAMPTZ, p_baseline_end TIMESTAMPTZ,
  p_recent_start TIMESTAMPTZ, p_recent_end TIMESTAMPTZ
) RETURNS TABLE(score NUMERIC, baseline_days INTEGER, recent_days INTEGER, details JSONB, message TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_base_steps NUMERIC; v_rec_steps NUMERIC;
  v_base_distance NUMERIC; v_rec_distance NUMERIC;
  v_base_exercise NUMERIC; v_rec_exercise NUMERIC;
  v_base_floors NUMERIC; v_rec_floors NUMERIC;
  v_base_speed NUMERIC; v_rec_speed NUMERIC;
  v_base_wheelchair NUMERIC; v_rec_wheelchair NUMERIC;
  v_components NUMERIC[] := ARRAY[]::NUMERIC[];
  v_missing TEXT[] := ARRAY[]::TEXT[];
  v_score NUMERIC;
BEGIN
  SELECT AVG(daily) INTO v_base_steps FROM (
    SELECT SUM((value->>'count')::numeric) AS daily FROM device_data
    WHERE elderly_person_id = p_person AND data_type = 'steps'
      AND recorded_at >= p_baseline_start AND recorded_at < p_baseline_end
    GROUP BY date_trunc('day', recorded_at)) s;
  SELECT AVG(daily) INTO v_rec_steps FROM (
    SELECT SUM((value->>'count')::numeric) AS daily FROM device_data
    WHERE elderly_person_id = p_person AND data_type = 'steps'
      AND recorded_at >= p_recent_start AND recorded_at < p_recent_end
    GROUP BY date_trunc('day', recorded_at)) s;

  SELECT AVG(daily) INTO v_base_distance FROM (
    SELECT SUM((value->>'meters')::numeric) AS daily FROM device_data
    WHERE elderly_person_id = p_person AND data_type = 'distance'
      AND recorded_at >= p_baseline_start AND recorded_at < p_baseline_end
    GROUP BY date_trunc('day', recorded_at)) s;
  SELECT AVG(daily) INTO v_rec_distance FROM (
    SELECT SUM((value->>'meters')::numeric) AS daily FROM device_data
    WHERE elderly_person_id = p_person AND data_type = 'distance'
      AND recorded_at >= p_recent_start AND recorded_at < p_recent_end
    GROUP BY date_trunc('day', recorded_at)) s;

  SELECT AVG(daily) INTO v_base_exercise FROM (
    SELECT SUM((value->>'duration_minutes')::numeric) AS daily FROM device_data
    WHERE elderly_person_id = p_person AND data_type = 'exercise_session'
      AND recorded_at >= p_baseline_start AND recorded_at < p_baseline_end
    GROUP BY date_trunc('day', recorded_at)) s;
  SELECT AVG(daily) INTO v_rec_exercise FROM (
    SELECT SUM((value->>'duration_minutes')::numeric) AS daily FROM device_data
    WHERE elderly_person_id = p_person AND data_type = 'exercise_session'
      AND recorded_at >= p_recent_start AND recorded_at < p_recent_end
    GROUP BY date_trunc('day', recorded_at)) s;

  SELECT AVG(daily) INTO v_base_floors FROM (
    SELECT SUM((value->>'floors')::numeric) AS daily FROM device_data
    WHERE elderly_person_id = p_person AND data_type = 'floors_climbed'
      AND recorded_at >= p_baseline_start AND recorded_at < p_baseline_end
    GROUP BY date_trunc('day', recorded_at)) s;
  SELECT AVG(daily) INTO v_rec_floors FROM (
    SELECT SUM((value->>'floors')::numeric) AS daily FROM device_data
    WHERE elderly_person_id = p_person AND data_type = 'floors_climbed'
      AND recorded_at >= p_recent_start AND recorded_at < p_recent_end
    GROUP BY date_trunc('day', recorded_at)) s;

  SELECT AVG(COALESCE((value->>'meters_per_second')::numeric, (value->>'value')::numeric)) INTO v_base_speed
  FROM device_data WHERE elderly_person_id = p_person AND data_type = 'speed'
    AND recorded_at >= p_baseline_start AND recorded_at < p_baseline_end;
  SELECT AVG(COALESCE((value->>'meters_per_second')::numeric, (value->>'value')::numeric)) INTO v_rec_speed
  FROM device_data WHERE elderly_person_id = p_person AND data_type = 'speed'
    AND recorded_at >= p_recent_start AND recorded_at < p_recent_end;

  SELECT AVG(daily) INTO v_base_wheelchair FROM (
    SELECT SUM((value->>'count')::numeric) AS daily FROM device_data
    WHERE elderly_person_id = p_person AND data_type = 'wheelchair_pushes'
      AND recorded_at >= p_baseline_start AND recorded_at < p_baseline_end
    GROUP BY date_trunc('day', recorded_at)) s;
  SELECT AVG(daily) INTO v_rec_wheelchair FROM (
    SELECT SUM((value->>'count')::numeric) AS daily FROM device_data
    WHERE elderly_person_id = p_person AND data_type = 'wheelchair_pushes'
      AND recorded_at >= p_recent_start AND recorded_at < p_recent_end
    GROUP BY date_trunc('day', recorded_at)) s;

  IF v_base_steps IS NOT NULL AND v_rec_steps IS NOT NULL THEN
    v_components := v_components || rehab_normalize_score((v_rec_steps - v_base_steps) / NULLIF(v_base_steps, 0) * 100, true, 30);
  ELSE v_missing := v_missing || 'steps'; END IF;

  IF v_base_distance IS NOT NULL AND v_rec_distance IS NOT NULL THEN
    v_components := v_components || rehab_normalize_score((v_rec_distance - v_base_distance) / NULLIF(v_base_distance, 0) * 100, true, 30);
  ELSE v_missing := v_missing || 'distance'; END IF;

  IF v_base_exercise IS NOT NULL AND v_rec_exercise IS NOT NULL THEN
    v_components := v_components || rehab_normalize_score((v_rec_exercise - v_base_exercise) / NULLIF(v_base_exercise, 0) * 100, true, 40);
  ELSE v_missing := v_missing || 'exercise_session'; END IF;

  IF v_base_floors IS NOT NULL AND v_rec_floors IS NOT NULL THEN
    v_components := v_components || rehab_normalize_score((v_rec_floors - v_base_floors) / NULLIF(v_base_floors, 0) * 100, true, 40);
  ELSE v_missing := v_missing || 'floors_climbed'; END IF;

  IF v_base_speed IS NOT NULL AND v_rec_speed IS NOT NULL THEN
    v_components := v_components || rehab_normalize_score((v_rec_speed - v_base_speed) / NULLIF(v_base_speed, 0) * 100, true, 20);
  ELSE v_missing := v_missing || 'speed'; END IF;

  IF v_base_wheelchair IS NOT NULL AND v_rec_wheelchair IS NOT NULL THEN
    v_components := v_components || rehab_normalize_score((v_rec_wheelchair - v_base_wheelchair) / NULLIF(v_base_wheelchair, 0) * 100, true, 30);
  END IF; -- wheelchair_pushes is opt-in: absent for most people, not counted as "missing"

  SELECT AVG(c) INTO v_score FROM unnest(v_components) c;

  RETURN QUERY SELECT
    v_score,
    public.count_distinct_data_days_in_range(p_person,
      ARRAY['steps','distance','exercise_session','floors_climbed','speed','wheelchair_pushes'],
      p_baseline_start, p_baseline_end),
    public.count_distinct_data_days_in_range(p_person,
      ARRAY['steps','distance','exercise_session','floors_climbed','speed','wheelchair_pushes'],
      p_recent_start, p_recent_end),
    jsonb_build_object(
      'avg_daily_steps', jsonb_build_object('baseline', v_base_steps, 'recent', v_rec_steps),
      'avg_daily_distance_m', jsonb_build_object('baseline', v_base_distance, 'recent', v_rec_distance),
      'avg_daily_exercise_min', jsonb_build_object('baseline', v_base_exercise, 'recent', v_rec_exercise),
      'avg_daily_floors_climbed', jsonb_build_object('baseline', v_base_floors, 'recent', v_rec_floors),
      'avg_speed_mps', jsonb_build_object('baseline', v_base_speed, 'recent', v_rec_speed),
      'avg_daily_wheelchair_pushes', jsonb_build_object('baseline', v_base_wheelchair, 'recent', v_rec_wheelchair),
      'components_used', array_length(v_components, 1), 'components_missing', v_missing
    ),
    CASE WHEN array_length(v_missing, 1) > 0
      THEN format('No data for: %s. Mobility score based on the remaining metrics only.', array_to_string(v_missing, ', '))
      ELSE NULL END;
END;
$$;

-- =========================================================================
-- 2. Cardio — resting heart rate, HRV, oxygen saturation
-- =========================================================================
CREATE OR REPLACE FUNCTION public._rehab_score_cardio(
  p_person UUID, p_baseline_start TIMESTAMPTZ, p_baseline_end TIMESTAMPTZ,
  p_recent_start TIMESTAMPTZ, p_recent_end TIMESTAMPTZ
) RETURNS TABLE(score NUMERIC, baseline_days INTEGER, recent_days INTEGER, details JSONB, message TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_base_rhr NUMERIC; v_rec_rhr NUMERIC;
  v_base_hrv NUMERIC; v_rec_hrv NUMERIC;
  v_base_spo2 NUMERIC; v_rec_spo2 NUMERIC;
  v_components NUMERIC[] := ARRAY[]::NUMERIC[];
  v_missing TEXT[] := ARRAY[]::TEXT[];
  v_score NUMERIC;
BEGIN
  SELECT AVG(COALESCE((value->>'bpm')::numeric, (value->>'value')::numeric)) INTO v_base_rhr
  FROM device_data WHERE elderly_person_id = p_person AND data_type = 'resting_heart_rate'
    AND recorded_at >= p_baseline_start AND recorded_at < p_baseline_end;
  SELECT AVG(COALESCE((value->>'bpm')::numeric, (value->>'value')::numeric)) INTO v_rec_rhr
  FROM device_data WHERE elderly_person_id = p_person AND data_type = 'resting_heart_rate'
    AND recorded_at >= p_recent_start AND recorded_at < p_recent_end;

  SELECT AVG(COALESCE((value->>'rmssd_ms')::numeric, (value->>'value')::numeric)) INTO v_base_hrv
  FROM device_data WHERE elderly_person_id = p_person AND data_type = 'heart_rate_variability'
    AND recorded_at >= p_baseline_start AND recorded_at < p_baseline_end;
  SELECT AVG(COALESCE((value->>'rmssd_ms')::numeric, (value->>'value')::numeric)) INTO v_rec_hrv
  FROM device_data WHERE elderly_person_id = p_person AND data_type = 'heart_rate_variability'
    AND recorded_at >= p_recent_start AND recorded_at < p_recent_end;

  SELECT AVG(COALESCE((value->>'percentage')::numeric, (value->>'value')::numeric)) INTO v_base_spo2
  FROM device_data WHERE elderly_person_id = p_person AND data_type = 'oxygen_saturation'
    AND recorded_at >= p_baseline_start AND recorded_at < p_baseline_end;
  SELECT AVG(COALESCE((value->>'percentage')::numeric, (value->>'value')::numeric)) INTO v_rec_spo2
  FROM device_data WHERE elderly_person_id = p_person AND data_type = 'oxygen_saturation'
    AND recorded_at >= p_recent_start AND recorded_at < p_recent_end;

  IF v_base_rhr IS NOT NULL AND v_rec_rhr IS NOT NULL THEN
    v_components := v_components || rehab_normalize_score((v_rec_rhr - v_base_rhr) / NULLIF(v_base_rhr, 0) * 100, false, 15);
  ELSE v_missing := v_missing || 'resting_heart_rate'; END IF;

  IF v_base_hrv IS NOT NULL AND v_rec_hrv IS NOT NULL THEN
    v_components := v_components || rehab_normalize_score((v_rec_hrv - v_base_hrv) / NULLIF(v_base_hrv, 0) * 100, true, 40);
  ELSE v_missing := v_missing || 'heart_rate_variability'; END IF;

  IF v_base_spo2 IS NOT NULL AND v_rec_spo2 IS NOT NULL THEN
    v_components := v_components || rehab_normalize_score((v_rec_spo2 - v_base_spo2) / NULLIF(v_base_spo2, 0) * 100, true, 5);
  ELSE v_missing := v_missing || 'oxygen_saturation'; END IF;

  SELECT AVG(c) INTO v_score FROM unnest(v_components) c;

  RETURN QUERY SELECT
    v_score,
    public.count_distinct_data_days_in_range(p_person, ARRAY['resting_heart_rate','heart_rate_variability','oxygen_saturation'], p_baseline_start, p_baseline_end),
    public.count_distinct_data_days_in_range(p_person, ARRAY['resting_heart_rate','heart_rate_variability','oxygen_saturation'], p_recent_start, p_recent_end),
    jsonb_build_object(
      'avg_resting_hr_bpm', jsonb_build_object('baseline', v_base_rhr, 'recent', v_rec_rhr),
      'avg_hrv_rmssd_ms', jsonb_build_object('baseline', v_base_hrv, 'recent', v_rec_hrv),
      'avg_spo2_pct', jsonb_build_object('baseline', v_base_spo2, 'recent', v_rec_spo2),
      'components_used', array_length(v_components, 1), 'components_missing', v_missing
    ),
    CASE WHEN array_length(v_missing, 1) > 0
      THEN format('No data for: %s. Cardio score based on the remaining metrics only.', array_to_string(v_missing, ', '))
      ELSE NULL END;
END;
$$;

-- =========================================================================
-- 3. Body composition — lean body mass, body fat, weight stability
-- =========================================================================
CREATE OR REPLACE FUNCTION public._rehab_score_body_comp(
  p_person UUID, p_baseline_start TIMESTAMPTZ, p_baseline_end TIMESTAMPTZ,
  p_recent_start TIMESTAMPTZ, p_recent_end TIMESTAMPTZ
) RETURNS TABLE(score NUMERIC, baseline_days INTEGER, recent_days INTEGER, details JSONB, message TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_base_lean NUMERIC; v_rec_lean NUMERIC;
  v_base_fat NUMERIC; v_rec_fat NUMERIC;
  v_base_weight NUMERIC; v_rec_weight NUMERIC;
  v_components NUMERIC[] := ARRAY[]::NUMERIC[];
  v_missing TEXT[] := ARRAY[]::TEXT[];
  v_score NUMERIC;
BEGIN
  SELECT AVG((value->>'kg')::numeric) INTO v_base_lean FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'lean_body_mass'
    AND recorded_at >= p_baseline_start AND recorded_at < p_baseline_end;
  SELECT AVG((value->>'kg')::numeric) INTO v_rec_lean FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'lean_body_mass'
    AND recorded_at >= p_recent_start AND recorded_at < p_recent_end;

  SELECT AVG((value->>'percentage')::numeric) INTO v_base_fat FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'body_fat'
    AND recorded_at >= p_baseline_start AND recorded_at < p_baseline_end;
  SELECT AVG((value->>'percentage')::numeric) INTO v_rec_fat FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'body_fat'
    AND recorded_at >= p_recent_start AND recorded_at < p_recent_end;

  SELECT AVG((value->>'kg')::numeric) INTO v_base_weight FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'weight'
    AND recorded_at >= p_baseline_start AND recorded_at < p_baseline_end;
  SELECT AVG((value->>'kg')::numeric) INTO v_rec_weight FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'weight'
    AND recorded_at >= p_recent_start AND recorded_at < p_recent_end;

  IF v_base_lean IS NOT NULL AND v_rec_lean IS NOT NULL THEN
    v_components := v_components || rehab_normalize_score((v_rec_lean - v_base_lean) / NULLIF(v_base_lean, 0) * 100, true, 10);
  ELSE v_missing := v_missing || 'lean_body_mass'; END IF;

  IF v_base_fat IS NOT NULL AND v_rec_fat IS NOT NULL THEN
    v_components := v_components || rehab_normalize_score((v_rec_fat - v_base_fat) / NULLIF(v_base_fat, 0) * 100, false, 15);
  ELSE v_missing := v_missing || 'body_fat'; END IF;

  -- Weight is scored on stability against the person's own baseline, not directionality:
  -- large swings either way are the concern in elderly rehab, not weight gain or loss per se.
  IF v_base_weight IS NOT NULL AND v_rec_weight IS NOT NULL THEN
    v_components := v_components || rehab_stability_score(v_rec_weight, v_base_weight, 15);
  ELSE v_missing := v_missing || 'weight'; END IF;

  SELECT AVG(c) INTO v_score FROM unnest(v_components) c;

  RETURN QUERY SELECT
    v_score,
    public.count_distinct_data_days_in_range(p_person, ARRAY['lean_body_mass','body_fat','weight'], p_baseline_start, p_baseline_end),
    public.count_distinct_data_days_in_range(p_person, ARRAY['lean_body_mass','body_fat','weight'], p_recent_start, p_recent_end),
    jsonb_build_object(
      'avg_lean_body_mass_kg', jsonb_build_object('baseline', v_base_lean, 'recent', v_rec_lean),
      'avg_body_fat_pct', jsonb_build_object('baseline', v_base_fat, 'recent', v_rec_fat),
      'avg_weight_kg', jsonb_build_object('baseline', v_base_weight, 'recent', v_rec_weight),
      'components_used', array_length(v_components, 1), 'components_missing', v_missing
    ),
    CASE WHEN array_length(v_missing, 1) > 0
      THEN format('No data for: %s. Body composition score based on the remaining metrics only.', array_to_string(v_missing, ', '))
      ELSE NULL END;
END;
$$;

-- =========================================================================
-- 4. Sleep — efficiency, awakenings, duration stability
-- =========================================================================
CREATE OR REPLACE FUNCTION public._rehab_score_sleep(
  p_person UUID, p_baseline_start TIMESTAMPTZ, p_baseline_end TIMESTAMPTZ,
  p_recent_start TIMESTAMPTZ, p_recent_end TIMESTAMPTZ
) RETURNS TABLE(score NUMERIC, baseline_days INTEGER, recent_days INTEGER, details JSONB, message TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_base_eff NUMERIC; v_rec_eff NUMERIC;
  v_base_awake NUMERIC; v_rec_awake NUMERIC;
  v_base_dur NUMERIC; v_rec_dur NUMERIC;
  v_components NUMERIC[] := ARRAY[]::NUMERIC[];
  v_missing TEXT[] := ARRAY[]::TEXT[];
  v_score NUMERIC;
BEGIN
  SELECT AVG((value->>'sleep_efficiency_percentage')::numeric), AVG((value->>'awakenings_count')::numeric), AVG((value->>'duration_minutes')::numeric)
    INTO v_base_eff, v_base_awake, v_base_dur
  FROM device_data WHERE elderly_person_id = p_person AND data_type = 'sleep'
    AND recorded_at >= p_baseline_start AND recorded_at < p_baseline_end;

  SELECT AVG((value->>'sleep_efficiency_percentage')::numeric), AVG((value->>'awakenings_count')::numeric), AVG((value->>'duration_minutes')::numeric)
    INTO v_rec_eff, v_rec_awake, v_rec_dur
  FROM device_data WHERE elderly_person_id = p_person AND data_type = 'sleep'
    AND recorded_at >= p_recent_start AND recorded_at < p_recent_end;

  IF v_base_eff IS NOT NULL AND v_rec_eff IS NOT NULL THEN
    v_components := v_components || rehab_normalize_score((v_rec_eff - v_base_eff) / NULLIF(v_base_eff, 0) * 100, true, 20);
  ELSE v_missing := v_missing || 'sleep_efficiency'; END IF;

  IF v_base_awake IS NOT NULL AND v_rec_awake IS NOT NULL THEN
    v_components := v_components || rehab_normalize_score((v_rec_awake - v_base_awake) / NULLIF(v_base_awake, 0) * 100, false, 50);
  ELSE v_missing := v_missing || 'awakenings'; END IF;

  -- Duration is scored against a healthy-adult target (8h), not "more is better" — too much
  -- time in bed is as much a recovery-quality signal as too little in an elderly population.
  IF v_rec_dur IS NOT NULL THEN
    v_components := v_components || rehab_stability_score(v_rec_dur, 480, 25);
  ELSE v_missing := v_missing || 'sleep_duration'; END IF;

  SELECT AVG(c) INTO v_score FROM unnest(v_components) c;

  RETURN QUERY SELECT
    v_score,
    public.count_distinct_data_days_in_range(p_person, ARRAY['sleep'], p_baseline_start, p_baseline_end),
    public.count_distinct_data_days_in_range(p_person, ARRAY['sleep'], p_recent_start, p_recent_end),
    jsonb_build_object(
      'avg_sleep_efficiency_pct', jsonb_build_object('baseline', v_base_eff, 'recent', v_rec_eff),
      'avg_awakenings', jsonb_build_object('baseline', v_base_awake, 'recent', v_rec_awake),
      'avg_duration_min', jsonb_build_object('baseline', v_base_dur, 'recent', v_rec_dur),
      'components_used', array_length(v_components, 1), 'components_missing', v_missing
    ),
    CASE WHEN array_length(v_missing, 1) > 0
      THEN format('No data for: %s. Sleep score based on the remaining metrics only.', array_to_string(v_missing, ', '))
      ELSE NULL END;
END;
$$;

-- =========================================================================
-- 5. Manual — pain + exercise adherence, from rehab_manual_checkins (not device_data).
--    "baseline_days"/"recent_days" here means number of check-ins in each window, since
--    there's no device sync gap to worry about — the caregiver either logged a day or didn't.
-- =========================================================================
CREATE OR REPLACE FUNCTION public._rehab_score_manual(
  p_person UUID, p_baseline_start TIMESTAMPTZ, p_baseline_end TIMESTAMPTZ,
  p_recent_start TIMESTAMPTZ, p_recent_end TIMESTAMPTZ
) RETURNS TABLE(score NUMERIC, baseline_days INTEGER, recent_days INTEGER, details JSONB, message TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_base_pain NUMERIC; v_rec_pain NUMERIC;
  v_rec_adherence NUMERIC;
  v_base_checkins INTEGER; v_rec_checkins INTEGER;
  v_components NUMERIC[] := ARRAY[]::NUMERIC[];
  v_missing TEXT[] := ARRAY[]::TEXT[];
  v_score NUMERIC;
BEGIN
  SELECT AVG(pain_score), COUNT(*) INTO v_base_pain, v_base_checkins
  FROM rehab_manual_checkins WHERE elderly_person_id = p_person
    AND checkin_date >= p_baseline_start::date AND checkin_date < p_baseline_end::date;

  SELECT AVG(pain_score), AVG(exercise_adherence_pct), COUNT(*) INTO v_rec_pain, v_rec_adherence, v_rec_checkins
  FROM rehab_manual_checkins WHERE elderly_person_id = p_person
    AND checkin_date >= p_recent_start::date AND checkin_date <= p_recent_end::date;

  IF v_base_pain IS NOT NULL AND v_rec_pain IS NOT NULL THEN
    v_components := v_components || rehab_delta_score(v_base_pain, v_rec_pain, false, 5);
  ELSE v_missing := v_missing || 'pain_score'; END IF;

  -- Adherence is a standing measure ("how well are they keeping up right now"), not a
  -- trend, so it's used directly as its own 0-100 component rather than compared to baseline.
  IF v_rec_adherence IS NOT NULL THEN
    v_components := v_components || v_rec_adherence;
  ELSE v_missing := v_missing || 'exercise_adherence'; END IF;

  SELECT AVG(c) INTO v_score FROM unnest(v_components) c;

  RETURN QUERY SELECT
    v_score,
    COALESCE(v_base_checkins, 0),
    COALESCE(v_rec_checkins, 0),
    jsonb_build_object(
      'avg_pain_score', jsonb_build_object('baseline', v_base_pain, 'recent', v_rec_pain),
      'avg_exercise_adherence_pct', v_rec_adherence,
      'baseline_checkins', v_base_checkins, 'recent_checkins', v_rec_checkins,
      'components_used', array_length(v_components, 1), 'components_missing', v_missing
    ),
    CASE WHEN array_length(v_missing, 1) > 0
      THEN format('No manual check-in data for: %s.', array_to_string(v_missing, ', '))
      ELSE NULL END;
END;
$$;
