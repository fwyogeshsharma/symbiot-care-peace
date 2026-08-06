-- Per-disease scoring functions, one per row in disease_risk_thresholds.
-- Naming convention: public._score_<disease_key>(p_person uuid, p_window integer)
--   RETURNS TABLE(flagged boolean, score numeric, details jsonb, message text)
-- p_window is the checkpoint (15/30/60/90/180) the dispatcher decided this person qualifies
-- for; every query below looks back exactly that many days from now().
--
-- These are rule-based flags (tier 1 of the model progression the reference doc itself
-- recommends: "rule-based flags -> weighted scores -> classical ML"). Thresholds are
-- illustrative placeholders per diseses_triggre.md's own disclaimer, not clinically
-- validated cutoffs. Outputs are wellness signals, never a diagnosis.
--
-- Known approximations (device_data has no explicit sleep-stage timestamps, no discrete
-- apnea-event/leg-movement counters, and no per-user timezone):
--   * "Night" = recorded_at hour >= 22 or < 6 (server/UTC time, not the user's local time).
--   * Implied bedtime = sleep.recorded_at - sleep.duration_minutes (recorded_at is assumed
--     to be logged at wake time, matching how supabase/functions/device-ingest writes it).
--   * AHI / periodic-leg-movement-index need discrete event counts we don't ingest; SpO2
--     dips, sleep efficiency, and nightly `movement` row counts are used as proxies instead.
--   * JSONB value keys vary by source device, so every numeric read COALESCEs the plausible
--     key names (e.g. 'bpm'/'value' for heart_rate) rather than assuming one fixed schema.

-- =========================================================================
-- 1. Sleep Apnea (diseses_triggre.md #2) — AHI proxy via SpO2 dips + efficiency + awakenings
-- =========================================================================
CREATE OR REPLACE FUNCTION public._score_sleep_apnea(p_person UUID, p_window INTEGER)
RETURNS TABLE(flagged BOOLEAN, score NUMERIC, details JSONB, message TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nights INTEGER; v_avg_eff NUMERIC; v_avg_awakenings NUMERIC;
  v_avg_spo2 NUMERIC; v_min_spo2 NUMERIC; v_dip_nights INTEGER;
BEGIN
  SELECT count(*), avg((value->>'sleep_efficiency_percentage')::numeric), avg((value->>'awakenings_count')::numeric)
    INTO v_nights, v_avg_eff, v_avg_awakenings
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'sleep'
    AND recorded_at >= now() - (p_window || ' days')::interval;

  SELECT avg(COALESCE((value->>'percentage')::numeric, (value->>'value')::numeric)),
         min(COALESCE((value->>'percentage')::numeric, (value->>'value')::numeric)),
         count(*) FILTER (WHERE COALESCE((value->>'percentage')::numeric, (value->>'value')::numeric) < 94)
    INTO v_avg_spo2, v_min_spo2, v_dip_nights
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'oxygen_saturation'
    AND recorded_at >= now() - (p_window || ' days')::interval;

  RETURN QUERY SELECT
    (COALESCE(v_dip_nights, 0) >= GREATEST(3, p_window / 4) AND COALESCE(v_avg_eff, 100) < 85)
      OR (COALESCE(v_avg_eff, 100) < 80 AND COALESCE(v_avg_awakenings, 0) > 3),
    ROUND(GREATEST(0, LEAST(100,
        40 * (CASE WHEN v_avg_spo2 IS NULL THEN 0 ELSE GREATEST(0, (96 - v_avg_spo2) / 6.0) END)
      + 30 * (CASE WHEN v_avg_eff IS NULL THEN 0 ELSE GREATEST(0, (85 - v_avg_eff) / 85.0) END)
      + 30 * (CASE WHEN v_avg_awakenings IS NULL THEN 0 ELSE LEAST(1, v_avg_awakenings / 6.0) END)
    ))::numeric, 1),
    jsonb_build_object(
      'nights_analyzed', v_nights, 'avg_sleep_efficiency_pct', v_avg_eff,
      'avg_awakenings', v_avg_awakenings, 'spo2_dip_nights_lt94pct', v_dip_nights,
      'avg_spo2_pct', v_avg_spo2, 'min_spo2_pct', v_min_spo2
    ),
    'Proxy from SpO2 dips + sleep efficiency + awakenings (no discrete apnea-event/AHI sensor)'::text;
END;
$$;

-- =========================================================================
-- 2. Insomnia (#1) — doc: efficiency<85 AND latency>30 AND awakenings>3, sustained
-- =========================================================================
CREATE OR REPLACE FUNCTION public._score_insomnia(p_person UUID, p_window INTEGER)
RETURNS TABLE(flagged BOOLEAN, score NUMERIC, details JSONB, message TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nights INTEGER; v_eff NUMERIC; v_awakenings NUMERIC; v_latency NUMERIC; v_duration NUMERIC;
  v_eff_bad NUMERIC; v_lat_bad NUMERIC; v_waso_bad NUMERIC; v_dur_bad NUMERIC;
BEGIN
  SELECT count(*), avg((value->>'sleep_efficiency_percentage')::numeric),
         avg((value->>'awakenings_count')::numeric),
         avg((value->>'sleep_latency_minutes')::numeric),
         avg((value->>'duration_minutes')::numeric)
    INTO v_nights, v_eff, v_awakenings, v_latency, v_duration
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'sleep'
    AND recorded_at >= now() - (p_window || ' days')::interval;

  v_eff_bad  := CASE WHEN v_eff IS NULL THEN 0 ELSE GREATEST(0, LEAST(1, (85 - v_eff) / 85.0)) END;
  v_lat_bad  := CASE WHEN v_latency IS NULL THEN 0 ELSE GREATEST(0, LEAST(1, (v_latency - 30) / 60.0)) END;
  v_waso_bad := CASE WHEN v_awakenings IS NULL THEN 0 ELSE LEAST(1, v_awakenings / 6.0) END;
  v_dur_bad  := CASE WHEN v_duration IS NULL THEN 0 ELSE GREATEST(0, LEAST(1, (420 - v_duration) / 180.0)) END;

  RETURN QUERY SELECT
    COALESCE(v_eff, 100) < 85 AND COALESCE(v_latency, 0) > 30 AND COALESCE(v_awakenings, 0) > 3,
    ROUND((35 * v_eff_bad + 25 * v_lat_bad + 20 * v_waso_bad + 20 * v_dur_bad)::numeric, 1),
    jsonb_build_object(
      'nights_analyzed', v_nights, 'avg_sleep_efficiency_pct', v_eff, 'avg_awakenings', v_awakenings,
      'avg_sleep_latency_min', v_latency, 'avg_duration_min', v_duration,
      'sleep_latency_available', v_latency IS NOT NULL
    ),
    CASE WHEN v_latency IS NULL THEN 'sleep_latency_minutes not present in source data; latency term defaulted to 0 (no penalty)' ELSE NULL END::text;
END;
$$;

-- =========================================================================
-- 3. Circadian Rhythm Disorder (#3) — doc: bedtime std > 90 min -> risk
-- =========================================================================
CREATE OR REPLACE FUNCTION public._score_circadian_rhythm_disorder(p_person UUID, p_window INTEGER)
RETURNS TABLE(flagged BOOLEAN, score NUMERIC, details JSONB, message TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nights INTEGER; v_bedtime_std NUMERIC; v_waketime_std NUMERIC;
BEGIN
  WITH s AS (
    SELECT
      MOD(CAST(EXTRACT(HOUR FROM (recorded_at - ((value->>'duration_minutes')::numeric || ' minutes')::interval)) * 60
             + EXTRACT(MINUTE FROM (recorded_at - ((value->>'duration_minutes')::numeric || ' minutes')::interval))
             + 720 AS INTEGER), 1440) AS bedtime_min_shifted,
      MOD(CAST(EXTRACT(HOUR FROM recorded_at) * 60 + EXTRACT(MINUTE FROM recorded_at) + 720 AS INTEGER), 1440) AS waketime_min_shifted
    FROM device_data
    WHERE elderly_person_id = p_person AND data_type = 'sleep'
      AND recorded_at >= now() - (p_window || ' days')::interval
      AND value ? 'duration_minutes'
  )
  SELECT count(*), stddev(bedtime_min_shifted), stddev(waketime_min_shifted)
    INTO v_nights, v_bedtime_std, v_waketime_std
  FROM s;

  RETURN QUERY SELECT
    COALESCE(v_bedtime_std, 0) > 90,
    ROUND(LEAST(100, GREATEST(0, COALESCE(v_bedtime_std, 0) / 180.0 * 100))::numeric, 1),
    jsonb_build_object(
      'nights_analyzed', v_nights, 'bedtime_std_minutes', v_bedtime_std, 'waketime_std_minutes', v_waketime_std,
      'note', 'bedtime is implied (recorded_at - duration_minutes), not a directly logged lights-off time'
    ),
    NULL::text;
END;
$$;

-- =========================================================================
-- 4. Restless Leg Syndrome (#4) — doc: PLMI = leg movements / sleep hour > 15
-- Proxy: nightly `movement` rows / (nights * avg sleep hours)
-- =========================================================================
CREATE OR REPLACE FUNCTION public._score_restless_leg_syndrome(p_person UUID, p_window INTEGER)
RETURNS TABLE(flagged BOOLEAN, score NUMERIC, details JSONB, message TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nights INTEGER; v_avg_sleep_hours NUMERIC; v_night_movements INTEGER; v_plmi NUMERIC;
BEGIN
  SELECT count(*), avg((value->>'duration_minutes')::numeric) / 60.0
    INTO v_nights, v_avg_sleep_hours
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'sleep'
    AND recorded_at >= now() - (p_window || ' days')::interval;

  SELECT count(*) INTO v_night_movements
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'movement'
    AND recorded_at >= now() - (p_window || ' days')::interval
    AND (EXTRACT(HOUR FROM recorded_at) >= 22 OR EXTRACT(HOUR FROM recorded_at) < 6);

  v_plmi := v_night_movements / NULLIF(GREATEST(1, v_nights) * GREATEST(COALESCE(v_avg_sleep_hours, 0), 1), 0);

  RETURN QUERY SELECT
    COALESCE(v_plmi, 0) > 15,
    ROUND(LEAST(100, GREATEST(0, COALESCE(v_plmi, 0) / 30.0 * 100))::numeric, 1),
    jsonb_build_object(
      'nights_analyzed', v_nights, 'avg_sleep_hours', v_avg_sleep_hours,
      'night_movement_events', v_night_movements, 'plmi_proxy', v_plmi
    ),
    'PLMI approximated from nightly movement-sensor row counts, not discrete leg-movement events'::text;
END;
$$;

-- =========================================================================
-- 5. REM Sleep Behavior Disorder (#5) — doc: elevated REM movement, persistent
-- Proxy: night movement events per hour of REM sleep
-- =========================================================================
CREATE OR REPLACE FUNCTION public._score_rem_sleep_behavior_disorder(p_person UUID, p_window INTEGER)
RETURNS TABLE(flagged BOOLEAN, score NUMERIC, details JSONB, message TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nights INTEGER; v_rem_hours NUMERIC; v_night_movements INTEGER; v_movement_per_rem_hour NUMERIC;
BEGIN
  SELECT count(*), sum((value->'stage_minutes'->>'rem_minutes')::numeric) / 60.0
    INTO v_nights, v_rem_hours
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'sleep'
    AND recorded_at >= now() - (p_window || ' days')::interval;

  SELECT count(*) INTO v_night_movements
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'movement'
    AND recorded_at >= now() - (p_window || ' days')::interval
    AND (EXTRACT(HOUR FROM recorded_at) >= 22 OR EXTRACT(HOUR FROM recorded_at) < 6);

  v_movement_per_rem_hour := v_night_movements / NULLIF(v_rem_hours, 0);

  RETURN QUERY SELECT
    v_movement_per_rem_hour IS NOT NULL AND v_movement_per_rem_hour > 10,
    ROUND(LEAST(100, GREATEST(0, COALESCE(v_movement_per_rem_hour, 0) / 20.0 * 100))::numeric, 1),
    jsonb_build_object(
      'nights_analyzed', v_nights, 'total_rem_hours', v_rem_hours,
      'night_movement_events', v_night_movements, 'movement_per_rem_hour_proxy', v_movement_per_rem_hour
    ),
    'No dedicated in-REM movement sensor; uses all-night movement rate against total REM hours'::text;
END;
$$;

-- =========================================================================
-- 6. Chronic Sleep Deprivation — doc table: total sleep time low, sustained
-- =========================================================================
CREATE OR REPLACE FUNCTION public._score_chronic_sleep_deprivation(p_person UUID, p_window INTEGER)
RETURNS TABLE(flagged BOOLEAN, score NUMERIC, details JSONB, message TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nights INTEGER; v_avg_duration NUMERIC;
BEGIN
  SELECT count(*), avg((value->>'duration_minutes')::numeric)
    INTO v_nights, v_avg_duration
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'sleep'
    AND recorded_at >= now() - (p_window || ' days')::interval;

  RETURN QUERY SELECT
    COALESCE(v_avg_duration, 480) < 420,
    ROUND(LEAST(100, GREATEST(0, (420 - COALESCE(v_avg_duration, 480)) / 180.0 * 100))::numeric, 1),
    jsonb_build_object('nights_analyzed', v_nights, 'avg_duration_min', v_avg_duration, 'avg_duration_hours', ROUND(v_avg_duration / 60.0, 2)),
    NULL::text;
END;
$$;

-- =========================================================================
-- 7. Depression Risk (#9) — doc: reduced deep sleep, elevated awakenings/variability, lower HRV
-- =========================================================================
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
  WHERE elderly_person_id = p_person AND data_type = 'hrv'
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

-- =========================================================================
-- 8. Anxiety Risk (#8) — doc: 0.30 HRV_inv + 0.30 SleepLatency + 0.20 RHR + 0.20 Awakenings
-- =========================================================================
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
  WHERE elderly_person_id = p_person AND data_type = 'hrv'
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

-- =========================================================================
-- 9. Burnout / Stress (#10) — doc: RecoveryIndex = .35 HRV + .35 SleepScore + .30 RHR_inv; <60 -> risk
-- =========================================================================
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
  WHERE elderly_person_id = p_person AND data_type = 'hrv'
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

-- =========================================================================
-- 10. Cardiovascular Risk (#15) — doc: .30 HRV_inv + .25 RHR + .20 Resp + .15 Age + .10 BMI
-- =========================================================================
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
  WHERE elderly_person_id = p_person AND data_type = 'hrv'
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

-- =========================================================================
-- 11. Hypertension Risk (#16) — doc: NightHR > baseline+10 AND HRV decreasing, sustained
-- =========================================================================
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
  WHERE elderly_person_id = p_person AND data_type = 'hrv'
    AND recorded_at < now() - (v_half || ' days')::interval
    AND recorded_at >= now() - (p_window || ' days')::interval;

  SELECT avg(COALESCE((value->>'value')::numeric, (value->>'rmssd_ms')::numeric)) INTO v_recent_hrv
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'hrv'
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

-- =========================================================================
-- 12. Diabetes Risk (#19) — doc: .25 BMI + .20 HRV_inv + .20 Sleep_inv + .20 Activity_inv + .15 RHR
-- =========================================================================
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
  WHERE elderly_person_id = p_person AND data_type = 'hrv'
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

-- =========================================================================
-- 13. Obesity Risk (#20) — doc: sleep < 6h sustained -> weight gain risk
-- =========================================================================
CREATE OR REPLACE FUNCTION public._score_obesity_risk(p_person UUID, p_window INTEGER)
RETURNS TABLE(flagged BOOLEAN, score NUMERIC, details JSONB, message TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nights INTEGER; v_avg_duration NUMERIC; v_duration_std NUMERIC;
BEGIN
  SELECT count(*), avg((value->>'duration_minutes')::numeric), stddev((value->>'duration_minutes')::numeric)
    INTO v_nights, v_avg_duration, v_duration_std
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'sleep'
    AND recorded_at >= now() - (p_window || ' days')::interval;

  RETURN QUERY SELECT
    COALESCE(v_avg_duration, 480) < 360,
    ROUND(LEAST(100, GREATEST(0, (360 - COALESCE(v_avg_duration, 480)) / 120.0 * 100))::numeric, 1),
    jsonb_build_object(
      'nights_analyzed', v_nights, 'avg_duration_min', v_avg_duration,
      'avg_duration_hours', ROUND(v_avg_duration / 60.0, 2), 'duration_std_minutes', v_duration_std
    ),
    NULL::text;
END;
$$;

-- =========================================================================
-- 14. Cognitive Decline Risk (#11) — doc: trends over months, not single nights
-- Compares deep-sleep % in the first half of the window vs the second half.
-- =========================================================================
CREATE OR REPLACE FUNCTION public._score_cognitive_decline_risk(p_person UUID, p_window INTEGER)
RETURNS TABLE(flagged BOOLEAN, score NUMERIC, details JSONB, message TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_half INTEGER; v_early_deep_pct NUMERIC; v_recent_deep_pct NUMERIC; v_decline_pct NUMERIC;
BEGIN
  v_half := GREATEST(1, p_window / 2);

  SELECT avg((value->'stage_minutes'->>'deep_minutes')::numeric / NULLIF((value->>'duration_minutes')::numeric, 0) * 100)
    INTO v_early_deep_pct
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'sleep'
    AND recorded_at < now() - (v_half || ' days')::interval
    AND recorded_at >= now() - (p_window || ' days')::interval;

  SELECT avg((value->'stage_minutes'->>'deep_minutes')::numeric / NULLIF((value->>'duration_minutes')::numeric, 0) * 100)
    INTO v_recent_deep_pct
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'sleep'
    AND recorded_at >= now() - (v_half || ' days')::interval;

  v_decline_pct := CASE WHEN v_early_deep_pct IS NULL OR v_early_deep_pct = 0 THEN NULL
                        ELSE (v_early_deep_pct - v_recent_deep_pct) / v_early_deep_pct * 100 END;

  RETURN QUERY SELECT
    v_decline_pct IS NOT NULL AND v_decline_pct > 20,
    ROUND(LEAST(100, GREATEST(0, COALESCE(v_decline_pct, 0)))::numeric, 1),
    jsonb_build_object(
      'early_period_deep_sleep_pct', v_early_deep_pct, 'recent_period_deep_sleep_pct', v_recent_deep_pct,
      'deep_sleep_decline_pct', v_decline_pct, 'comparison_half_days', v_half
    ),
    'Trend signal, not a diagnosis — requires long-term (multi-month) tracking to be meaningful.'::text;
END;
$$;

-- =========================================================================
-- 15. Parkinson's Early Risk (#14) — doc: REM movement + tremor persist 90d; builds on RBD
-- =========================================================================
CREATE OR REPLACE FUNCTION public._score_parkinsons_early_risk(p_person UUID, p_window INTEGER)
RETURNS TABLE(flagged BOOLEAN, score NUMERIC, details JSONB, message TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nights INTEGER; v_rem_hours NUMERIC; v_night_movements INTEGER; v_movement_per_rem_hour NUMERIC;
BEGIN
  SELECT count(*), sum((value->'stage_minutes'->>'rem_minutes')::numeric) / 60.0
    INTO v_nights, v_rem_hours
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'sleep'
    AND recorded_at >= now() - (p_window || ' days')::interval;

  SELECT count(*) INTO v_night_movements
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'movement'
    AND recorded_at >= now() - (p_window || ' days')::interval
    AND (EXTRACT(HOUR FROM recorded_at) >= 22 OR EXTRACT(HOUR FROM recorded_at) < 6);

  v_movement_per_rem_hour := v_night_movements / NULLIF(v_rem_hours, 0);

  RETURN QUERY SELECT
    v_movement_per_rem_hour IS NOT NULL AND v_movement_per_rem_hour > 10 AND v_nights >= p_window * 0.7,
    ROUND(LEAST(100, GREATEST(0, COALESCE(v_movement_per_rem_hour, 0) / 20.0 * 100))::numeric, 1),
    jsonb_build_object(
      'nights_analyzed', v_nights, 'total_rem_hours', v_rem_hours,
      'night_movement_events', v_night_movements, 'movement_per_rem_hour_proxy', v_movement_per_rem_hour
    ),
    'Neurological early-warning proxy, persistent-only. If flagged, recommend clinical evaluation, not self-diagnosis.'::text;
END;
$$;

-- =========================================================================
-- 16. Alzheimer's Risk (#12) — doc: deep sleep < 10% for 180 days -> high risk
-- =========================================================================
CREATE OR REPLACE FUNCTION public._score_alzheimers_risk(p_person UUID, p_window INTEGER)
RETURNS TABLE(flagged BOOLEAN, score NUMERIC, details JSONB, message TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nights INTEGER; v_avg_deep_pct NUMERIC;
BEGIN
  SELECT count(*), avg((value->'stage_minutes'->>'deep_minutes')::numeric / NULLIF((value->>'duration_minutes')::numeric, 0) * 100)
    INTO v_nights, v_avg_deep_pct
  FROM device_data
  WHERE elderly_person_id = p_person AND data_type = 'sleep'
    AND recorded_at >= now() - (p_window || ' days')::interval;

  RETURN QUERY SELECT
    COALESCE(v_avg_deep_pct, 100) < 10,
    ROUND(LEAST(100, GREATEST(0, (10 - COALESCE(v_avg_deep_pct, 100)) / 10.0 * 100))::numeric, 1),
    jsonb_build_object('nights_analyzed', v_nights, 'avg_deep_sleep_pct', v_avg_deep_pct),
    'Very long observation window; a single 180-day snapshot, not a repeated-trend confirmation. Recommend clinical evaluation if flagged.'::text;
END;
$$;

-- =========================================================================
-- 17. Chronic Fatigue Syndrome (#21) — doc: FatigueIndex = Recovery - SleepDebt - HR_Increase
-- =========================================================================
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
  WHERE elderly_person_id = p_person AND data_type = 'hrv'
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
