-- Drop the existing device_type check constraint
ALTER TABLE public.devices DROP CONSTRAINT IF EXISTS devices_device_type_check;

-- Add the updated constraint with temperature_sensor included
ALTER TABLE public.devices ADD CONSTRAINT devices_device_type_check 
CHECK ((device_type = ANY (ARRAY[
  'medical'::text, 
  'wearable'::text, 
  'environmental'::text, 
  'door_sensor'::text, 
  'room_sensor'::text, 
  'seat_sensor'::text, 
  'bed_sensor'::text, 
  'fall_detector'::text, 
  'motion_sensor'::text, 
  'electronics_monitor'::text, 
  'scale_sensor'::text, 
  'ambient_sensor'::text, 
  'worker_wearable'::text,
  'temperature_sensor'::text
])));