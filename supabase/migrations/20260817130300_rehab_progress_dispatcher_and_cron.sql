-- Dispatcher + entry points + daily cron for rehab-progress scoring.

-- Runs all 5 domain checks for one person. Looks up their active rehab_enrollments row,
-- guards against baseline/recent windows overlapping (skips scoring entirely while the
-- baseline is still being established), then calls each public._rehab_score_<domain>()
-- and stores the result plus a composite. Adding domain #6 later requires only a new
-- CHECK-constraint value on rehab_domain_scores.domain_key, a new _rehab_score_ function,
-- and adding the key to v_domains below.
CREATE OR REPLACE FUNCTION public.compute_rehab_progress_for_person(p_elderly_person_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_enrollment RECORD;
  v_elapsed_days INTEGER;
  v_required_days INTEGER;
  v_bounds RECORD;
  v_domains TEXT[] := ARRAY['mobility', 'cardio', 'body_comp', 'sleep', 'manual'];
  v_domain TEXT;
  v_score NUMERIC; v_baseline_days INTEGER; v_recent_days INTEGER; v_details JSONB; v_message TEXT;
  v_confidence TEXT;
  v_breakdown JSONB := '{}'::jsonb;
  v_overall_score NUMERIC;
  v_overall_trend TEXT;
  v_domains_scored INTEGER;
BEGIN
  SELECT * INTO v_enrollment FROM public.rehab_enrollments
  WHERE elderly_person_id = p_elderly_person_id AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_elapsed_days := GREATEST(0, CURRENT_DATE - v_enrollment.program_start_date);
  v_required_days := v_enrollment.baseline_window_days * 2;

  -- Baseline and recent windows would overlap if the program hasn't run long enough yet —
  -- skip the scoring functions entirely rather than compare a window against itself.
  IF v_elapsed_days < v_required_days THEN
    FOREACH v_domain IN ARRAY v_domains LOOP
      PERFORM public.upsert_rehab_domain_score(
        p_elderly_person_id, v_domain, 'insufficient_data', NULL, v_elapsed_days, 0, '{}'::jsonb,
        format('Baseline period in progress - %s of %s days needed before progress can be measured', v_elapsed_days, v_required_days)
      );
    END LOOP;

    INSERT INTO public.rehab_progress_history (
      elderly_person_id, overall_score, overall_trend, domains_scored, domain_breakdown, computed_date, updated_at
    ) VALUES (
      p_elderly_person_id, NULL, NULL, 0,
      jsonb_build_object('baseline_progress', jsonb_build_object('elapsed_days', v_elapsed_days, 'required_days', v_required_days)),
      CURRENT_DATE, now()
    )
    ON CONFLICT (elderly_person_id, computed_date) DO UPDATE SET
      overall_score = NULL, overall_trend = NULL, domains_scored = 0,
      domain_breakdown = EXCLUDED.domain_breakdown, updated_at = now();

    RETURN;
  END IF;

  SELECT * INTO v_bounds FROM public.rehab_window_bounds(v_enrollment.program_start_date, v_enrollment.baseline_window_days);

  FOREACH v_domain IN ARRAY v_domains LOOP
    v_score := NULL; v_baseline_days := 0; v_recent_days := 0; v_details := '{}'::jsonb; v_message := NULL;

    BEGIN
      EXECUTE format('SELECT score, baseline_days, recent_days, details, message FROM public.%I($1, $2, $3, $4, $5)',
        '_rehab_score_' || v_domain)
        INTO v_score, v_baseline_days, v_recent_days, v_details, v_message
        USING p_elderly_person_id, v_bounds.baseline_start, v_bounds.baseline_end, v_bounds.recent_start, v_bounds.recent_end;
    EXCEPTION WHEN undefined_function THEN
      RAISE WARNING 'No scoring function _rehab_score_% for domain %; skipping', v_domain, v_domain;
      CONTINUE;
    END;

    v_confidence := public.rehab_score_confidence(v_baseline_days, v_recent_days, v_enrollment.baseline_window_days);

    PERFORM public.upsert_rehab_domain_score(
      p_elderly_person_id, v_domain, v_confidence, v_score, v_baseline_days, v_recent_days, v_details, v_message
    );

    v_breakdown := v_breakdown || jsonb_build_object(v_domain, jsonb_build_object(
      'confidence', v_confidence,
      'score', CASE WHEN v_confidence = 'insufficient_data' THEN NULL ELSE v_score END,
      'trend', CASE
        WHEN v_confidence = 'insufficient_data' OR v_score IS NULL THEN NULL
        WHEN v_score >= 60 THEN 'improving'
        WHEN v_score <= 40 THEN 'declining'
        ELSE 'stable'
      END
    ));
  END LOOP;

  SELECT AVG((value->>'score')::numeric),
         COUNT(*) FILTER (WHERE (value->>'confidence') <> 'insufficient_data' AND (value->>'score') IS NOT NULL)
    INTO v_overall_score, v_domains_scored
  FROM jsonb_each(v_breakdown);

  v_overall_trend := CASE
    WHEN v_overall_score IS NULL THEN NULL
    WHEN v_overall_score >= 60 THEN 'improving'
    WHEN v_overall_score <= 40 THEN 'declining'
    ELSE 'stable'
  END;

  INSERT INTO public.rehab_progress_history (
    elderly_person_id, overall_score, overall_trend, domains_scored, domain_breakdown, computed_date, updated_at
  ) VALUES (
    p_elderly_person_id, v_overall_score, v_overall_trend, COALESCE(v_domains_scored, 0), v_breakdown, CURRENT_DATE, now()
  )
  ON CONFLICT (elderly_person_id, computed_date) DO UPDATE SET
    overall_score = EXCLUDED.overall_score, overall_trend = EXCLUDED.overall_trend,
    domains_scored = EXCLUDED.domains_scored, domain_breakdown = EXCLUDED.domain_breakdown, updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.compute_rehab_progress_for_person(UUID) FROM PUBLIC;

-- Public entry point: call this after login / app-open, or whenever the rehab card is
-- viewed. Runs at most once per calendar day per elderly_person_id — a same-day second
-- call is a cheap no-op that just re-reads the already-computed results. Also carries
-- enrollment/baseline metadata on every call so the frontend can render the right state
-- (no program yet / establishing baseline / scored) without a second round trip.
CREATE OR REPLACE FUNCTION public.run_rehab_progress_analysis(
  p_elderly_person_id UUID,
  p_source TEXT DEFAULT 'rpc'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_did_run BOOLEAN;
  v_enrollment RECORD;
  v_elapsed_days INTEGER;
  v_required_days INTEGER;
  v_history RECORD;
  v_domains_json JSONB;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT (public.has_role(auth.uid(), 'admin') OR public.can_access_elderly_person(auth.uid(), p_elderly_person_id))
  THEN
    RAISE EXCEPTION 'not authorized to run rehab progress analysis for this elderly person';
  END IF;

  SELECT * INTO v_enrollment FROM public.rehab_enrollments
  WHERE elderly_person_id = p_elderly_person_id AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'no_active_enrollment',
      'elderly_person_id', p_elderly_person_id,
      'computed_date', CURRENT_DATE,
      'enrollment', NULL,
      'baseline_progress', NULL,
      'overall_score', NULL, 'overall_trend', NULL, 'domains_scored', 0,
      'domains', '[]'::jsonb
    );
  END IF;

  WITH upsert AS (
    INSERT INTO public.rehab_progress_analysis_runs (elderly_person_id, last_run_date, last_run_at, last_run_source)
    VALUES (p_elderly_person_id, CURRENT_DATE, now(), p_source)
    ON CONFLICT (elderly_person_id) DO UPDATE
      SET last_run_date = EXCLUDED.last_run_date, last_run_at = EXCLUDED.last_run_at, last_run_source = EXCLUDED.last_run_source
      WHERE public.rehab_progress_analysis_runs.last_run_date < EXCLUDED.last_run_date
    RETURNING elderly_person_id
  )
  SELECT EXISTS(SELECT 1 FROM upsert) INTO v_did_run;

  IF v_did_run THEN
    PERFORM public.compute_rehab_progress_for_person(p_elderly_person_id);
  END IF;

  v_elapsed_days := GREATEST(0, CURRENT_DATE - v_enrollment.program_start_date);
  v_required_days := v_enrollment.baseline_window_days * 2;

  SELECT * INTO v_history FROM public.rehab_progress_history
  WHERE elderly_person_id = p_elderly_person_id AND computed_date = CURRENT_DATE;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'domain_key', domain_key, 'confidence', confidence, 'score', score, 'trend', trend, 'message', message
    ) ORDER BY domain_key), '[]'::jsonb)
    INTO v_domains_json
  FROM public.rehab_domain_scores
  WHERE elderly_person_id = p_elderly_person_id;

  RETURN jsonb_build_object(
    'status', CASE WHEN v_did_run THEN 'computed' ELSE 'already_run_today' END,
    'elderly_person_id', p_elderly_person_id,
    'computed_date', CURRENT_DATE,
    'enrollment', jsonb_build_object(
      'protocol_key', v_enrollment.protocol_key,
      'program_start_date', v_enrollment.program_start_date,
      'baseline_window_days', v_enrollment.baseline_window_days
    ),
    'baseline_progress', CASE WHEN v_elapsed_days < v_required_days
      THEN jsonb_build_object('elapsed_days', v_elapsed_days, 'required_days', v_required_days)
      ELSE NULL END,
    'overall_score', v_history.overall_score,
    'overall_trend', v_history.overall_trend,
    'domains_scored', COALESCE(v_history.domains_scored, 0),
    'domains', v_domains_json
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_rehab_progress_analysis(UUID, TEXT) TO authenticated;

-- Nightly batch: runs the same once-per-day-guarded entry point for every active elderly
-- person (a no-op for anyone without an active rehab enrollment), so anyone who didn't
-- open the app still gets analyzed once a day.
CREATE OR REPLACE FUNCTION public.run_rehab_progress_analysis_for_all()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.elderly_persons WHERE status = 'active' LOOP
    BEGIN
      PERFORM public.run_rehab_progress_analysis(r.id, 'cron');
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'rehab progress analysis failed for elderly_person %: %', r.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.run_rehab_progress_analysis_for_all() FROM PUBLIC;

-- pg_cron is already enabled on this project (see 20251217100000_setup_scheduled_reports_cron.sql);
-- re-issuing CREATE EXTENSION here re-triggers Supabase's extension install hook and conflicts
-- with the grants that migration already put in place, so it's deliberately not repeated.

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'daily-rehab-progress-analysis';
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

-- 15 minutes after daily-disease-risk-analysis (03:00) to avoid contending for the same rows.
SELECT cron.schedule(
  'daily-rehab-progress-analysis',
  '15 3 * * *',
  $$SELECT public.run_rehab_progress_analysis_for_all();$$
);
