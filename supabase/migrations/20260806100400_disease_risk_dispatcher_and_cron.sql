-- Dispatcher + entry points + daily cron for disease-risk detection.

-- Runs every active disease check for one person. Looks up each row in
-- disease_risk_thresholds, counts available days of data, decides the checkpoint window via
-- disease_risk_tier(), and — if there's at least the minimum bucket's worth of data — calls
-- the matching public._score_<disease_key>(uuid, integer) function and stores the result.
-- Adding disease #18 later requires only a new threshold row + a new _score_ function; this
-- function does not need to change.
CREATE OR REPLACE FUNCTION public.compute_disease_risk_for_person(p_elderly_person_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r RECORD;
  v_days INTEGER;
  v_tier TEXT;
  v_window INTEGER;
  v_stars SMALLINT;
  v_flagged BOOLEAN;
  v_score NUMERIC;
  v_details JSONB;
  v_message TEXT;
BEGIN
  FOR r IN
    SELECT disease_key, min_bucket_days, recommended_bucket_days, base_confidence_stars, required_data_types
    FROM public.disease_risk_thresholds
    WHERE is_active = true
    ORDER BY disease_key
  LOOP
    v_days := public.count_distinct_data_days(p_elderly_person_id, r.required_data_types, 180);

    SELECT t.tier, t.window_days, t.stars
      INTO v_tier, v_window, v_stars
    FROM public.disease_risk_tier(v_days, r.min_bucket_days, r.recommended_bucket_days, r.base_confidence_stars) t;

    IF v_tier = 'insufficient_data' THEN
      PERFORM public.upsert_disease_risk_flag(p_elderly_person_id, r.disease_key, v_days, false, NULL, '{}'::jsonb, NULL);
      CONTINUE;
    END IF;

    v_flagged := NULL; v_score := NULL; v_details := NULL; v_message := NULL;

    BEGIN
      EXECUTE format('SELECT flagged, score, details, message FROM public.%I($1, $2)', '_score_' || r.disease_key)
        INTO v_flagged, v_score, v_details, v_message
        USING p_elderly_person_id, v_window;
    EXCEPTION WHEN undefined_function THEN
      RAISE WARNING 'No scoring function _score_% for disease %; skipping', r.disease_key, r.disease_key;
      CONTINUE;
    END;

    PERFORM public.upsert_disease_risk_flag(
      p_elderly_person_id, r.disease_key, v_days, COALESCE(v_flagged, false), v_score,
      COALESCE(v_details, '{}'::jsonb), v_message
    );
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.compute_disease_risk_for_person(UUID) FROM PUBLIC;

-- Public entry point: call this after login / app-open. Runs at most once per calendar day
-- per elderly_person_id — a same-day second call is a cheap no-op that just returns the
-- already-computed results. Safe to call from the frontend on every session start.
CREATE OR REPLACE FUNCTION public.run_disease_risk_analysis(
  p_elderly_person_id UUID,
  p_source TEXT DEFAULT 'rpc'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_did_run BOOLEAN;
  v_flagged_json JSONB;
BEGIN
  -- auth.uid() is NULL when invoked from a trusted server context (pg_cron); a real
  -- authenticated caller must have access to the elderly person they're requesting.
  IF auth.uid() IS NOT NULL
     AND NOT (public.has_role(auth.uid(), 'admin') OR public.can_access_elderly_person(auth.uid(), p_elderly_person_id))
  THEN
    RAISE EXCEPTION 'not authorized to run disease risk analysis for this elderly person';
  END IF;

  WITH upsert AS (
    INSERT INTO public.disease_risk_analysis_runs (elderly_person_id, last_run_date, last_run_at, last_run_source)
    VALUES (p_elderly_person_id, CURRENT_DATE, now(), p_source)
    ON CONFLICT (elderly_person_id) DO UPDATE
      SET last_run_date = EXCLUDED.last_run_date, last_run_at = EXCLUDED.last_run_at, last_run_source = EXCLUDED.last_run_source
      WHERE public.disease_risk_analysis_runs.last_run_date < EXCLUDED.last_run_date
    RETURNING elderly_person_id
  )
  SELECT EXISTS(SELECT 1 FROM upsert) INTO v_did_run;

  IF v_did_run THEN
    PERFORM public.compute_disease_risk_for_person(p_elderly_person_id);
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
      'disease_key', f.disease_key, 'disease_name', t.disease_name, 'category', t.category,
      'confidence_tier', f.confidence_tier, 'confidence_stars', f.confidence_stars,
      'score', f.score, 'days_of_data', f.days_of_data, 'message', f.message
    ) ORDER BY f.confidence_stars DESC, f.score DESC NULLS LAST)
    INTO v_flagged_json
  FROM public.disease_risk_flags f
  JOIN public.disease_risk_thresholds t ON t.disease_key = f.disease_key
  WHERE f.elderly_person_id = p_elderly_person_id AND f.flagged = true;

  RETURN jsonb_build_object(
    'status', CASE WHEN v_did_run THEN 'computed' ELSE 'already_run_today' END,
    'elderly_person_id', p_elderly_person_id,
    'computed_date', CURRENT_DATE,
    'flagged_diseases', COALESCE(v_flagged_json, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_disease_risk_analysis(UUID, TEXT) TO authenticated;

-- Nightly batch: runs the same once-per-day-guarded entry point for every active elderly
-- person, so anyone who didn't trigger it via login still gets analyzed once a day.
CREATE OR REPLACE FUNCTION public.run_disease_risk_analysis_for_all()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.elderly_persons WHERE status = 'active' LOOP
    BEGIN
      PERFORM public.run_disease_risk_analysis(r.id, 'cron');
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'disease risk analysis failed for elderly_person %: %', r.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.run_disease_risk_analysis_for_all() FROM PUBLIC;

-- pg_cron is already enabled on this project (see 20251217100000_setup_scheduled_reports_cron.sql);
-- re-issuing CREATE EXTENSION here re-triggers Supabase's extension install hook and conflicts
-- with the grants that migration already put in place, so it's deliberately not repeated.

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'daily-disease-risk-analysis';
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

SELECT cron.schedule(
  'daily-disease-risk-analysis',
  '0 3 * * *',
  $$SELECT public.run_disease_risk_analysis_for_all();$$
);
