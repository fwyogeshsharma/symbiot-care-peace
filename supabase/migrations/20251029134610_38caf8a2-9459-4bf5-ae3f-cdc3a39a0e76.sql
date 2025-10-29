-- Update device types with appropriate data frequencies based on their purpose

-- GPS Tracker: every 15 minutes
UPDATE device_types 
SET data_frequency_per_day = 96 
WHERE code = 'gps_tracker';

-- Health Wearables: every 5 minutes
UPDATE device_types 
SET data_frequency_per_day = 288 
WHERE code IN ('wearable', 'worker_wearable', 'medical');

-- Environmental Sensor: every hour
UPDATE device_types 
SET data_frequency_per_day = 24 
WHERE code = 'environmental';

-- Door Sensor: every minute for security
UPDATE device_types 
SET data_frequency_per_day = 1440 
WHERE code = 'door_sensor';

-- Fall Detector: every 2 minutes
UPDATE device_types 
SET data_frequency_per_day = 720 
WHERE code = 'fall_detector';

-- Motion Sensor: every 2 minutes
UPDATE device_types 
SET data_frequency_per_day = 720 
WHERE code = 'motion_sensor';

-- Emergency Button: every minute for safety
UPDATE device_types 
SET data_frequency_per_day = 1440 
WHERE code = 'emergency_button';

-- Sleep Monitor: every hour during sleep
UPDATE device_types 
SET data_frequency_per_day = 24 
WHERE code = 'sleep_monitor';

-- Medication Dispenser: every 30 minutes
UPDATE device_types 
SET data_frequency_per_day = 48 
WHERE code = 'medication';

-- Security Camera: every 24 minutes
UPDATE device_types 
SET data_frequency_per_day = 60 
WHERE code = 'camera';

-- Smart Home Hub: every 10 minutes
UPDATE device_types 
SET data_frequency_per_day = 144 
WHERE code = 'smart_home';