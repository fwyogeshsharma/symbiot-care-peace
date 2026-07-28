-- Widen device_data.data_type to cover the full Health Connect metric catalogue.
--
-- The wearable sync previously stored only heart_rate, steps and oxygen_saturation.
-- Health Connect exposes far more per device (sleep stages, calories, distance, HRV,
-- body composition and so on); each lands in device_data as its own row with the
-- reading itself in the JSONB value column.
--
-- Built dynamically rather than as a literal CHECK. A plain rewrite failed with 23514
-- because the live table already holds data_type values that appear in no migration —
-- the constraint has drifted from this history at some point. Dropping and recreating
-- from a fixed list would reject those existing rows, so the new constraint is the union
-- of the list below and whatever is actually stored. Any preserved-but-unlisted value is
-- reported via RAISE NOTICE so the drift is visible rather than silently blessed.
--
-- Value shapes written by the sync (src/lib/capacitor/healthConnect.ts and the native
-- HealthConnectReader.kt, which must agree):
--   heart_rate               {bpm: 72}
--   resting_heart_rate       {bpm: 58}
--   heart_rate_variability   {rmssd_ms: 42.1}
--   steps                    {count: 1200}
--   oxygen_saturation        {percentage: 97.0}
--   respiratory_rate         {breaths_per_minute: 14.0}
--   blood_glucose            {value: 5.4, unit: mmol/L, meal_type: 2}
--   blood_pressure           {systolic: 120, diastolic: 80}
--   body_temperature         {celsius: 36.7}
--   body_fat                 {percentage: 24.3}
--   weight / lean_body_mass / bone_mass / body_water_mass  {kg: 71.2}
--   height                   {meters: 1.74}
--   basal_metabolic_rate     {kcal_per_day: 1620}
--   active_calories / total_calories  {kcal: 320.5}
--   distance / elevation_gained       {meters: 4200}
--   floors_climbed           {floors: 12}
--   hydration                {liters: 1.8}
--   speed                    {meters_per_second: 1.4}
--   power                    {watts: 180}
--   steps_cadence / cycling_pedaling_cadence  {rpm: 78}
--   wheelchair_pushes        {count: 240}
--   sleep                    {duration_minutes: 431, start: ..., end: ...}
--   sleep_stage              {stage: deep, duration_minutes: 55}
--   exercise_session         {exercise_type: 79, duration_minutes: 32}

DO $$
DECLARE
  allowed text[] := ARRAY[
    'activity',
    'bed_occupancy',
    'blood_pressure',
    'bmi',
    'door_status',
    'duration',
    'fall_detected',
    'heart_rate',
    'humidity',
    'light',
    'motion_detected',
    'movement',
    'movement_detected',
    'orientation',
    'oxygen_saturation',
    'power_status',
    'position',
    'presence',
    'seat_occupancy',
    'steps',
    'temperature',
    'usage',
    'weight',
    'location',
    'sleep',
    'battery_status',
    'medication_taken',
    'emergency_alert',
    'air_quality',
    'light_level',
    'noise_level',
    'co2',
    'carbon_dioxide',
    'voc',
    'volatile_organic_compounds',
    'pm1',
    'pm2_5',
    'pm25',
    'pm10',
    'aqi',
    'air_quality_index',
    'tvoc',
    'eco2',
    'resting_heart_rate',
    'heart_rate_variability',
    'respiratory_rate',
    'vo2_max',
    'blood_glucose',
    'body_fat',
    'body_temperature',
    'basal_body_temperature',
    'basal_metabolic_rate',
    'height',
    'lean_body_mass',
    'bone_mass',
    'body_water_mass',
    'active_calories',
    'total_calories',
    'distance',
    'floors_climbed',
    'elevation_gained',
    'hydration',
    'speed',
    'power',
    'steps_cadence',
    'cycling_pedaling_cadence',
    'wheelchair_pushes',
    'exercise_session',
    'sleep_stage',
    'sleep_quality'
  ];
  drifted text[];
  rendered text;
BEGIN
  SELECT COALESCE(array_agg(DISTINCT data_type ORDER BY data_type), ARRAY[]::text[])
    INTO drifted
  FROM public.device_data
  WHERE data_type <> ALL (allowed);

  IF array_length(drifted, 1) IS NOT NULL THEN
    RAISE NOTICE 'Preserving % data_type value(s) already in device_data but absent from migrations: %',
      array_length(drifted, 1), array_to_string(drifted, ', ');
    allowed := allowed || drifted;
  END IF;

  SELECT string_agg(quote_literal(v), ', ' ORDER BY v) INTO rendered FROM unnest(allowed) AS v;

  EXECUTE 'ALTER TABLE public.device_data DROP CONSTRAINT IF EXISTS device_data_data_type_check';
  EXECUTE 'ALTER TABLE public.device_data ADD CONSTRAINT device_data_data_type_check CHECK (data_type IN ('
    || rendered || '))';
END
$$;
