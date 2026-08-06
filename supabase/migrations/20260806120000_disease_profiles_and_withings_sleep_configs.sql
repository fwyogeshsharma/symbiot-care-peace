-- Disease-driven sleep simulation profiles + Withings Sleep Tracking Mat data types.
--
-- Purpose
--   1. Add a `disease_profiles` table the simulator reads at job start to shape
--      generated sleep/vital data toward a specific condition.
--   2. Register the data types the Withings mat actually emits as Bed Pad configs.
--   3. Stop the WSM02-ALL-US model emitting `pressure`, which the real device
--      has never sent (0 of 2066 observed rows).
--
-- These profiles produce SYNTHETIC TEST DATA for exercising detection algorithms.
-- The ranges are illustrative starting points for simulation, NOT clinically
-- validated thresholds, and nothing generated here is a diagnosis.

-- ---------------------------------------------------------------------------
-- 1. disease_profiles
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.disease_profiles (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code               TEXT NOT NULL UNIQUE,
  name               TEXT NOT NULL,
  category           TEXT NOT NULL,
  min_days           INTEGER NOT NULL,
  recommended_days   INTEGER NOT NULL,
  confidence         SMALLINT NOT NULL CHECK (confidence BETWEEN 1 AND 5),
  required_signals   TEXT[] NOT NULL DEFAULT '{}',
  -- Modulations applied on top of the generator's healthy baseline.
  -- Ranges are [min, max]; the generator samples within them per night.
  --   sleep      efficiency_pct / latency_min / waso_min / awakenings / duration_min
  --   stages_pct deep / rem / light / awake  (should sum to ~100)
  --   vitals     night_hr_bpm / hrv_rmssd_ms / resp_bpm / spo2_pct
  --   events     apnea_per_hour / plm_per_hour / rem_movement_idx / snoring_pct
  --   schedule   bedtime_hhmm / bedtime_sd_min / wake_sd_min
  --   trend      { field, per_30d }  slow drift for long-horizon conditions
  profile            JSONB NOT NULL,
  description        TEXT,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order         INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.disease_profiles IS
  'Simulation profiles: how to shape synthetic sleep/vital data for a given condition. Test data only, not clinical thresholds.';

CREATE INDEX IF NOT EXISTS disease_profiles_active_idx
  ON public.disease_profiles (is_active, sort_order);

ALTER TABLE public.disease_profiles ENABLE ROW LEVEL SECURITY;

-- Readable by any signed-in user (the simulator UI populates its picker from this).
-- No write policies: only the service role (which bypasses RLS) may modify profiles.
DROP POLICY IF EXISTS "Authenticated users can read disease profiles" ON public.disease_profiles;
CREATE POLICY "Authenticated users can read disease profiles"
  ON public.disease_profiles FOR SELECT
  TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- 2. The 17 profiles
-- ---------------------------------------------------------------------------

INSERT INTO public.disease_profiles
  (code, name, category, min_days, recommended_days, confidence, required_signals, profile, description, sort_order)
VALUES

('healthy_baseline', 'Healthy Baseline', 'baseline', 7, 30, 5,
 ARRAY['sleep','heart_rate','heart_rate_variability','respiratory_rate','oxygen_saturation'],
 '{"sleep":{"efficiency_pct":[88,95],"latency_min":[8,18],"waso_min":[10,25],"awakenings":[1,3],"duration_min":[420,480]},
   "stages_pct":{"deep":[20,25],"rem":[20,25],"light":[48,55],"awake":[4,8]},
   "vitals":{"night_hr_bpm":[52,62],"hrv_rmssd_ms":[55,85],"resp_bpm":[13,16],"spo2_pct":[96,99]},
   "events":{"apnea_per_hour":[0,2],"plm_per_hour":[0,4],"rem_movement_idx":[0,2],"snoring_pct":[0,5]},
   "schedule":{"bedtime_hhmm":"22:45","bedtime_sd_min":20,"wake_sd_min":20}}'::jsonb,
 'Control profile. Generate alongside a condition to give algorithms a contrast set.', 0),

('sleep_apnea', 'Sleep Apnea', 'sleep_disorder', 3, 30, 5,
 ARRAY['respiratory_rate','oxygen_saturation','heart_rate','sleep'],
 '{"sleep":{"efficiency_pct":[68,82],"latency_min":[10,25],"waso_min":[40,90],"awakenings":[8,22],"duration_min":[360,450]},
   "stages_pct":{"deep":[8,14],"rem":[12,18],"light":[58,68],"awake":[12,20]},
   "vitals":{"night_hr_bpm":[62,78],"hrv_rmssd_ms":[25,45],"resp_bpm":[14,22],"spo2_pct":[86,94]},
   "events":{"apnea_per_hour":[15,35],"plm_per_hour":[0,6],"rem_movement_idx":[0,3],"snoring_pct":[35,70]},
   "schedule":{"bedtime_hhmm":"22:30","bedtime_sd_min":30,"wake_sd_min":30}}'::jsonb,
 'Drives AHI >= 15 with SpO2 desaturation dips and elevated respiratory variability.', 1),

('insomnia', 'Insomnia', 'sleep_disorder', 7, 30, 4,
 ARRAY['sleep'],
 '{"sleep":{"efficiency_pct":[58,78],"latency_min":[45,110],"waso_min":[60,130],"awakenings":[5,12],"duration_min":[270,390]},
   "stages_pct":{"deep":[10,16],"rem":[14,19],"light":[52,62],"awake":[12,22]},
   "vitals":{"night_hr_bpm":[60,72],"hrv_rmssd_ms":[35,55],"resp_bpm":[13,17],"spo2_pct":[95,98]},
   "events":{"apnea_per_hour":[0,3],"plm_per_hour":[0,5],"rem_movement_idx":[0,2],"snoring_pct":[0,10]},
   "schedule":{"bedtime_hhmm":"23:15","bedtime_sd_min":45,"wake_sd_min":40}}'::jsonb,
 'Long latency, high WASO, efficiency below the 85% rule-based cutoff.', 2),

('circadian_rhythm_disorder', 'Circadian Rhythm Disorder', 'sleep_disorder', 14, 60, 4,
 ARRAY['sleep'],
 '{"sleep":{"efficiency_pct":[74,88],"latency_min":[20,50],"waso_min":[25,60],"awakenings":[3,7],"duration_min":[330,450]},
   "stages_pct":{"deep":[14,20],"rem":[16,22],"light":[52,60],"awake":[8,14]},
   "vitals":{"night_hr_bpm":[56,68],"hrv_rmssd_ms":[40,65],"resp_bpm":[13,16],"spo2_pct":[95,98]},
   "events":{"apnea_per_hour":[0,3],"plm_per_hour":[0,4],"rem_movement_idx":[0,2],"snoring_pct":[0,10]},
   "schedule":{"bedtime_hhmm":"23:30","bedtime_sd_min":135,"wake_sd_min":120}}'::jsonb,
 'Timing irregularity is the signal: bedtime SD well above the 90-minute threshold.', 3),

('restless_leg_syndrome', 'Restless Leg Syndrome', 'sleep_disorder', 7, 30, 3,
 ARRAY['sleep','movement'],
 '{"sleep":{"efficiency_pct":[70,84],"latency_min":[25,60],"waso_min":[35,80],"awakenings":[6,14],"duration_min":[330,420]},
   "stages_pct":{"deep":[10,16],"rem":[15,20],"light":[55,64],"awake":[10,16]},
   "vitals":{"night_hr_bpm":[58,70],"hrv_rmssd_ms":[38,58],"resp_bpm":[13,17],"spo2_pct":[95,98]},
   "events":{"apnea_per_hour":[0,3],"plm_per_hour":[18,45],"rem_movement_idx":[1,4],"snoring_pct":[0,12]},
   "schedule":{"bedtime_hhmm":"22:45","bedtime_sd_min":30,"wake_sd_min":30}}'::jsonb,
 'PLMI above 15/hr, concentrated in light sleep, with movement-driven awakenings.', 4),

('rem_behavior_disorder', 'REM Sleep Behavior Disorder', 'sleep_disorder', 14, 60, 3,
 ARRAY['sleep','movement'],
 '{"sleep":{"efficiency_pct":[74,88],"latency_min":[12,30],"waso_min":[25,55],"awakenings":[3,8],"duration_min":[360,450]},
   "stages_pct":{"deep":[14,20],"rem":[22,30],"light":[46,54],"awake":[6,12]},
   "vitals":{"night_hr_bpm":[56,70],"hrv_rmssd_ms":[40,62],"resp_bpm":[13,17],"spo2_pct":[95,98]},
   "events":{"apnea_per_hour":[0,3],"plm_per_hour":[2,8],"rem_movement_idx":[12,30],"snoring_pct":[0,12]},
   "schedule":{"bedtime_hhmm":"22:30","bedtime_sd_min":25,"wake_sd_min":25}}'::jsonb,
 'Motor activity during REM instead of atonia. Feeds the Parkinson prodrome signal.', 5),

('chronic_sleep_deprivation', 'Chronic Sleep Deprivation', 'sleep_disorder', 7, 21, 5,
 ARRAY['sleep'],
 '{"sleep":{"efficiency_pct":[86,94],"latency_min":[3,10],"waso_min":[8,20],"awakenings":[1,3],"duration_min":[240,330]},
   "stages_pct":{"deep":[22,28],"rem":[14,19],"light":[48,56],"awake":[4,8]},
   "vitals":{"night_hr_bpm":[58,70],"hrv_rmssd_ms":[35,55],"resp_bpm":[13,16],"spo2_pct":[95,98]},
   "events":{"apnea_per_hour":[0,2],"plm_per_hour":[0,4],"rem_movement_idx":[0,2],"snoring_pct":[0,8]},
   "schedule":{"bedtime_hhmm":"00:30","bedtime_sd_min":40,"wake_sd_min":20}}'::jsonb,
 'Short duration with high efficiency and fast latency - sleep debt, not insomnia.', 6),

('depression_risk', 'Depression Risk', 'mental_health', 21, 90, 3,
 ARRAY['sleep','heart_rate_variability','heart_rate'],
 '{"sleep":{"efficiency_pct":[66,80],"latency_min":[25,60],"waso_min":[45,95],"awakenings":[5,12],"duration_min":[300,540]},
   "stages_pct":{"deep":[8,14],"rem":[26,34],"light":[46,56],"awake":[10,18]},
   "vitals":{"night_hr_bpm":[62,74],"hrv_rmssd_ms":[25,45],"resp_bpm":[13,17],"spo2_pct":[95,98]},
   "events":{"apnea_per_hour":[0,3],"plm_per_hour":[0,5],"rem_movement_idx":[0,3],"snoring_pct":[0,10]},
   "schedule":{"bedtime_hhmm":"23:45","bedtime_sd_min":75,"wake_sd_min":80}}'::jsonb,
 'Elevated REM share, reduced deep sleep, fragmentation and irregular timing.', 7),

('anxiety_risk', 'Anxiety Risk', 'mental_health', 14, 30, 3,
 ARRAY['heart_rate','heart_rate_variability','sleep'],
 '{"sleep":{"efficiency_pct":[70,84],"latency_min":[35,80],"waso_min":[35,75],"awakenings":[5,11],"duration_min":[330,420]},
   "stages_pct":{"deep":[12,18],"rem":[17,23],"light":[52,60],"awake":[9,15]},
   "vitals":{"night_hr_bpm":[66,80],"hrv_rmssd_ms":[20,40],"resp_bpm":[15,19],"spo2_pct":[95,98]},
   "events":{"apnea_per_hour":[0,3],"plm_per_hour":[0,6],"rem_movement_idx":[0,3],"snoring_pct":[0,10]},
   "schedule":{"bedtime_hhmm":"23:00","bedtime_sd_min":40,"wake_sd_min":35}}'::jsonb,
 'Low HRV with elevated night HR and long sleep onset.', 8),

('burnout_stress', 'Burnout / Stress', 'mental_health', 7, 21, 4,
 ARRAY['heart_rate_variability','heart_rate','sleep'],
 '{"sleep":{"efficiency_pct":[72,86],"latency_min":[20,50],"waso_min":[30,65],"awakenings":[4,9],"duration_min":[300,390]},
   "stages_pct":{"deep":[10,16],"rem":[16,22],"light":[54,62],"awake":[8,14]},
   "vitals":{"night_hr_bpm":[68,82],"hrv_rmssd_ms":[18,38],"resp_bpm":[14,18],"spo2_pct":[95,98]},
   "events":{"apnea_per_hour":[0,3],"plm_per_hour":[0,5],"rem_movement_idx":[0,2],"snoring_pct":[0,10]},
   "schedule":{"bedtime_hhmm":"23:30","bedtime_sd_min":50,"wake_sd_min":30},
   "trend":{"field":"hrv_rmssd_ms","per_30d":-6}}'::jsonb,
 'Falling HRV against rising resting HR - drives RecoveryIndex below 60.', 9),

('cardiovascular_risk', 'Cardiovascular Risk', 'cardiometabolic', 30, 90, 4,
 ARRAY['heart_rate','heart_rate_variability','respiratory_rate','sleep'],
 '{"sleep":{"efficiency_pct":[70,84],"latency_min":[15,40],"waso_min":[35,75],"awakenings":[4,10],"duration_min":[330,420]},
   "stages_pct":{"deep":[9,15],"rem":[15,21],"light":[55,63],"awake":[9,15]},
   "vitals":{"night_hr_bpm":[70,84],"hrv_rmssd_ms":[15,32],"resp_bpm":[15,19],"spo2_pct":[93,97]},
   "events":{"apnea_per_hour":[3,10],"plm_per_hour":[0,5],"rem_movement_idx":[0,3],"snoring_pct":[10,30]},
   "schedule":{"bedtime_hhmm":"22:45","bedtime_sd_min":35,"wake_sd_min":30},
   "trend":{"field":"hrv_rmssd_ms","per_30d":-3}}'::jsonb,
 'Sustained low HRV, high resting HR, reduced deep sleep over a 90-day window.', 10),

('hypertension_risk', 'Hypertension Risk', 'cardiometabolic', 30, 90, 3,
 ARRAY['heart_rate','heart_rate_variability','sleep'],
 '{"sleep":{"efficiency_pct":[72,86],"latency_min":[15,40],"waso_min":[30,70],"awakenings":[5,12],"duration_min":[330,420]},
   "stages_pct":{"deep":[10,16],"rem":[16,21],"light":[54,62],"awake":[9,15]},
   "vitals":{"night_hr_bpm":[72,86],"hrv_rmssd_ms":[18,34],"resp_bpm":[14,18],"spo2_pct":[94,97]},
   "events":{"apnea_per_hour":[2,8],"plm_per_hour":[0,5],"rem_movement_idx":[0,2],"snoring_pct":[10,30]},
   "schedule":{"bedtime_hhmm":"22:45","bedtime_sd_min":30,"wake_sd_min":30},
   "trend":{"field":"night_hr_bpm","per_30d":2}}'::jsonb,
 'Night HR climbing past baseline+10 while HRV declines across 30 days.', 11),

('diabetes_risk', 'Diabetes Risk', 'cardiometabolic', 30, 90, 3,
 ARRAY['sleep','heart_rate_variability','heart_rate'],
 '{"sleep":{"efficiency_pct":[72,86],"latency_min":[15,45],"waso_min":[30,70],"awakenings":[3,9],"duration_min":[280,400]},
   "stages_pct":{"deep":[11,17],"rem":[16,21],"light":[53,61],"awake":[8,14]},
   "vitals":{"night_hr_bpm":[66,80],"hrv_rmssd_ms":[20,38],"resp_bpm":[14,17],"spo2_pct":[94,98]},
   "events":{"apnea_per_hour":[2,8],"plm_per_hour":[0,5],"rem_movement_idx":[0,2],"snoring_pct":[10,28]},
   "schedule":{"bedtime_hhmm":"23:30","bedtime_sd_min":70,"wake_sd_min":60}}'::jsonb,
 'Short and irregular sleep timing combined with depressed HRV.', 12),

('obesity_risk', 'Obesity Risk', 'cardiometabolic', 30, 90, 3,
 ARRAY['sleep'],
 '{"sleep":{"efficiency_pct":[74,88],"latency_min":[10,30],"waso_min":[25,60],"awakenings":[3,8],"duration_min":[270,355]},
   "stages_pct":{"deep":[12,18],"rem":[15,20],"light":[54,62],"awake":[7,13]},
   "vitals":{"night_hr_bpm":[64,78],"hrv_rmssd_ms":[25,45],"resp_bpm":[14,18],"spo2_pct":[93,97]},
   "events":{"apnea_per_hour":[4,12],"plm_per_hour":[0,5],"rem_movement_idx":[0,2],"snoring_pct":[20,45]},
   "schedule":{"bedtime_hhmm":"23:45","bedtime_sd_min":60,"wake_sd_min":55}}'::jsonb,
 'Duration held under 6 hours for 30+ days, the weight-gain rule threshold.', 13),

('cognitive_decline_risk', 'Cognitive Decline Risk', 'cognitive', 90, 180, 2,
 ARRAY['sleep'],
 '{"sleep":{"efficiency_pct":[68,82],"latency_min":[20,50],"waso_min":[45,95],"awakenings":[6,14],"duration_min":[330,450]},
   "stages_pct":{"deep":[7,13],"rem":[13,19],"light":[56,64],"awake":[11,18]},
   "vitals":{"night_hr_bpm":[60,74],"hrv_rmssd_ms":[22,42],"resp_bpm":[13,17],"spo2_pct":[94,97]},
   "events":{"apnea_per_hour":[2,8],"plm_per_hour":[2,8],"rem_movement_idx":[1,5],"snoring_pct":[10,25]},
   "schedule":{"bedtime_hhmm":"22:15","bedtime_sd_min":80,"wake_sd_min":75},
   "trend":{"field":"deep_pct","per_30d":-0.4}}'::jsonb,
 'Slow multi-month decline in deep sleep with rising fragmentation.', 14),

('parkinsons_early_risk', 'Parkinsons Early Risk', 'cognitive', 60, 180, 2,
 ARRAY['sleep','movement'],
 '{"sleep":{"efficiency_pct":[70,84],"latency_min":[15,40],"waso_min":[35,75],"awakenings":[4,10],"duration_min":[330,430]},
   "stages_pct":{"deep":[10,16],"rem":[20,28],"light":[48,58],"awake":[8,14]},
   "vitals":{"night_hr_bpm":[58,72],"hrv_rmssd_ms":[22,42],"resp_bpm":[13,17],"spo2_pct":[94,98]},
   "events":{"apnea_per_hour":[0,4],"plm_per_hour":[8,20],"rem_movement_idx":[15,35],"snoring_pct":[5,20]},
   "schedule":{"bedtime_hhmm":"22:30","bedtime_sd_min":45,"wake_sd_min":40},
   "trend":{"field":"rem_movement_idx","per_30d":1.5}}'::jsonb,
 'Persistent REM motor activity plus periodic limb movement, escalating over 180 days.', 15),

('alzheimers_risk', 'Alzheimers Risk', 'cognitive', 180, 365, 2,
 ARRAY['sleep'],
 '{"sleep":{"efficiency_pct":[62,78],"latency_min":[25,65],"waso_min":[55,120],"awakenings":[7,18],"duration_min":[300,440]},
   "stages_pct":{"deep":[4,9],"rem":[11,17],"light":[58,68],"awake":[13,22]},
   "vitals":{"night_hr_bpm":[60,76],"hrv_rmssd_ms":[18,38],"resp_bpm":[13,17],"spo2_pct":[93,97]},
   "events":{"apnea_per_hour":[3,10],"plm_per_hour":[3,10],"rem_movement_idx":[2,8],"snoring_pct":[12,30]},
   "schedule":{"bedtime_hhmm":"21:45","bedtime_sd_min":110,"wake_sd_min":100},
   "trend":{"field":"deep_pct","per_30d":-0.3}}'::jsonb,
 'Deep sleep held under 10% across 180+ days, the long-horizon rule condition.', 16),

('chronic_fatigue_syndrome', 'Chronic Fatigue Syndrome', 'recovery', 30, 90, 3,
 ARRAY['sleep','heart_rate_variability','heart_rate'],
 '{"sleep":{"efficiency_pct":[68,82],"latency_min":[20,55],"waso_min":[40,90],"awakenings":[5,12],"duration_min":[400,540]},
   "stages_pct":{"deep":[8,14],"rem":[15,21],"light":[55,64],"awake":[10,17]},
   "vitals":{"night_hr_bpm":[68,82],"hrv_rmssd_ms":[15,32],"resp_bpm":[14,18],"spo2_pct":[94,98]},
   "events":{"apnea_per_hour":[0,4],"plm_per_hour":[0,6],"rem_movement_idx":[0,3],"snoring_pct":[0,15]},
   "schedule":{"bedtime_hhmm":"22:30","bedtime_sd_min":55,"wake_sd_min":60},
   "trend":{"field":"hrv_rmssd_ms","per_30d":-2}}'::jsonb,
 'Long time in bed with poor recovery - unrefreshing sleep despite duration.', 17)

ON CONFLICT (code) DO UPDATE
  SET name             = EXCLUDED.name,
      category         = EXCLUDED.category,
      min_days         = EXCLUDED.min_days,
      recommended_days = EXCLUDED.recommended_days,
      confidence       = EXCLUDED.confidence,
      required_signals = EXCLUDED.required_signals,
      profile          = EXCLUDED.profile,
      description      = EXCLUDED.description,
      sort_order       = EXCLUDED.sort_order,
      updated_at       = now();

-- ---------------------------------------------------------------------------
-- 3. Bed Pad data type configs for what the mat actually emits
--
-- Shapes mirror the observed real-device rows exactly:
--   sleep                  {start,end,title,notes,stages[],stage_minutes{},...}  unit minutes
--   sleep_stage            {stage, duration_minutes}                             unit minutes
--   heart_rate             {bpm}                                                 unit bpm
--   respiratory_rate       {breaths_per_minute}                                  unit breaths/min
--   heart_rate_variability {rmssd_ms}                                            unit ms
--   oxygen_saturation      {percentage}                                          unit %
--
-- sample_data_config uses the FLAT form with a top-level "type" key. The nested
-- form only parses via configType "combined" (SimulatorService), which is not
-- what these types need.
-- ---------------------------------------------------------------------------

INSERT INTO public.device_type_data_configs
  (device_type_id, data_type, display_name, unit, value_type, sample_data_config, is_required, sort_order)
SELECT dt.id, v.data_type, v.display_name, v.unit, v.value_type, v.sample_data_config, FALSE, v.sort_order
FROM public.device_types dt
CROSS JOIN (VALUES
  ('sleep', 'Sleep Session', 'minutes', 'object',
   '{"type":"sleep_session","duration_min":{"min":240,"max":540},"efficiency_pct":{"min":60,"max":95},"stage_pct":{"deep":[8,25],"rem":[12,30],"light":[45,65],"awake":[4,20]}}'::jsonb, 10),
  ('sleep_stage', 'Sleep Stage', 'minutes', 'object',
   '{"type":"enum","values":["awake","light","deep","rem"]}'::jsonb, 11),
  ('heart_rate', 'Heart Rate', 'bpm', 'number',
   '{"type":"random_number","min":45,"max":95,"precision":0}'::jsonb, 12),
  ('respiratory_rate', 'Respiratory Rate', 'breaths/min', 'number',
   '{"type":"random_number","min":10,"max":24,"precision":0}'::jsonb, 13),
  ('heart_rate_variability', 'Heart Rate Variability', 'ms', 'number',
   '{"type":"random_number","min":12,"max":95,"precision":0}'::jsonb, 14),
  ('oxygen_saturation', 'Oxygen Saturation', '%', 'number',
   '{"type":"random_number","min":85,"max":100,"precision":0}'::jsonb, 15)
) AS v(data_type, display_name, unit, value_type, sample_data_config, sort_order)
WHERE dt.name = 'Bed Pad'
  AND NOT EXISTS (
    SELECT 1 FROM public.device_type_data_configs c
    WHERE c.device_type_id = dt.id AND c.data_type = v.data_type
  );

-- ---------------------------------------------------------------------------
-- 4. Withings WSM02-ALL-US: drop `pressure`, declare the real types.
--
-- generateAndSendModelBasedData filters by the model's supported_data_types, so
-- narrowing it here stops this model emitting pressure while leaving the Bed Pad
-- `pressure` config intact for other models that legitimately use it.
-- ---------------------------------------------------------------------------

UPDATE public.device_models
SET supported_data_types = ARRAY[
      'sleep',
      'sleep_stage',
      'heart_rate',
      'respiratory_rate',
      'heart_rate_variability',
      'oxygen_saturation'
    ],
    specifications = jsonb_build_object(
      'sensors',      specifications->'sensors',
      'features',     specifications->'features',
      'connectivity', specifications->'connectivity',
      -- Numeric ranges so generateModelBasedData has something simulatable
      -- instead of falling through to the supported_data_types path.
      'heart_rate',             jsonb_build_object('min', 45, 'max', 95,  'precision', 0, 'unit', 'bpm'),
      'respiratory_rate',       jsonb_build_object('min', 10, 'max', 24,  'precision', 0, 'unit', 'breaths/min'),
      'heart_rate_variability', jsonb_build_object('min', 12, 'max', 95,  'precision', 0, 'unit', 'ms'),
      'oxygen_saturation',      jsonb_build_object('min', 85, 'max', 100, 'precision', 0, 'unit', '%')
    ),
    updated_at = now()
WHERE model_number = 'WSM02-ALL-US';
