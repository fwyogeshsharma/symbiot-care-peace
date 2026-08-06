-- Disease-risk detection: config + result tables.
-- Source: diseses_triggre.md. Bucket days are fixed checkpoints {15,30,60,90,180} the daily
-- job evaluates against. min_bucket_days = smallest checkpoint >= the doc's "Minimum Days";
-- recommended_bucket_days = smallest checkpoint >= the doc's "Recommended Days" (capped at 180
-- for Alzheimer's, whose clinical recommendation of 365 days exceeds our largest checkpoint).
-- When min_bucket_days = recommended_bucket_days, the minimum checkpoint already delivers
-- full ("recommended") confidence, so there is only one tier for that condition.

CREATE TABLE IF NOT EXISTS public.disease_risk_thresholds (
  disease_key TEXT PRIMARY KEY,
  disease_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('sleep_disorder', 'mental_health', 'cardiometabolic', 'recovery_systemic')),
  min_days INTEGER NOT NULL,
  recommended_days INTEGER NOT NULL,
  min_bucket_days INTEGER NOT NULL CHECK (min_bucket_days IN (15, 30, 60, 90, 180)),
  recommended_bucket_days INTEGER NOT NULL CHECK (recommended_bucket_days IN (15, 30, 60, 90, 180)),
  base_confidence_stars SMALLINT NOT NULL CHECK (base_confidence_stars BETWEEN 1 AND 5),
  required_data_types TEXT[] NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (recommended_bucket_days >= min_bucket_days)
);

COMMENT ON TABLE public.disease_risk_thresholds IS
  'Config: one row per condition from diseses_triggre.md. Add a new condition by inserting a row here plus a matching public._score_<disease_key>(uuid, integer) function.';

INSERT INTO public.disease_risk_thresholds
  (disease_key, disease_name, category, min_days, recommended_days, min_bucket_days, recommended_bucket_days, base_confidence_stars, required_data_types, description)
VALUES
  ('sleep_apnea',               'Sleep Apnea',                     'sleep_disorder',  7,  14, 15, 15, 5, ARRAY['sleep','oxygen_saturation'],  'Snoring, breathing interruptions, oxygen saturation, HR'),
  ('insomnia',                  'Insomnia',                        'sleep_disorder',  7,  14, 15, 15, 4, ARRAY['sleep'],                      'Sleep latency, awakenings, sleep efficiency'),
  ('circadian_rhythm_disorder', 'Circadian Rhythm Disorder',       'sleep_disorder', 14,  30, 15, 30, 4, ARRAY['sleep'],                      'Sleep schedule consistency'),
  ('restless_leg_syndrome',     'Restless Leg Syndrome',           'sleep_disorder',  7,  14, 15, 15, 3, ARRAY['sleep','movement'],           'Movement during sleep'),
  ('rem_sleep_behavior_disorder','REM Sleep Behavior Disorder',    'sleep_disorder', 14,  30, 15, 30, 3, ARRAY['sleep','movement'],           'Movement during REM'),
  ('chronic_sleep_deprivation', 'Chronic Sleep Deprivation',       'sleep_disorder',  7,  21, 15, 30, 5, ARRAY['sleep'],                      'Total sleep time'),
  ('depression_risk',           'Depression Risk',                 'mental_health',  21,  60, 30, 60, 3, ARRAY['sleep'],                      'REM %, sleep fragmentation'),
  ('anxiety_risk',              'Anxiety Risk',                    'mental_health',  14,  30, 15, 30, 3, ARRAY['heart_rate','sleep'],         'HR, HRV, sleep onset'),
  ('burnout_stress',            'Burnout / Stress',                'mental_health',   7,  21, 15, 30, 4, ARRAY['heart_rate'],                 'HRV, resting HR, recovery'),
  ('cardiovascular_risk',       'Cardiovascular Risk',             'cardiometabolic',30,  90, 30, 90, 4, ARRAY['heart_rate'],                 'HRV, resting HR, sleep quality'),
  ('hypertension_risk',         'Hypertension Risk',               'cardiometabolic',30,  90, 30, 90, 3, ARRAY['heart_rate','sleep'],         'Night HR, awakenings'),
  ('diabetes_risk',             'Diabetes Risk',                   'cardiometabolic',30,  90, 30, 90, 3, ARRAY['sleep'],                      'Sleep duration + HRV'),
  ('obesity_risk',              'Obesity Risk',                    'cardiometabolic',30,  90, 30, 90, 3, ARRAY['sleep'],                      'Sleep duration consistency'),
  ('cognitive_decline_risk',    'Cognitive Decline Risk',          'mental_health',  90, 180, 90,180, 2, ARRAY['sleep'],                      'Deep sleep trends'),
  ('parkinsons_early_risk',     'Parkinson''s Early Risk',         'mental_health',  60, 180, 60,180, 2, ARRAY['movement','sleep'],           'REM behavior + movement'),
  ('alzheimers_risk',           'Alzheimer''s Risk',               'mental_health', 180, 365,180,180, 2, ARRAY['sleep'],                      'Long-term deep sleep reduction (capped at 180d checkpoint; doc recommends 365d)'),
  ('chronic_fatigue_syndrome',  'Chronic Fatigue Syndrome',        'recovery_systemic',30, 90, 30, 90, 3, ARRAY['heart_rate'],                 'Recovery trends')
ON CONFLICT (disease_key) DO UPDATE SET
  disease_name = EXCLUDED.disease_name,
  category = EXCLUDED.category,
  min_days = EXCLUDED.min_days,
  recommended_days = EXCLUDED.recommended_days,
  min_bucket_days = EXCLUDED.min_bucket_days,
  recommended_bucket_days = EXCLUDED.recommended_bucket_days,
  base_confidence_stars = EXCLUDED.base_confidence_stars,
  required_data_types = EXCLUDED.required_data_types,
  description = EXCLUDED.description,
  updated_at = now();

-- Daily result per (person, disease). Upserted in place each run — current state, not a log.
CREATE TABLE IF NOT EXISTS public.disease_risk_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_person_id UUID NOT NULL REFERENCES public.elderly_persons(id) ON DELETE CASCADE,
  disease_key TEXT NOT NULL REFERENCES public.disease_risk_thresholds(disease_key) ON DELETE CASCADE,
  flagged BOOLEAN NOT NULL DEFAULT false,
  confidence_tier TEXT NOT NULL CHECK (confidence_tier IN ('insufficient_data', 'preliminary', 'recommended')),
  confidence_stars SMALLINT NOT NULL DEFAULT 0 CHECK (confidence_stars BETWEEN 0 AND 5),
  days_of_data INTEGER NOT NULL DEFAULT 0,
  window_days_used INTEGER,
  score NUMERIC(6, 2),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  message TEXT,
  computed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (elderly_person_id, disease_key)
);

CREATE INDEX IF NOT EXISTS idx_disease_risk_flags_person ON public.disease_risk_flags (elderly_person_id);
CREATE INDEX IF NOT EXISTS idx_disease_risk_flags_flagged ON public.disease_risk_flags (elderly_person_id) WHERE flagged = true;

-- Once-per-day guard for the login/app-open trigger path (see 20260806100400_*.sql).
CREATE TABLE IF NOT EXISTS public.disease_risk_analysis_runs (
  elderly_person_id UUID PRIMARY KEY REFERENCES public.elderly_persons(id) ON DELETE CASCADE,
  last_run_date DATE NOT NULL,
  last_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_run_source TEXT
);

CREATE TRIGGER update_disease_risk_thresholds_updated_at
  BEFORE UPDATE ON public.disease_risk_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_disease_risk_flags_updated_at
  BEFORE UPDATE ON public.disease_risk_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.disease_risk_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disease_risk_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disease_risk_analysis_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view disease risk thresholds"
  ON public.disease_risk_thresholds FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage disease risk thresholds"
  ON public.disease_risk_thresholds FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view disease risk flags for accessible elderly persons"
  ON public.disease_risk_flags FOR SELECT
  USING (public.can_access_elderly_person(auth.uid(), elderly_person_id));

-- Rows are written exclusively by the SECURITY DEFINER functions in
-- 20260806100200_*.sql / 20260806100400_*.sql, which bypass RLS as their owner.
-- This policy only needs to cover any direct authenticated-role writes (e.g. from the SQL editor).
CREATE POLICY "Admins can manage disease risk flags directly"
  ON public.disease_risk_flags FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own analysis run status"
  ON public.disease_risk_analysis_runs FOR SELECT
  USING (public.can_access_elderly_person(auth.uid(), elderly_person_id));
