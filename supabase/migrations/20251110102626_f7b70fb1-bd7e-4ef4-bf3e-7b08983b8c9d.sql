-- Update all device types to use proper Lucide icon names instead of emojis

-- Door/Window Sensor: 🚪 -> DoorOpen
UPDATE device_types SET icon = 'DoorOpen' WHERE code = 'door_sensor';

-- Emergency Button: 🆘 -> AlertOctagon
UPDATE device_types SET icon = 'AlertOctagon' WHERE code = 'emergency_button';

-- Environmental Sensor: 🌡️ -> Thermometer
UPDATE device_types SET icon = 'Thermometer' WHERE code = 'environmental';

-- Fall Detection: 🚨 -> UserX
UPDATE device_types SET icon = 'UserX' WHERE code = 'fall_detector';

-- GPS Tracker: 🗺️ -> MapPin
UPDATE device_types SET icon = 'MapPin' WHERE code = 'gps_tracker';

-- Medical Device: 🏥 -> Stethoscope
UPDATE device_types SET icon = 'Stethoscope' WHERE code = 'medical';

-- Medication Dispenser: 💊 -> Pill
UPDATE device_types SET icon = 'Pill' WHERE code = 'medication';

-- Motion Sensor: 👁️ -> Eye
UPDATE device_types SET icon = 'Eye' WHERE code = 'motion_sensor';

-- Security Camera: 📹 -> Video
UPDATE device_types SET icon = 'Video' WHERE code = 'camera';

-- Sleep Monitor: 😴 -> Moon
UPDATE device_types SET icon = 'Moon' WHERE code = 'sleep_monitor';

-- Smart Home Hub: 🏠 -> Home
UPDATE device_types SET icon = 'Home' WHERE code = 'smart_home';

-- Wearable Device: ⌚ -> Watch
UPDATE device_types SET icon = 'Watch' WHERE code = 'wearable';

-- Worker Wearable: 📍 -> MapPin (if it has emoji)
UPDATE device_types SET icon = 'MapPin' WHERE code = 'worker_wearable' AND icon = '📍';