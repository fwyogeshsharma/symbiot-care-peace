-- Add specific environmental data types for air quality monitoring

-- Drop the existing check constraint
ALTER TABLE device_data DROP CONSTRAINT IF EXISTS device_data_data_type_check;

-- Add updated check constraint to include environmental sensor data types
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
  'noise_level',
  -- Additional environmental data types for air quality monitoring
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
  'eco2'
));

-- Create index for environmental data queries
CREATE INDEX IF NOT EXISTS idx_device_data_environmental
ON device_data(data_type, recorded_at DESC)
WHERE data_type IN (
  'temperature',
  'humidity',
  'co2',
  'carbon_dioxide',
  'voc',
  'volatile_organic_compounds',
  'pm2_5',
  'pm25',
  'pm10',
  'aqi',
  'air_quality_index',
  'air_quality'
);
