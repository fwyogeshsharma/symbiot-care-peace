-- Fix the HRV lookup in disease risk scoring.
--
-- The scoring functions added in 20260806100300 read device_data rows with
-- data_type = 'hrv'. Nothing writes that value. Devices and the simulator both
-- write 'heart_rate_variability', which is also the Health Connect name:
--
--     hrv                       0 rows
--     heart_rate_variability    1491 rows
--
-- The HRV term sits inside a COALESCE, so nothing errored - the input was just
-- silently NULL, dropping a signal weighted 30-40% in several of these scores.
-- Affected: depression, anxiety, burnout, cardiovascular, hypertension,
-- diabetes and chronic fatigue.
--
-- Each function below is reproduced verbatim from 20260806100300 with only the
-- data_type filter changed, accepting both names so any legacy 'hrv' rows in
-- other environments still count.


-- _score_depression_risk: HRV lookup corrected
CREATE OR REPLACE FUNCTION public._score_depression_risk(p_person UUID, p_window INTEGER)
RETURNS TABLE(flagged BOOLEAN, score NUMERIC, details JSONB, message TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nights INTEGER; v_avg_duration NUMERIC; v_avg_rem_pct NUMERIC; v_avg_deep_pct NUMERIC;
  v_avg_awakenings NUMERIC; v_hrv NUMERIC; v_deep_bad NUMERIC; v_frag_bad NUMERIC; v_hrv_bad NUMERIC;
BEGIN
  SELECT count(*), avg((value->>'duration_minutes')::numeric), avg((value->>'awakenings_count')::numeric),
         avg((value->'stage_minutes'->>'rem_minutes')::numeric / NULLIF((value->>'duration_minutes')::numeric, 0) * 100),
         avg((value->'stage_minutes'->>'deep_minutes')::numeric / NULLIF((value->>'duration_minutes')::numeric, 0) * 100)
    INTO v_nights, v_avg_duration, v_avg_awakenings, v_avg_rem_pct, v_avg_deep_pct
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'sleep'
    AND recorded_at >= now() - (p_window || ' days')::interval;

  SELECT avg(COALESCE((value->>'value')::numeric, (value->>'rmssd_ms')::numeric)) INTO v_hrv
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type IN ('heart_rate_variability', 'hrv')
    AND recorded_at >= now() - (p_window || ' days')::interval;

  v_deep_bad := CASE WHEN v_avg_deep_pct IS NULL THEN 0 ELSE GREATEST(0, LEAST(1, (18 - v_avg_deep_pct) / 18.0)) END;
  v_frag_bad := CASE WHEN v_avg_awakenings IS NULL THEN 0 ELSE LEAST(1, v_avg_awakenings / 6.0) END;
  v_hrv_bad  := CASE WHEN v_hrv IS NULL THEN 0 ELSE GREATEST(0, LEAST(1, (50 - v_hrv) / 50.0)) END;

  RETURN QUERY SELECT
    v_deep_bad > 0.4 AND v_frag_bad > 0.4 AND v_nights >= p_window * 0.6,
    ROUND((30 * v_deep_bad + 30 * v_frag_bad + 25 * v_hrv_bad + 15 * LEAST(1, GREATEST(0, (v_avg_duration IS NULL)::int::numeric)))::numeric, 1),
    jsonb_build_object(
      'nights_analyzed', v_nights, 'avg_deep_sleep_pct', v_avg_deep_pct, 'avg_rem_pct', v_avg_rem_pct,
      'avg_awakenings', v_avg_awakenings, 'avg_hrv', v_hrv, 'hrv_available', v_hrv IS NOT NULL
    ),
    'Observation only — not a diagnosis. If persistent, consider suggesting professional support.'::text;
END;
$$;

-- _score_anxiety_risk: HRV lookup corrected
CREATE OR REPLACE FUNCTION public._score_anxiety_risk(p_person UUID, p_window INTEGER)
RETURNS TABLE(flagged BOOLEAN, score NUMERIC, details JSONB, message TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_avg_hr NUMERIC; v_hrv NUMERIC; v_avg_latency NUMERIC; v_avg_awakenings NUMERIC;
  v_hrv_bad NUMERIC; v_lat_bad NUMERIC; v_rhr_bad NUMERIC; v_wake_bad NUMERIC; v_score NUMERIC;
BEGIN
  SELECT avg(COALESCE((value->>'bpm')::numeric, (value->>'value')::numeric)) INTO v_avg_hr
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'heart_rate'
    AND recorded_at >= now() - (p_window || ' days')::interval;

  SELECT avg(COALESCE((value->>'value')::numeric, (value->>'rmssd_ms')::numeric)) INTO v_hrv
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type IN ('heart_rate_variability', 'hrv')
    AND recorded_at >= now() - (p_window || ' days')::interval;

  SELECT avg((value->>'sleep_latency_minutes')::numeric), avg((value->>'awakenings_count')::numeric)
    INTO v_avg_latency, v_avg_awakenings
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'sleep'
    AND recorded_at >= now() - (p_window || ' days')::interval;

  v_hrv_bad  := CASE WHEN v_hrv IS NULL THEN 0 ELSE GREATEST(0, LEAST(1, (50 - v_hrv) / 50.0)) END;
  v_lat_bad  := CASE WHEN v_avg_latency IS NULL THEN 0 ELSE GREATEST(0, LEAST(1, v_avg_latency / 60.0)) END;
  v_rhr_bad  := CASE WHEN v_avg_hr IS NULL THEN 0 ELSE GREATEST(0, LEAST(1, (v_avg_hr - 70) / 30.0)) END;
  v_wake_bad := CASE WHEN v_avg_awakenings IS NULL THEN 0 ELSE LEAST(1, v_avg_awakenings / 6.0) END;
  v_score := 30 * v_hrv_bad + 30 * v_lat_bad + 20 * v_rhr_bad + 20 * v_wake_bad;

  RETURN QUERY SELECT
    v_score >= 55,
    ROUND(v_score::numeric, 1),
    jsonb_build_object(
      'avg_resting_hr_bpm', v_avg_hr, 'avg_hrv', v_hrv, 'avg_sleep_latency_min', v_avg_latency,
      'avg_awakenings', v_avg_awakenings, 'hrv_available', v_hrv IS NOT NULL, 'sleep_latency_available', v_avg_latency IS NOT NULL
    ),
    'Observation only — not a diagnosis.'::text;
END;
$$;

-- _score_burnout_stress: HRV lookup corrected
CREATE OR REPLACE FUNCTION public._score_burnout_stress(p_person UUID, p_window INTEGER)
RETURNS TABLE(flagged BOOLEAN, score NUMERIC, details JSONB, message TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_avg_hr NUMERIC; v_hrv NUMERIC; v_avg_eff NUMERIC;
  v_hrv_norm NUMERIC; v_sleep_norm NUMERIC; v_rhr_inv NUMERIC; v_recovery_index NUMERIC;
BEGIN
  SELECT avg(COALESCE((value->>'bpm')::numeric, (value->>'value')::numeric)) INTO v_avg_hr
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'heart_rate'
    AND recorded_at >= now() - (p_window || ' days')::interval;

  SELECT avg(COALESCE((value->>'value')::numeric, (value->>'rmssd_ms')::numeric)) INTO v_hrv
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type IN ('heart_rate_variability', 'hrv')
    AND recorded_at >= now() - (p_window || ' days')::interval;

  SELECT avg((value->>'sleep_efficiency_percentage')::numeric) INTO v_avg_eff
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'sleep'
    AND recorded_at >= now() - (p_window || ' days')::interval;

  v_hrv_norm   := CASE WHEN v_hrv IS NULL THEN 70 ELSE LEAST(100, v_hrv / 80.0 * 100) END;
  v_sleep_norm := COALESCE(v_avg_eff, 85);
  v_rhr_inv    := CASE WHEN v_avg_hr IS NULL THEN 70 ELSE GREATEST(0, LEAST(100, 100 - (v_avg_hr - 50) * 2)) END;
  v_recovery_index := 0.35 * v_hrv_norm + 0.35 * v_sleep_norm + 0.30 * v_rhr_inv;

  RETURN QUERY SELECT
    v_recovery_index < 60,
    ROUND(v_recovery_index::numeric, 1),
    jsonb_build_object(
      'recovery_index', ROUND(v_recovery_index::numeric, 1), 'avg_resting_hr_bpm', v_avg_hr,
      'avg_hrv', v_hrv, 'avg_sleep_efficiency_pct', v_avg_eff, 'hrv_available', v_hrv IS NOT NULL
    ),
    NULL::text;
END;
$$;

-- _score_cardiovascular_risk: HRV lookup corrected
CREATE OR REPLACE FUNCTION public._score_cardiovascular_risk(p_person UUID, p_window INTEGER)
RETURNS TABLE(flagged BOOLEAN, score NUMERIC, details JSONB, message TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_avg_hr NUMERIC; v_hrv NUMERIC; v_avg_resp NUMERIC; v_age NUMERIC; v_bmi NUMERIC;
  v_hrv_inv NUMERIC; v_rhr_term NUMERIC; v_resp_term NUMERIC; v_age_term NUMERIC; v_bmi_term NUMERIC; v_risk_pct NUMERIC;
BEGIN
  SELECT avg(COALESCE((value->>'bpm')::numeric, (value->>'value')::numeric)) INTO v_avg_hr
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'heart_rate'
    AND recorded_at >= now() - (p_window || ' days')::interval;

  SELECT avg(COALESCE((value->>'value')::numeric, (value->>'rmssd_ms')::numeric)) INTO v_hrv
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type IN ('heart_rate_variability', 'hrv')
    AND recorded_at >= now() - (p_window || ' days')::interval;

  SELECT avg(COALESCE((value->>'breaths_per_minute')::numeric, (value->>'value')::numeric)) INTO v_avg_resp
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'respiratory_rate'
    AND recorded_at >= now() - (p_window || ' days')::interval;

  SELECT COALESCE(
      EXTRACT(YEAR FROM age(current_date, ep.date_of_birth)),
      EXTRACT(YEAR FROM current_date) - p.year_of_birth
    ) INTO v_age
  FROM elderly_persons ep
  LEFT JOIN profiles p ON p.id = ep.user_id
  WHERE ep.id = p_person;

  SELECT (value->>'value')::numeric INTO v_bmi
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'bmi'
    AND recorded_at >= now() - (p_window || ' days')::interval
  ORDER BY recorded_at DESC LIMIT 1;

  v_hrv_inv  := CASE WHEN v_hrv IS NULL THEN 30 ELSE GREATEST(0, LEAST(100, (60 - v_hrv) / 60.0 * 100)) END;
  v_rhr_term := CASE WHEN v_avg_hr IS NULL THEN 30 ELSE GREATEST(0, LEAST(100, (v_avg_hr - 60) / 40.0 * 100)) END;
  v_resp_term:= CASE WHEN v_avg_resp IS NULL THEN 20 ELSE GREATEST(0, LEAST(100, (v_avg_resp - 12) / 12.0 * 100)) END;
  v_age_term := CASE WHEN v_age IS NULL THEN 30 ELSE GREATEST(0, LEAST(100, v_age / 90.0 * 100)) END;
  v_bmi_term := CASE WHEN v_bmi IS NULL THEN 30 ELSE GREATEST(0, LEAST(100, (v_bmi - 18.5) / 21.5 * 100)) END;
  v_risk_pct := 0.30 * v_hrv_inv + 0.25 * v_rhr_term + 0.20 * v_resp_term + 0.15 * v_age_term + 0.10 * v_bmi_term;

  RETURN QUERY SELECT
    v_risk_pct >= 50,
    ROUND(v_risk_pct::numeric, 1),
    jsonb_build_object(
      'cvd_risk_pct', ROUND(v_risk_pct::numeric, 1), 'avg_resting_hr_bpm', v_avg_hr, 'avg_hrv', v_hrv,
      'avg_respiratory_rate', v_avg_resp, 'age_years', v_age, 'bmi', v_bmi,
      'hrv_available', v_hrv IS NOT NULL, 'respiratory_rate_available', v_avg_resp IS NOT NULL, 'bmi_available', v_bmi IS NOT NULL
    ),
    'Illustrative composite risk %, not a clinical CVD risk score.'::text;
END;
$$;

-- _score_hypertension_risk: HRV lookup corrected
CREATE OR REPLACE FUNCTION public._score_hypertension_risk(p_person UUID, p_window INTEGER)
RETURNS TABLE(flagged BOOLEAN, score NUMERIC, details JSONB, message TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_half INTEGER;
  v_baseline_night_hr NUMERIC; v_recent_night_hr NUMERIC;
  v_baseline_hrv NUMERIC; v_recent_hrv NUMERIC;
  v_avg_awakenings NUMERIC;
BEGIN
  v_half := GREATEST(1, p_window / 2);

  SELECT avg(COALESCE((value->>'bpm')::numeric, (value->>'value')::numeric)) INTO v_baseline_night_hr
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'heart_rate'
    AND recorded_at < now() - (v_half || ' days')::interval
    AND recorded_at >= now() - (p_window || ' days')::interval
    AND (EXTRACT(HOUR FROM recorded_at) >= 22 OR EXTRACT(HOUR FROM recorded_at) < 6);

  SELECT avg(COALESCE((value->>'bpm')::numeric, (value->>'value')::numeric)) INTO v_recent_night_hr
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'heart_rate'
    AND recorded_at >= now() - (v_half || ' days')::interval
    AND (EXTRACT(HOUR FROM recorded_at) >= 22 OR EXTRACT(HOUR FROM recorded_at) < 6);

  SELECT avg(COALESCE((value->>'value')::numeric, (value->>'rmssd_ms')::numeric)) INTO v_baseline_hrv
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type IN ('heart_rate_variability', 'hrv')
    AND recorded_at < now() - (v_half || ' days')::interval
    AND recorded_at >= now() - (p_window || ' days')::interval;

  SELECT avg(COALESCE((value->>'value')::numeric, (value->>'rmssd_ms')::numeric)) INTO v_recent_hrv
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type IN ('heart_rate_variability', 'hrv')
    AND recorded_at >= now() - (v_half || ' days')::interval;

  SELECT avg((value->>'awakenings_count')::numeric) INTO v_avg_awakenings
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'sleep'
    AND recorded_at >= now() - (p_window || ' days')::interval;

  RETURN QUERY SELECT
    (v_recent_night_hr IS NOT NULL AND v_baseline_night_hr IS NOT NULL AND v_recent_night_hr > v_baseline_night_hr + 10)
      AND (v_recent_hrv IS NULL OR v_baseline_hrv IS NULL OR v_recent_hrv < v_baseline_hrv),
    ROUND(LEAST(100, GREATEST(0,
      50 * (CASE WHEN v_recent_night_hr IS NULL OR v_baseline_night_hr IS NULL THEN 0
                 ELSE GREATEST(0, LEAST(1, (v_recent_night_hr - v_baseline_night_hr) / 20.0)) END)
      + 30 * (CASE WHEN v_recent_hrv IS NULL OR v_baseline_hrv IS NULL THEN 0
                   ELSE GREATEST(0, LEAST(1, (v_baseline_hrv - v_recent_hrv) / v_baseline_hrv)) END)
      + 20 * LEAST(1, COALESCE(v_avg_awakenings, 0) / 6.0)
    ))::numeric, 1),
    jsonb_build_object(
      'baseline_night_hr_bpm', v_baseline_night_hr, 'recent_night_hr_bpm', v_recent_night_hr,
      'baseline_hrv', v_baseline_hrv, 'recent_hrv', v_recent_hrv, 'avg_awakenings', v_avg_awakenings,
      'baseline_window_days', v_half, 'hrv_available', (v_baseline_hrv IS NOT NULL AND v_recent_hrv IS NOT NULL)
    ),
    format('Baseline = first %s day(s) of the %s-day window, recent = last %s day(s)', v_half, p_window, v_half)::text;
END;
$$;

-- _score_diabetes_risk: HRV lookup corrected
CREATE OR REPLACE FUNCTION public._score_diabetes_risk(p_person UUID, p_window INTEGER)
RETURNS TABLE(flagged BOOLEAN, score NUMERIC, details JSONB, message TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_avg_duration NUMERIC; v_hrv NUMERIC; v_bmi NUMERIC; v_avg_steps NUMERIC; v_avg_hr NUMERIC;
  v_bmi_term NUMERIC; v_hrv_term NUMERIC; v_sleep_term NUMERIC; v_activity_term NUMERIC; v_rhr_term NUMERIC; v_risk NUMERIC;
BEGIN
  SELECT avg((value->>'duration_minutes')::numeric) INTO v_avg_duration
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'sleep'
    AND recorded_at >= now() - (p_window || ' days')::interval;

  SELECT avg(COALESCE((value->>'value')::numeric, (value->>'rmssd_ms')::numeric)) INTO v_hrv
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type IN ('heart_rate_variability', 'hrv')
    AND recorded_at >= now() - (p_window || ' days')::interval;

  SELECT (value->>'value')::numeric INTO v_bmi
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'bmi'
    AND recorded_at >= now() - (p_window || ' days')::interval
  ORDER BY recorded_at DESC LIMIT 1;

  SELECT avg(COALESCE((value->>'count')::numeric, (value->>'value')::numeric)) INTO v_avg_steps
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'steps'
    AND recorded_at >= now() - (p_window || ' days')::interval;

  SELECT avg(COALESCE((value->>'bpm')::numeric, (value->>'value')::numeric)) INTO v_avg_hr
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'heart_rate'
    AND recorded_at >= now() - (p_window || ' days')::interval;

  v_bmi_term      := CASE WHEN v_bmi IS NULL THEN 30 ELSE GREATEST(0, LEAST(100, (v_bmi - 18.5) / 21.5 * 100)) END;
  v_hrv_term      := CASE WHEN v_hrv IS NULL THEN 30 ELSE GREATEST(0, LEAST(100, (60 - v_hrv) / 60.0 * 100)) END;
  v_sleep_term    := CASE WHEN v_avg_duration IS NULL THEN 30 ELSE GREATEST(0, LEAST(100, (420 - v_avg_duration) / 180.0 * 100)) END;
  v_activity_term := CASE WHEN v_avg_steps IS NULL THEN 30 ELSE GREATEST(0, LEAST(100, (6000 - v_avg_steps) / 6000.0 * 100)) END;
  v_rhr_term      := CASE WHEN v_avg_hr IS NULL THEN 30 ELSE GREATEST(0, LEAST(100, (v_avg_hr - 60) / 40.0 * 100)) END;
  v_risk := 0.25 * v_bmi_term + 0.20 * v_hrv_term + 0.20 * v_sleep_term + 0.20 * v_activity_term + 0.15 * v_rhr_term;

  RETURN QUERY SELECT
    v_risk >= 60,
    ROUND(v_risk::numeric, 1),
    jsonb_build_object(
      'risk_pct', ROUND(v_risk::numeric, 1),
      'risk_label', CASE WHEN v_risk >= 60 THEN 'High' WHEN v_risk >= 35 THEN 'Medium' ELSE 'Low' END,
      'avg_sleep_duration_min', v_avg_duration, 'avg_hrv', v_hrv, 'bmi', v_bmi, 'avg_daily_steps', v_avg_steps,
      'avg_resting_hr_bpm', v_avg_hr, 'hrv_available', v_hrv IS NOT NULL, 'bmi_available', v_bmi IS NOT NULL, 'steps_available', v_avg_steps IS NOT NULL
    ),
    NULL::text;
END;
$$;

-- _score_chronic_fatigue_syndrome: HRV lookup corrected
CREATE OR REPLACE FUNCTION public._score_chronic_fatigue_syndrome(p_person UUID, p_window INTEGER)
RETURNS TABLE(flagged BOOLEAN, score NUMERIC, details JSONB, message TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_half INTEGER;
  v_hrv NUMERIC; v_avg_eff NUMERIC; v_avg_duration NUMERIC;
  v_baseline_hr NUMERIC; v_recent_hr NUMERIC;
  v_recovery NUMERIC; v_sleep_debt NUMERIC; v_hr_increase NUMERIC; v_fatigue_index NUMERIC;
BEGIN
  v_half := GREATEST(1, p_window / 2);

  SELECT avg(COALESCE((value->>'value')::numeric, (value->>'rmssd_ms')::numeric)) INTO v_hrv
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type IN ('heart_rate_variability', 'hrv')
    AND recorded_at >= now() - (p_window || ' days')::interval;

  SELECT avg((value->>'sleep_efficiency_percentage')::numeric), avg((value->>'duration_minutes')::numeric)
    INTO v_avg_eff, v_avg_duration
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'sleep'
    AND recorded_at >= now() - (p_window || ' days')::interval;

  SELECT avg(COALESCE((value->>'bpm')::numeric, (value->>'value')::numeric)) INTO v_baseline_hr
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'heart_rate'
    AND recorded_at < now() - (v_half || ' days')::interval
    AND recorded_at >= now() - (p_window || ' days')::interval;

  SELECT avg(COALESCE((value->>'bpm')::numeric, (value->>'value')::numeric)) INTO v_recent_hr
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'heart_rate'
    AND recorded_at >= now() - (v_half || ' days')::interval;

  v_recovery    := 0.5 * COALESCE(LEAST(100, v_hrv / 80.0 * 100), 60) + 0.5 * COALESCE(v_avg_eff, 85);
  v_sleep_debt  := GREATEST(0, LEAST(100, (480 - COALESCE(v_avg_duration, 480)) / 180.0 * 100));
  v_hr_increase := CASE WHEN v_baseline_hr IS NULL OR v_recent_hr IS NULL THEN 0
                        ELSE GREATEST(0, LEAST(100, (v_recent_hr - v_baseline_hr) * 5)) END;
  v_fatigue_index := v_recovery - v_sleep_debt - v_hr_increase;

  RETURN QUERY SELECT
    v_fatigue_index < 40,
    ROUND(GREATEST(0, LEAST(100, 100 - v_fatigue_index))::numeric, 1),
    jsonb_build_object(
      'fatigue_index', ROUND(v_fatigue_index::numeric, 1), 'recovery_component', ROUND(v_recovery::numeric, 1),
      'sleep_debt_component', ROUND(v_sleep_debt::numeric, 1), 'hr_increase_component', ROUND(v_hr_increase::numeric, 1),
      'avg_hrv', v_hrv, 'avg_sleep_efficiency_pct', v_avg_eff, 'baseline_window_days', v_half,
      'hrv_available', v_hrv IS NOT NULL
    ),
    NULL::text;
END;
$$;
