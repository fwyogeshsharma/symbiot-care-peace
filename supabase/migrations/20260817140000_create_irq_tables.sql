-- IRQ (Individual Recovery Quotient) — tracks progress in a substance-recovery program.
--
-- Mirrors the ILQ module (20251112080305_*.sql / supabase/functions/ilq-compute) as closely as
-- possible: an append-only score history computed by an edge function
-- (supabase/functions/irq-compute), config-driven weights, and an alerts table for score drops /
-- low scores / weak components. Reuses elderly_persons as the tracked-person table, same as every
-- other feature in this app (devices, alerts, disease risk, ILQ, rehab progress) — no new
-- person/access-control model needed.
--
-- Two new signals ILQ doesn't have, since devices can't measure either: craving intensity
-- (recovery_checkins, logged) and sobriety status (recovery_sobriety_events, an event log of
-- program_start / relapse / milestone_note that the clean-day streak is derived from).

-- ---------------------------------------------------------------------------
-- 1. irq_scores — append-only history, one row per computation (never upserted)
-- ---------------------------------------------------------------------------
CREATE TABLE public.irq_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_person_id UUID NOT NULL REFERENCES public.elderly_persons(id) ON DELETE CASCADE,
  score NUMERIC(5, 2) NOT NULL CHECK (score >= 0 AND score <= 100),

  -- Component scores (for transparency), mirroring ilq_scores' shape with recovery-specific components
  physiological_stress_score NUMERIC(5, 2),
  activity_routine_score NUMERIC(5, 2),
  sobriety_score NUMERIC(5, 2),
  craving_control_score NUMERIC(5, 2),

  computation_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_points_analyzed INTEGER NOT NULL,
  time_window_hours INTEGER NOT NULL,
  confidence_level NUMERIC(3, 2),

  detailed_metrics JSONB,
  triggered_alerts TEXT[],

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_irq_scores_elderly_person ON public.irq_scores (elderly_person_id);
CREATE INDEX idx_irq_scores_timestamp ON public.irq_scores (computation_timestamp DESC);

-- ---------------------------------------------------------------------------
-- 2. irq_configurations — weights + normalization ranges, global default + optional per-person override
-- ---------------------------------------------------------------------------
CREATE TABLE public.irq_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_global BOOLEAN DEFAULT true,
  elderly_person_id UUID REFERENCES public.elderly_persons(id) ON DELETE CASCADE,

  -- Weight configurations (should total 1.0)
  physiological_stress_weight NUMERIC(3, 2) DEFAULT 0.25,
  activity_routine_weight NUMERIC(3, 2) DEFAULT 0.20,
  sobriety_weight NUMERIC(3, 2) DEFAULT 0.35,
  craving_control_weight NUMERIC(3, 2) DEFAULT 0.20,

  thresholds JSONB NOT NULL DEFAULT '{"excellent": 85, "good": 70, "fair": 55, "poor": 40}'::jsonb,
  normalization_ranges JSONB NOT NULL DEFAULT '{}'::jsonb,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.irq_configurations (name, description, is_global, normalization_ranges) VALUES (
  'Default Global Configuration',
  'Standard IRQ computation weights and thresholds',
  true,
  '{
    "heart_rate": {"min": 60, "max": 100, "optimal": 75},
    "resting_heart_rate": {"min": 40, "max": 100, "optimal": 62},
    "heart_rate_variability": {"min": 10, "max": 100, "optimal": 60},
    "respiratory_rate": {"min": 8, "max": 25, "optimal": 16},
    "steps_daily": {"min": 2000, "max": 10000, "optimal": 5000},
    "distance_daily": {"min": 500, "max": 5000, "optimal": 3000},
    "active_calories_daily": {"min": 100, "max": 800, "optimal": 400},
    "floors_climbed_daily": {"min": 0, "max": 20, "optimal": 8},
    "exercise_minutes_daily": {"min": 0, "max": 60, "optimal": 30}
  }'::jsonb
);

-- ---------------------------------------------------------------------------
-- 3. irq_alerts — mirrors ilq_alerts exactly (score_drop / low_score / component_decline),
--    plus a recovery-specific relapse_logged type raised by irq-compute
-- ---------------------------------------------------------------------------
CREATE TABLE public.irq_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_person_id UUID NOT NULL REFERENCES public.elderly_persons(id) ON DELETE CASCADE,
  irq_score_id UUID REFERENCES public.irq_scores(id) ON DELETE SET NULL,

  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  title TEXT NOT NULL,
  description TEXT NOT NULL,

  previous_score NUMERIC(5, 2),
  current_score NUMERIC(5, 2),
  score_change NUMERIC(5, 2),

  affected_components TEXT[],

  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  acknowledged_by UUID REFERENCES public.profiles(id),
  acknowledged_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_irq_alerts_elderly_person ON public.irq_alerts (elderly_person_id);
CREATE INDEX idx_irq_alerts_status ON public.irq_alerts (status);

-- ---------------------------------------------------------------------------
-- 4. recovery_checkins — the manually-logged craving signal, one row per person per day
-- ---------------------------------------------------------------------------
CREATE TABLE public.recovery_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_person_id UUID NOT NULL REFERENCES public.elderly_persons(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  craving_intensity SMALLINT NOT NULL CHECK (craving_intensity BETWEEN 0 AND 10),
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (elderly_person_id, checkin_date)
);

COMMENT ON TABLE public.recovery_checkins IS
  'Daily caregiver/self-logged craving intensity. The only thing craving_control_score reads — a wearable cannot measure this.';

-- ---------------------------------------------------------------------------
-- 5. recovery_sobriety_events — append-only event log the sobriety_score and clean-day
--    streak are derived from. program_start anchors the streak, relapse resets it,
--    milestone_note is context-only and never affects scoring.
-- ---------------------------------------------------------------------------
CREATE TABLE public.recovery_sobriety_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_person_id UUID NOT NULL REFERENCES public.elderly_persons(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('program_start', 'relapse', 'milestone_note')),
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recovery_sobriety_events_person ON public.recovery_sobriety_events (elderly_person_id, event_date DESC);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.irq_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.irq_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.irq_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_sobriety_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view IRQ scores for accessible elderly persons"
  ON public.irq_scores FOR SELECT
  USING (public.can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Users can view global IRQ configurations"
  ON public.irq_configurations FOR SELECT
  USING (is_global = true OR public.can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Admins can manage IRQ configurations"
  ON public.irq_configurations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view IRQ alerts for accessible elderly persons"
  ON public.irq_alerts FOR SELECT
  USING (public.can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Users can acknowledge IRQ alerts"
  ON public.irq_alerts FOR UPDATE
  USING (public.can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Users can view recovery checkins for accessible elderly persons"
  ON public.recovery_checkins FOR SELECT
  USING (public.can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Users can create recovery checkins for accessible elderly persons"
  ON public.recovery_checkins FOR INSERT
  WITH CHECK (public.can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Users can update recovery checkins for accessible elderly persons"
  ON public.recovery_checkins FOR UPDATE
  USING (public.can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Users can view sobriety events for accessible elderly persons"
  ON public.recovery_sobriety_events FOR SELECT
  USING (public.can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Users can log sobriety events for accessible elderly persons"
  ON public.recovery_sobriety_events FOR INSERT
  WITH CHECK (public.can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE TRIGGER update_irq_configurations_updated_at
  BEFORE UPDATE ON public.irq_configurations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
