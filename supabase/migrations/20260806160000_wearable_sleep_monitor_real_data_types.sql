-- Give the Wearable and Sleep Monitor device types the data types their real
-- devices actually report, so Historical Data Generation produces data matching
-- the live feed rather than a near-empty subset.
--
-- Derived from 8,185 stored rows across two devices:
--   Samsung watch (sleep_monitor, hw ringqq) 4,227 rows / 15 types
--   Ring          (wearable,      hw Ring)   3,958 rows / 15 types
--
-- Both report an identical set. Units below match the stored rows exactly; the
-- value wrapping ({"bpm":62} rather than 62) is applied in Java by
-- HealthConnectShapes, since it is a property of the data type, not the config.
--
-- Ranges are simulation parameters, not clinical reference values.

INSERT INTO public.device_type_data_configs
  (device_type_id, data_type, display_name, unit, value_type, sample_data_config, is_required, sort_order)
SELECT dt.id, v.data_type, v.display_name, v.unit, v.value_type, v.sample_data_config, FALSE, v.sort_order
FROM public.device_types dt
CROSS JOIN (VALUES
  -- Sleep. The session envelope itself is built by SleepSessionGenerator; this row
  -- exists so the device type declares the capability and carries the right unit.
  ('sleep', 'Sleep Session', 'minutes', 'object',
   '{"type":"sleep_session","duration_min":{"min":240,"max":540},"efficiency_pct":{"min":60,"max":95}}'::jsonb, 20),
  ('sleep_stage', 'Sleep Stage', 'minutes', 'object',
   '{"type":"enum","values":["awake","light","deep","rem"]}'::jsonb, 21),

  -- Cardio / respiratory
  ('heart_rate', 'Heart Rate', 'bpm', 'number',
   '{"type":"random_number","min":48,"max":145,"precision":0}'::jsonb, 22),
  ('resting_heart_rate', 'Resting Heart Rate', 'bpm', 'number',
   '{"type":"random_number","min":52,"max":85,"precision":0}'::jsonb, 23),
  ('heart_rate_variability', 'Heart Rate Variability', 'ms', 'number',
   '{"type":"random_number","min":15,"max":95,"precision":0}'::jsonb, 24),
  ('respiratory_rate', 'Respiratory Rate', 'breaths/min', 'number',
   '{"type":"random_number","min":10,"max":24,"precision":0}'::jsonb, 25),
  ('oxygen_saturation', 'Oxygen Saturation', '%', 'number',
   '{"type":"random_number","min":90,"max":100,"precision":0}'::jsonb, 26),

  -- Activity
  ('steps', 'Steps', 'steps', 'number',
   '{"type":"random_number","min":0,"max":9000,"precision":0}'::jsonb, 27),
  ('distance', 'Distance', 'm', 'number',
   '{"type":"random_number","min":0,"max":6000,"precision":2}'::jsonb, 28),
  ('speed', 'Speed', 'm/s', 'number',
   '{"type":"random_number","min":0,"max":3.5,"precision":2}'::jsonb, 29),
  ('total_calories', 'Total Calories', 'kcal', 'number',
   '{"type":"random_number","min":40,"max":900,"precision":0}'::jsonb, 30),
  ('exercise_session', 'Exercise Session', 'minutes', 'object',
   '{"type":"random_number","min":8,"max":60,"precision":0}'::jsonb, 31),

  -- Body composition. Real devices report these rarely (1-4 rows over weeks),
  -- so they are marked low priority; the generator still emits them per day.
  ('weight', 'Weight', 'kg', 'number',
   '{"type":"random_number","min":60,"max":110,"precision":1}'::jsonb, 32),
  ('height', 'Height', 'm', 'number',
   '{"type":"random_number","min":1.5,"max":1.95,"precision":2}'::jsonb, 33),
  ('body_fat', 'Body Fat', '%', 'number',
   '{"type":"random_number","min":12,"max":40,"precision":1}'::jsonb, 34),
  ('basal_metabolic_rate', 'Basal Metabolic Rate', 'kcal/day', 'number',
   '{"type":"random_number","min":1300,"max":2200,"precision":0}'::jsonb, 35)
) AS v(data_type, display_name, unit, value_type, sample_data_config, sort_order)
WHERE dt.code IN ('wearable', 'sleep_monitor')
  AND NOT EXISTS (
    SELECT 1 FROM public.device_type_data_configs c
    WHERE c.device_type_id = dt.id AND c.data_type = v.data_type
  );

-- `sleep_quality` on Sleep Monitor has no counterpart in any observed feed.
-- Left in place rather than deleted (other installs may rely on it), but demoted
-- so it sorts below the real types in the admin UI.
UPDATE public.device_type_data_configs c
SET sort_order = 99, updated_at = now()
FROM public.device_types dt
WHERE c.device_type_id = dt.id
  AND dt.code = 'sleep_monitor'
  AND c.data_type = 'sleep_quality';
