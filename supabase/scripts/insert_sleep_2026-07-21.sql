-- Inserts one sleep session (summary + per-stage rows) into device_data for the night
-- ending the morning of 2026-07-21, in the exact shape HealthConnectReader.kt produces
-- for a real Health Connect sync. Safe to re-run: ON CONFLICT updates in place instead
-- of erroring or duplicating, using the same (device_id, data_type, recorded_at) key the
-- real sync upserts on.

INSERT INTO device_data (device_id, elderly_person_id, data_type, value, unit, recorded_at)
VALUES (
  'c4648ea6-ea5f-4daa-bdfa-01e25338ec5b',
  '3389b134-9f9e-4688-8241-083aedc07dad',
  'sleep',
  jsonb_build_object(
    'duration_minutes', 495,
    'start', '2026-07-20T22:30:00Z',
    'end', '2026-07-21T06:45:00Z',  -- 495 minutes = 8h15m in bed
    'title', NULL,
    'notes', NULL,
    'time_in_bed_minutes', 495,
    'time_asleep_minutes', 475,
    'sleep_efficiency_percentage', 96,
    'awakenings_count', 1,
    'stage_minutes', jsonb_build_object(
      'awake_minutes', 20,
      'awake_in_bed_minutes', 0,
      'out_of_bed_minutes', 0,
      'light_minutes', 270,
      'deep_minutes', 105,
      'rem_minutes', 100,
      'sleeping_minutes', 0,
      'unknown_minutes', 0
    ),
    'stages', jsonb_build_array(
      jsonb_build_object('stage', 'light', 'start', '2026-07-20T22:30:00Z', 'end', '2026-07-20T23:15:00Z', 'duration_minutes', 45),
      jsonb_build_object('stage', 'deep',  'start', '2026-07-20T23:15:00Z', 'end', '2026-07-21T01:00:00Z', 'duration_minutes', 105),
      jsonb_build_object('stage', 'light', 'start', '2026-07-21T01:00:00Z', 'end', '2026-07-21T02:30:00Z', 'duration_minutes', 90),
      jsonb_build_object('stage', 'rem',   'start', '2026-07-21T02:30:00Z', 'end', '2026-07-21T04:10:00Z', 'duration_minutes', 100),
      jsonb_build_object('stage', 'light', 'start', '2026-07-21T04:10:00Z', 'end', '2026-07-21T05:50:00Z', 'duration_minutes', 100),
      jsonb_build_object('stage', 'awake', 'start', '2026-07-21T05:50:00Z', 'end', '2026-07-21T06:10:00Z', 'duration_minutes', 20),
      jsonb_build_object('stage', 'light', 'start', '2026-07-21T06:10:00Z', 'end', '2026-07-21T06:45:00Z', 'duration_minutes', 35)
    )
  ),
  'minutes',
  '2026-07-21T06:45:00Z'
)
ON CONFLICT (device_id, data_type, recorded_at)
DO UPDATE SET value = EXCLUDED.value, unit = EXCLUDED.unit;

-- Matching per-stage rows, same shape HealthConnectReader.kt writes alongside the summary.
INSERT INTO device_data (device_id, elderly_person_id, data_type, value, unit, recorded_at)
VALUES
  ('c4648ea6-ea5f-4daa-bdfa-01e25338ec5b', '3389b134-9f9e-4688-8241-083aedc07dad', 'sleep_stage', jsonb_build_object('stage', 'light', 'duration_minutes', 45),  'minutes', '2026-07-20T23:15:00Z'),
  ('c4648ea6-ea5f-4daa-bdfa-01e25338ec5b', '3389b134-9f9e-4688-8241-083aedc07dad', 'sleep_stage', jsonb_build_object('stage', 'deep',  'duration_minutes', 105), 'minutes', '2026-07-21T01:00:00Z'),
  ('c4648ea6-ea5f-4daa-bdfa-01e25338ec5b', '3389b134-9f9e-4688-8241-083aedc07dad', 'sleep_stage', jsonb_build_object('stage', 'light', 'duration_minutes', 90),  'minutes', '2026-07-21T02:30:00Z'),
  ('c4648ea6-ea5f-4daa-bdfa-01e25338ec5b', '3389b134-9f9e-4688-8241-083aedc07dad', 'sleep_stage', jsonb_build_object('stage', 'rem',   'duration_minutes', 100), 'minutes', '2026-07-21T04:10:00Z'),
  ('c4648ea6-ea5f-4daa-bdfa-01e25338ec5b', '3389b134-9f9e-4688-8241-083aedc07dad', 'sleep_stage', jsonb_build_object('stage', 'light', 'duration_minutes', 100), 'minutes', '2026-07-21T05:50:00Z'),
  ('c4648ea6-ea5f-4daa-bdfa-01e25338ec5b', '3389b134-9f9e-4688-8241-083aedc07dad', 'sleep_stage', jsonb_build_object('stage', 'awake', 'duration_minutes', 20),  'minutes', '2026-07-21T06:10:00Z'),
  ('c4648ea6-ea5f-4daa-bdfa-01e25338ec5b', '3389b134-9f9e-4688-8241-083aedc07dad', 'sleep_stage', jsonb_build_object('stage', 'light', 'duration_minutes', 35),  'minutes', '2026-07-21T06:45:00Z')
ON CONFLICT (device_id, data_type, recorded_at)
DO UPDATE SET value = EXCLUDED.value, unit = EXCLUDED.unit;
