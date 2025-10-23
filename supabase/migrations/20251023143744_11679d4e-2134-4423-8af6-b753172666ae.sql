-- Update devices_device_type_check constraint to include all existing types plus worker_wearable
ALTER TABLE devices 
DROP CONSTRAINT IF EXISTS devices_device_type_check;

ALTER TABLE devices 
ADD CONSTRAINT devices_device_type_check 
CHECK (device_type IN (
  'medical', 
  'wearable', 
  'environmental', 
  'door_sensor', 
  'room_sensor', 
  'seat_sensor', 
  'bed_sensor', 
  'fall_detector',
  'motion_sensor',
  'electronics_monitor',
  'scale_sensor',
  'ambient_sensor',
  'worker_wearable'
));