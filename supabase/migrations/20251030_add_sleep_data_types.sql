-- Add missing sleep data types to device_data constraint
-- Migration to support sleep_quality and sleep_stage data types

ALTER TABLE device_data DROP CONSTRAINT IF EXISTS device_data_data_type_check;

-- Add updated check constraint with all device data types including sleep
ALTER TABLE device_data ADD CONSTRAINT device_data_data_type_check
CHECK (data_type IN (
  'heart_rate',
  'blood_pressure',
  'temperature',
  'fall_detected',
  'steps',
  'sleep',
  'sleep_quality',
  'sleep_stage',
  'activity',
  'location',
  'oxygen_saturation',
  'bed_occupancy',
  'movement',
  'duration',
  'door_status',
  'movement_detected',
  'seat_occupancy',
  'presence',
  'weight',
  'bmi',
  'humidity',
  'light',
  'power_status',
  'usage',
  'motion_detected',
  'orientation',
  'alert_threshold',
  'button_pressed',
  'medication_taken',
  'next_dose_time',
  'last_opened',
  'impact_force',
  'speed',
  'power_consumption',
  'system_status',
  'recording_status',
  'position'
));
