-- Drop the existing check constraint on device_data.data_type
ALTER TABLE device_data DROP CONSTRAINT IF EXISTS device_data_data_type_check;

-- Add updated check constraint with all device data types
ALTER TABLE device_data ADD CONSTRAINT device_data_data_type_check 
CHECK (data_type IN (
  'heart_rate',
  'blood_pressure',
  'temperature',
  'fall_detected',
  'steps',
  'sleep',
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
  'alert_threshold'
));