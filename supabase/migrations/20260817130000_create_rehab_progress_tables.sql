-- Rehabilitation progress tracking: enrollment + manual check-ins + score storage.
--
-- Phase 1 covers four device-derived domains (mobility, cardio, body_comp, sleep) plus one
-- manually-entered domain (pain + exercise adherence, since devices can't measure either).
-- "Improvement" is measured against a fixed rehab-program start date (rehab_enrollments),
-- not a rolling window, so progress doesn't silently reset every time a lookback window
-- shifts forward — the baseline window is always the first N days of the program.
--
-- Mirrors the disease_risk_* schema shape (config/enrollment row -> current-state result
-- table -> once-per-day guard table), see 20260806100100_create_disease_risk_tables.sql.

-- ---------------------------------------------------------------------------
-- 1. rehab_enrollments — anchors the baseline window
-- ---------------------------------------------------------------------------
CREATE TABLE public.rehab_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_person_id UUID NOT NULL REFERENCES public.elderly_persons(id) ON DELETE CASCADE,
  protocol_key TEXT NOT NULL DEFAULT 'general_mobility',
  program_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  baseline_window_days INTEGER NOT NULL DEFAULT 14 CHECK (baseline_window_days BETWEEN 3 AND 30),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.rehab_enrollments IS
  'One active row per person being tracked for rehab progress. program_start_date anchors the baseline window the scoring functions compare against.';

-- One active enrollment per person at a time; restart a program by deactivating the old
-- row (is_active = false) and inserting a new one, rather than allowing two concurrently.
CREATE UNIQUE INDEX rehab_enrollments_one_active_idx
  ON public.rehab_enrollments (elderly_person_id) WHERE is_active;

ALTER TABLE public.rehab_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rehab enrollments for accessible elderly persons"
  ON public.rehab_enrollments FOR SELECT
  USING (public.can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Users can create rehab enrollments for accessible elderly persons"
  ON public.rehab_enrollments FOR INSERT
  WITH CHECK (public.can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Users can update rehab enrollments for accessible elderly persons"
  ON public.rehab_enrollments FOR UPDATE
  USING (public.can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE TRIGGER update_rehab_enrollments_updated_at
  BEFORE UPDATE ON public.rehab_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 2. rehab_manual_checkins — the manually-entered "gap" domain
-- ---------------------------------------------------------------------------
CREATE TABLE public.rehab_manual_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_person_id UUID NOT NULL REFERENCES public.elderly_persons(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  pain_score SMALLINT CHECK (pain_score BETWEEN 0 AND 10),
  exercise_adherence_pct SMALLINT CHECK (exercise_adherence_pct BETWEEN 0 AND 100),
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (elderly_person_id, checkin_date)
);

COMMENT ON TABLE public.rehab_manual_checkins IS
  'Caregiver/PT-entered pain + home-exercise-adherence check-ins, one per person per day. The only things in the rehab score that a wearable cannot measure.';

ALTER TABLE public.rehab_manual_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rehab checkins for accessible elderly persons"
  ON public.rehab_manual_checkins FOR SELECT
  USING (public.can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Users can create rehab checkins for accessible elderly persons"
  ON public.rehab_manual_checkins FOR INSERT
  WITH CHECK (public.can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Users can update rehab checkins for accessible elderly persons"
  ON public.rehab_manual_checkins FOR UPDATE
  USING (public.can_access_elderly_person(auth.uid(), elderly_person_id));

-- ---------------------------------------------------------------------------
-- 3. rehab_domain_scores — current-state result per (person, domain)
-- ---------------------------------------------------------------------------
CREATE TABLE public.rehab_domain_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_person_id UUID NOT NULL REFERENCES public.elderly_persons(id) ON DELETE CASCADE,
  domain_key TEXT NOT NULL CHECK (domain_key IN ('mobility', 'cardio', 'body_comp', 'sleep', 'manual')),
  confidence TEXT NOT NULL CHECK (confidence IN ('insufficient_data', 'preliminary', 'established')),
  score NUMERIC(5, 2) CHECK (score BETWEEN 0 AND 100),
  trend TEXT CHECK (trend IN ('improving', 'stable', 'declining')),
  baseline_days_available INTEGER NOT NULL DEFAULT 0,
  recent_days_available INTEGER NOT NULL DEFAULT 0,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  message TEXT,
  computed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (elderly_person_id, domain_key)
);

COMMENT ON TABLE public.rehab_domain_scores IS
  'Current per-domain rehab score, upserted in place each run (like disease_risk_flags) — current state, not a log. 100 = at/beyond the max expected improvement, 50 = no change since baseline, 0 = max expected decline.';

CREATE INDEX idx_rehab_domain_scores_person ON public.rehab_domain_scores (elderly_person_id);

ALTER TABLE public.rehab_domain_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rehab domain scores for accessible elderly persons"
  ON public.rehab_domain_scores FOR SELECT
  USING (public.can_access_elderly_person(auth.uid(), elderly_person_id));

-- Rows are written exclusively by the SECURITY DEFINER functions in
-- 20260817130100_*.sql / 20260817130300_*.sql, which bypass RLS as their owner. This
-- policy only needs to cover any direct authenticated-role writes (e.g. from the SQL editor).
CREATE POLICY "Admins can manage rehab domain scores directly"
  ON public.rehab_domain_scores FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 4. rehab_progress_history — daily composite snapshot (a log, so progress over the
--    rehab period can be charted, unlike the current-state-only domain table above)
-- ---------------------------------------------------------------------------
CREATE TABLE public.rehab_progress_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_person_id UUID NOT NULL REFERENCES public.elderly_persons(id) ON DELETE CASCADE,
  overall_score NUMERIC(5, 2) CHECK (overall_score BETWEEN 0 AND 100),
  overall_trend TEXT CHECK (overall_trend IN ('improving', 'stable', 'declining')),
  domains_scored INTEGER NOT NULL DEFAULT 0,
  domain_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (elderly_person_id, computed_date)
);

COMMENT ON TABLE public.rehab_progress_history IS
  'One row per person per day: the composite rehab score at that point in time, plus a snapshot of every domain that fed it. Kept as a log (unlike rehab_domain_scores) so progress can be charted across the rehab period.';

CREATE INDEX idx_rehab_progress_history_person ON public.rehab_progress_history (elderly_person_id, computed_date DESC);

ALTER TABLE public.rehab_progress_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rehab progress history for accessible elderly persons"
  ON public.rehab_progress_history FOR SELECT
  USING (public.can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Admins can manage rehab progress history directly"
  ON public.rehab_progress_history FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 5. rehab_progress_analysis_runs — once-per-day guard for the login/app-open trigger path
-- ---------------------------------------------------------------------------
CREATE TABLE public.rehab_progress_analysis_runs (
  elderly_person_id UUID PRIMARY KEY REFERENCES public.elderly_persons(id) ON DELETE CASCADE,
  last_run_date DATE NOT NULL,
  last_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_run_source TEXT
);

ALTER TABLE public.rehab_progress_analysis_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rehab analysis run status"
  ON public.rehab_progress_analysis_runs FOR SELECT
  USING (public.can_access_elderly_person(auth.uid(), elderly_person_id));
