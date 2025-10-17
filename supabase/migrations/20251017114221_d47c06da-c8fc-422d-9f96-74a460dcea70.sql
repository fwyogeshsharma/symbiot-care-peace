-- Drop the existing check constraint on device_type
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_device_type_check;

-- Add updated check constraint with all device types
ALTER TABLE devices ADD CONSTRAINT devices_device_type_check 
CHECK (device_type IN (
  'wearable',
  'medical',
  'door_sensor',
  'bed_sensor',
  'seat_sensor',
  'room_sensor',
  'scale_sensor',
  'ambient_sensor',
  'electronics_monitor',
  'motion_sensor',
  'fall_detector',
  'temperature_sensor'
));