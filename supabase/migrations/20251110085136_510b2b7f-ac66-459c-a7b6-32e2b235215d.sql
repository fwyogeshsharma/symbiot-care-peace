-- Insert new device types for IoT monitoring system

-- Bed Pad - Monitors bed occupancy and sleep patterns
INSERT INTO public.device_types (code, name, description, icon, category, is_active, supports_position_tracking, data_frequency_per_day)
VALUES (
  'bed_pad',
  'Bed Pad',
  'Pressure-sensitive bed pad for monitoring bed occupancy, sleep patterns, and movement during rest',
  'Bed',
  'HEALTH',
  true,
  false,
  48
);

-- Chair/Seat Sensor - Monitors sitting duration and posture
INSERT INTO public.device_types (code, name, description, icon, category, is_active, supports_position_tracking, data_frequency_per_day)
VALUES (
  'chair_seat',
  'Chair/Seat',
  'Pressure sensor for chairs and seats to monitor sitting duration, posture, and activity levels',
  'Armchair',
  'ACTIVITY',
  true,
  false,
  48
);

-- Toilet Seat Sensor - Monitors bathroom usage patterns
INSERT INTO public.device_types (code, name, description, icon, category, is_active, supports_position_tracking, data_frequency_per_day)
VALUES (
  'toilet_seat',
  'Toilet Seat',
  'Smart toilet seat sensor for monitoring bathroom usage frequency, duration, and health metrics',
  'Droplet',
  'HEALTH',
  true,
  false,
  24
);

-- Commercial Scale - Weight monitoring device
INSERT INTO public.device_types (code, name, description, icon, category, is_active, supports_position_tracking, data_frequency_per_day)
VALUES (
  'commercial_scale',
  'Commercial Scale',
  'Digital scale for tracking weight measurements and body composition metrics',
  'Scale',
  'HEALTH',
  true,
  false,
  12
);

-- Smart Phone - Mobile device with GPS tracking
INSERT INTO public.device_types (code, name, description, icon, category, is_active, supports_position_tracking, data_frequency_per_day)
VALUES (
  'smart_phone',
  'Smart Phone',
  'Mobile smartphone with GPS tracking, activity monitoring, and health data collection capabilities',
  'Smartphone',
  'POSITION',
  true,
  true,
  96
);