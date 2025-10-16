-- Drop the restrictive check constraint on devices.device_type
ALTER TABLE public.devices DROP CONSTRAINT IF EXISTS devices_device_type_check;

-- Add a new, more flexible check constraint that allows common device types
ALTER TABLE public.devices
ADD CONSTRAINT devices_device_type_check
CHECK (device_type IN ('medical', 'wearable', 'environmental', 'emergency', 'door_sensor', 'motion_sensor', 'camera', 'fall_detector', 'medication_dispenser', 'vital_monitor', 'gps_tracker', 'smart_button', 'other'));