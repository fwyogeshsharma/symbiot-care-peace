-- Extend device_data.data_type allowlist to cover signals needed by disease-risk detection
-- (diseses_triggre.md). hrv and respiratory_rate are already emitted by
-- supabase/functions/device-ingest/index.ts but were never added to the CHECK constraint,
-- so inserts of those types currently fail. snoring is new, needed for the Sleep Apnea rule.
--
-- The live constraint has drifted from what's in tracked migration history (some rows exist
-- with data_type values not in the last hand-copied allowlist), so instead of hand-copying a
-- static list this reads the table's own current distinct data_type values and folds them in
-- automatically — the new constraint is guaranteed to accept every row already present.

DO $$
DECLARE
  v_known TEXT[] := ARRAY[
    'activity', 'bed_occupancy', 'blood_pressure', 'bmi', 'door_status', 'duration',
    'fall_detected', 'heart_rate', 'humidity', 'light', 'motion_detected', 'movement',
    'movement_detected', 'orientation', 'oxygen_saturation', 'power_status', 'position',
    'presence', 'seat_occupancy', 'steps', 'temperature', 'usage', 'weight', 'location',
    'sleep', 'battery_status', 'medication_taken', 'emergency_alert', 'air_quality',
    'light_level', 'noise_level', 'co2', 'carbon_dioxide', 'voc', 'volatile_organic_compounds',
    'pm1', 'pm2_5', 'pm25', 'pm10', 'aqi', 'air_quality_index', 'tvoc', 'eco2',
    -- added for disease-risk detection
    'hrv', 'respiratory_rate', 'snoring'
  ];
  v_live TEXT[];
  v_unexpected TEXT[];
  v_final TEXT[];
BEGIN
  SELECT COALESCE(array_agg(DISTINCT data_type), ARRAY[]::text[])
    INTO v_live
  FROM public.device_data;

  SELECT COALESCE(array_agg(t), ARRAY[]::text[]) INTO v_unexpected
  FROM unnest(v_live) AS t
  WHERE t <> ALL (v_known);

  IF array_length(v_unexpected, 1) > 0 THEN
    RAISE NOTICE 'device_data has existing data_type value(s) not in the curated allowlist, folding them in: %', v_unexpected;
  END IF;

  SELECT ARRAY(SELECT DISTINCT x FROM unnest(v_known || v_live) AS x ORDER BY x) INTO v_final;

  EXECUTE 'ALTER TABLE public.device_data DROP CONSTRAINT IF EXISTS device_data_data_type_check';

  EXECUTE format(
    'ALTER TABLE public.device_data ADD CONSTRAINT device_data_data_type_check CHECK (data_type IN (%s))',
    (SELECT string_agg(quote_literal(t), ', ') FROM unnest(v_final) AS t)
  );
END $$;

CREATE INDEX IF NOT EXISTS idx_device_data_disease_risk_types
  ON public.device_data (elderly_person_id, data_type, recorded_at DESC)
  WHERE data_type IN ('sleep', 'heart_rate', 'hrv', 'oxygen_saturation', 'respiratory_rate', 'snoring', 'movement', 'weight', 'bmi', 'steps');
