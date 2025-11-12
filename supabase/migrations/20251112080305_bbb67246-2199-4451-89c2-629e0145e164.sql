-- ILQ Module Database Schema (Fixed)

-- ILQ Scores History
CREATE TABLE ilq_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_person_id UUID NOT NULL REFERENCES elderly_persons(id) ON DELETE CASCADE,
  score NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  
  -- Component Scores (for transparency)
  health_vitals_score NUMERIC(5,2),
  physical_activity_score NUMERIC(5,2),
  cognitive_function_score NUMERIC(5,2),
  environmental_safety_score NUMERIC(5,2),
  emergency_response_score NUMERIC(5,2),
  social_engagement_score NUMERIC(5,2),
  
  -- Metadata
  computation_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_points_analyzed INTEGER NOT NULL,
  time_window_hours INTEGER NOT NULL,
  confidence_level NUMERIC(3,2),
  
  -- Detailed breakdown (JSONB for flexibility)
  detailed_metrics JSONB,
  
  -- Alert tracking
  triggered_alerts TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ilq_scores_elderly_person ON ilq_scores(elderly_person_id);
CREATE INDEX idx_ilq_scores_timestamp ON ilq_scores(computation_timestamp DESC);
CREATE INDEX idx_ilq_scores_score ON ilq_scores(score);

-- ILQ Configuration (for customization)
CREATE TABLE ilq_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_global BOOLEAN DEFAULT true,
  elderly_person_id UUID REFERENCES elderly_persons(id) ON DELETE CASCADE,
  
  -- Weight configurations (total must equal 1.0)
  health_vitals_weight NUMERIC(3,2) DEFAULT 0.30,
  physical_activity_weight NUMERIC(3,2) DEFAULT 0.25,
  cognitive_function_weight NUMERIC(3,2) DEFAULT 0.15,
  environmental_safety_weight NUMERIC(3,2) DEFAULT 0.15,
  emergency_response_weight NUMERIC(3,2) DEFAULT 0.10,
  social_engagement_weight NUMERIC(3,2) DEFAULT 0.05,
  
  -- Threshold configurations
  thresholds JSONB NOT NULL DEFAULT '{"excellent": 85, "good": 70, "fair": 55, "poor": 40}'::jsonb,
  
  -- Metric normalization ranges
  normalization_ranges JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default global configuration
INSERT INTO ilq_configurations (name, description, is_global, normalization_ranges) VALUES (
  'Default Global Configuration',
  'Standard ILQ computation weights and thresholds',
  true,
  '{
    "heart_rate": {"min": 60, "max": 100, "optimal": 75},
    "blood_pressure_systolic": {"min": 90, "max": 140, "optimal": 120},
    "blood_pressure_diastolic": {"min": 60, "max": 90, "optimal": 80},
    "oxygen_saturation": {"min": 95, "max": 100, "optimal": 98},
    "temperature": {"min": 36.1, "max": 37.2, "optimal": 36.8},
    "steps_daily": {"min": 2000, "max": 10000, "optimal": 5000},
    "bmi": {"min": 18.5, "max": 25, "optimal": 22}
  }'::jsonb
);

-- ILQ Trends (aggregated data for performance)
CREATE TABLE ilq_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_person_id UUID NOT NULL REFERENCES elderly_persons(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('hourly', 'daily', 'weekly', 'monthly')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  avg_score NUMERIC(5,2),
  min_score NUMERIC(5,2),
  max_score NUMERIC(5,2),
  score_variance NUMERIC(5,2),
  
  trend_direction TEXT CHECK (trend_direction IN ('improving', 'stable', 'declining')),
  change_percentage NUMERIC(5,2),
  
  data_points_count INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (elderly_person_id, period_type, period_start)
);

CREATE INDEX idx_ilq_trends_elderly_person ON ilq_trends(elderly_person_id);
CREATE INDEX idx_ilq_trends_period ON ilq_trends(period_start DESC);

-- ILQ Alerts
CREATE TABLE ilq_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_person_id UUID NOT NULL REFERENCES elderly_persons(id) ON DELETE CASCADE,
  ilq_score_id UUID REFERENCES ilq_scores(id) ON DELETE SET NULL,
  
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  previous_score NUMERIC(5,2),
  current_score NUMERIC(5,2),
  score_change NUMERIC(5,2),
  
  affected_components TEXT[],
  
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ilq_alerts_elderly_person ON ilq_alerts(elderly_person_id);
CREATE INDEX idx_ilq_alerts_status ON ilq_alerts(status);
CREATE INDEX idx_ilq_alerts_severity ON ilq_alerts(severity);

-- ILQ Benchmarks (for comparison)
CREATE TABLE ilq_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  age_range TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  
  avg_score NUMERIC(5,2) NOT NULL,
  median_score NUMERIC(5,2) NOT NULL,
  std_deviation NUMERIC(5,2),
  
  sample_size INTEGER,
  
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (age_range, gender)
);

-- Enable RLS
ALTER TABLE ilq_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ilq_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ilq_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE ilq_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ilq_benchmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ilq_scores
CREATE POLICY "Users can view ILQ scores for their elderly persons"
  ON ilq_scores FOR SELECT
  USING (can_access_elderly_person(auth.uid(), elderly_person_id));

-- RLS Policies for ilq_configurations
CREATE POLICY "Users can view global configurations"
  ON ilq_configurations FOR SELECT
  USING (is_global = true OR can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Admins can manage configurations"
  ON ilq_configurations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for ilq_trends
CREATE POLICY "Users can view trends for their elderly persons"
  ON ilq_trends FOR SELECT
  USING (can_access_elderly_person(auth.uid(), elderly_person_id));

-- RLS Policies for ilq_alerts
CREATE POLICY "Users can view ILQ alerts for their elderly persons"
  ON ilq_alerts FOR SELECT
  USING (can_access_elderly_person(auth.uid(), elderly_person_id));

CREATE POLICY "Users can acknowledge ILQ alerts"
  ON ilq_alerts FOR UPDATE
  USING (can_access_elderly_person(auth.uid(), elderly_person_id));

-- RLS Policies for benchmarks (public read)
CREATE POLICY "Everyone can view benchmarks"
  ON ilq_benchmarks FOR SELECT
  USING (true);

-- Helper function to update ilq_configurations updated_at
CREATE OR REPLACE FUNCTION update_ilq_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ilq_config_updated_at
  BEFORE UPDATE ON ilq_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_ilq_config_updated_at();