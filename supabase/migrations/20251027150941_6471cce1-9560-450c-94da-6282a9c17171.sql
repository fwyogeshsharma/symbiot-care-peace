-- Drop the old check constraint on data_type
ALTER TABLE device_data DROP CONSTRAINT IF EXISTS device_data_data_type_check;

-- Add updated check constraint to include all existing data types plus 'position'
ALTER TABLE device_data
ADD CONSTRAINT device_data_data_type_check
CHECK (data_type IN (
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
  'noise_level'
));