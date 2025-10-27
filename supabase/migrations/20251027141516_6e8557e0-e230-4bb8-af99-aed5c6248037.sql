-- Drop the existing check constraint on device_type
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_device_type_check;

-- Map existing devices to new device type codes
UPDATE devices SET device_type = 'environmental' WHERE device_type = 'ambient_sensor';
UPDATE devices SET device_type = 'sleep_monitor' WHERE device_type = 'bed_sensor';
UPDATE devices SET device_type = 'smart_home' WHERE device_type = 'electronics_monitor';
UPDATE devices SET device_type = 'environmental' WHERE device_type = 'room_sensor';
UPDATE devices SET device_type = 'medical' WHERE device_type = 'scale_sensor';
UPDATE devices SET device_type = 'motion_sensor' WHERE device_type = 'seat_sensor';

-- Add index on device_type for faster joins
CREATE INDEX IF NOT EXISTS idx_devices_device_type ON devices(device_type);

-- Add foreign key constraint (this will enforce valid device types going forward)
ALTER TABLE devices
ADD CONSTRAINT fk_devices_device_type
FOREIGN KEY (device_type)
REFERENCES device_types(code)
ON DELETE RESTRICT
ON UPDATE CASCADE;