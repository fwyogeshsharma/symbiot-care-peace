-- Create device_types table
CREATE TABLE public.device_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  supports_position_tracking BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create device_type_data_configs table
CREATE TABLE public.device_type_data_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_type_id UUID REFERENCES public.device_types(id) ON DELETE CASCADE NOT NULL,
  data_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  unit TEXT,
  value_type TEXT NOT NULL,
  sample_data_config JSONB,
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(device_type_id, data_type)
);

-- Enable RLS
ALTER TABLE public.device_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_type_data_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for device_types
CREATE POLICY "Anyone can view active device types"
ON public.device_types FOR SELECT
USING (true);

CREATE POLICY "Admins can manage device types"
ON public.device_types FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for device_type_data_configs
CREATE POLICY "Anyone can view data configs"
ON public.device_type_data_configs FOR SELECT
USING (true);

CREATE POLICY "Admins can manage data configs"
ON public.device_type_data_configs FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger for device_types
CREATE TRIGGER update_device_types_updated_at
BEFORE UPDATE ON public.device_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for device_type_data_configs
CREATE TRIGGER update_device_type_data_configs_updated_at
BEFORE UPDATE ON public.device_type_data_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed device_types
INSERT INTO public.device_types (code, name, description, icon, category, supports_position_tracking) VALUES
('wearable', 'Wearable Device', 'Smart Watch, Activity Tracker', '⌚', 'health', false),
('worker_wearable', 'Worker Wearable', 'Indoor Positioning Device with Movement Tracking', '📍', 'tracking', true),
('medical', 'Medical Device', 'Heart Rate, Blood Pressure, Glucose Monitor', '🏥', 'health', false),
('environmental', 'Environmental Sensor', 'Temperature, Humidity Monitor', '🌡️', 'environment', false),
('fall_detector', 'Fall Detection', 'Automatic Fall Detection Device', '🚨', 'safety', false),
('gps_tracker', 'GPS Tracker', 'Outdoor Location Tracking', '🗺️', 'tracking', false),
('camera', 'Security Camera', 'Video Surveillance', '📹', 'security', false),
('door_sensor', 'Door/Window Sensor', 'Entry/Exit Detection', '🚪', 'security', false),
('motion_sensor', 'Motion Sensor', 'Movement Detection', '👁️', 'security', false),
('medication', 'Medication Dispenser', 'Automated Medication Reminder', '💊', 'health', false),
('smart_home', 'Smart Home Hub', 'Home Automation Controller', '🏠', 'automation', false),
('emergency_button', 'Emergency Button', 'Panic/SOS Button', '🆘', 'safety', false),
('sleep_monitor', 'Sleep Monitor', 'Sleep Quality Tracking', '😴', 'health', false);

-- Seed device_type_data_configs for wearable
INSERT INTO public.device_type_data_configs (device_type_id, data_type, display_name, unit, value_type, sample_data_config, sort_order)
SELECT id, 'heart_rate', 'Heart Rate', 'bpm', 'number', '{"min": 60, "max": 100, "type": "random_number", "precision": 0}'::jsonb, 1
FROM public.device_types WHERE code = 'wearable';

INSERT INTO public.device_type_data_configs (device_type_id, data_type, display_name, unit, value_type, sample_data_config, sort_order)
SELECT id, 'steps', 'Steps', 'steps', 'number', '{"min": 1000, "max": 15000, "type": "random_number", "precision": 0}'::jsonb, 2
FROM public.device_types WHERE code = 'wearable';

INSERT INTO public.device_type_data_configs (device_type_id, data_type, display_name, unit, value_type, sample_data_config, sort_order)
SELECT id, 'activity', 'Activity', '', 'string', '{"type": "enum", "values": ["walking", "running", "resting", "sleeping"]}'::jsonb, 3
FROM public.device_types WHERE code = 'wearable';

-- Seed device_type_data_configs for worker_wearable
INSERT INTO public.device_type_data_configs (device_type_id, data_type, display_name, unit, value_type, sample_data_config, sort_order)
SELECT id, 'position', 'Position', '', 'object', '{"type": "position", "indoor": true}'::jsonb, 1
FROM public.device_types WHERE code = 'worker_wearable';

-- Seed device_type_data_configs for medical
INSERT INTO public.device_type_data_configs (device_type_id, data_type, display_name, unit, value_type, sample_data_config, sort_order)
SELECT id, 'heart_rate', 'Heart Rate', 'bpm', 'number', '{"min": 65, "max": 95, "type": "random_number", "precision": 0}'::jsonb, 1
FROM public.device_types WHERE code = 'medical';

INSERT INTO public.device_type_data_configs (device_type_id, data_type, display_name, unit, value_type, sample_data_config, sort_order)
SELECT id, 'blood_pressure', 'Blood Pressure', 'mmHg', 'object', '{"type": "blood_pressure", "systolic": {"min": 110, "max": 130}, "diastolic": {"min": 70, "max": 85}}'::jsonb, 2
FROM public.device_types WHERE code = 'medical';

INSERT INTO public.device_type_data_configs (device_type_id, data_type, display_name, unit, value_type, sample_data_config, sort_order)
SELECT id, 'temperature', 'Temperature', '°C', 'number', '{"min": 36.2, "max": 37.2, "type": "random_number", "precision": 1}'::jsonb, 3
FROM public.device_types WHERE code = 'medical';

INSERT INTO public.device_type_data_configs (device_type_id, data_type, display_name, unit, value_type, sample_data_config, sort_order)
SELECT id, 'oxygen_saturation', 'Blood Oxygen', '%', 'number', '{"min": 95, "max": 100, "type": "random_number", "precision": 0}'::jsonb, 4
FROM public.device_types WHERE code = 'medical';

-- Seed device_type_data_configs for environmental
INSERT INTO public.device_type_data_configs (device_type_id, data_type, display_name, unit, value_type, sample_data_config, sort_order)
SELECT id, 'temperature', 'Temperature', '°C', 'number', '{"min": 18, "max": 28, "type": "random_number", "precision": 1}'::jsonb, 1
FROM public.device_types WHERE code = 'environmental';

INSERT INTO public.device_type_data_configs (device_type_id, data_type, display_name, unit, value_type, sample_data_config, sort_order)
SELECT id, 'humidity', 'Humidity', '%', 'number', '{"min": 40, "max": 70, "type": "random_number", "precision": 0}'::jsonb, 2
FROM public.device_types WHERE code = 'environmental';

-- Seed device_type_data_configs for fall_detector
INSERT INTO public.device_type_data_configs (device_type_id, data_type, display_name, unit, value_type, sample_data_config, sort_order)
SELECT id, 'fall_detected', 'Fall Detected', '', 'boolean', '{"type": "boolean", "probability": 0.05}'::jsonb, 1
FROM public.device_types WHERE code = 'fall_detector';

INSERT INTO public.device_type_data_configs (device_type_id, data_type, display_name, unit, value_type, sample_data_config, sort_order)
SELECT id, 'impact_force', 'Impact Force', 'G', 'number', '{"min": 0, "max": 3, "type": "random_number", "precision": 1}'::jsonb, 2
FROM public.device_types WHERE code = 'fall_detector';

-- Seed device_type_data_configs for gps_tracker
INSERT INTO public.device_type_data_configs (device_type_id, data_type, display_name, unit, value_type, sample_data_config, sort_order)
SELECT id, 'location', 'GPS Location', '', 'object', '{"type": "gps", "latitude": {"min": -90, "max": 90}, "longitude": {"min": -180, "max": 180}}'::jsonb, 1
FROM public.device_types WHERE code = 'gps_tracker';

INSERT INTO public.device_type_data_configs (device_type_id, data_type, display_name, unit, value_type, sample_data_config, sort_order)
SELECT id, 'speed', 'Speed', 'km/h', 'number', '{"min": 0, "max": 5, "type": "random_number", "precision": 1}'::jsonb, 2
FROM public.device_types WHERE code = 'gps_tracker';

-- Seed device_type_data_configs for camera
INSERT INTO public.device_type_data_configs (device_type_id, data_type, display_name, unit, value_type, sample_data_config, sort_order)
SELECT id, 'motion_detected', 'Motion Detected', '', 'boolean', '{"type": "boolean", "probability": 0.3}'::jsonb, 1
FROM public.device_types WHERE code = 'camera';

INSERT INTO public.device_type_data_configs (device_type_id, data_type, display_name, unit, value_type, sample_data_config, sort_order)
SELECT id, 'recording_status', 'Recording Status', '', 'string', '{"type": "enum", "values": ["recording", "standby", "offline"]}'::jsonb, 2
FROM public.device_types WHERE code = 'camera';

-- Seed device_type_data_configs for door_sensor
INSERT INTO public.device_type_data_configs (device_type_id, data_type, display_name, unit, value_type, sample_data_config, sort_order)
SELECT id, 'door_status', 'Door Status', '', 'string', '{"type": "enum", "values": ["open", "closed"]}'::jsonb, 1
FROM public.device_types WHERE code = 'door_sensor';

INSERT INTO public.device_type_data_configs (device_type_id, data_type, display_name, unit, value_type, sample_data_config, sort_order)
SELECT id, 'last_opened', 'Last Opened', '', 'timestamp', '{"type": "timestamp"}'::jsonb, 2
FROM public.device_types WHERE code = 'door_sensor';

-- Seed device_type_data_configs for motion_sensor
INSERT INTO public.device_type_data_configs (device_type_id, data_type, display_name, unit, value_type, sample_data_config, sort_order)
SELECT id, 'motion_detected', 'Motion Detected', '', 'boolean', '{"type": "boolean", "probability": 0.4}'::jsonb, 1
FROM public.device_types WHERE code = 'motion_sensor';

-- Seed device_type_data_configs for medication
INSERT INTO public.device_type_data_configs (device_type_id, data_type, display_name, unit, value_type, sample_data_config, sort_order)
SELECT id, 'medication_taken', 'Medication Taken', '', 'boolean', '{"type": "boolean", "probability": 0.9}'::jsonb, 1
FROM public.device_types WHERE code = 'medication';

INSERT INTO public.device_type_data_configs (device_type_id, data_type, display_name, unit, value_type, sample_data_config, sort_order)
SELECT id, 'next_dose_time', 'Next Dose Time', '', 'timestamp', '{"type": "timestamp"}'::jsonb, 2
FROM public.device_types WHERE code = 'medication';

-- Seed device_type_data_configs for smart_home
INSERT INTO public.device_type_data_configs (device_type_id, data_type, display_name, unit, value_type, sample_data_config, sort_order)
SELECT id, 'power_consumption', 'Power Consumption', 'W', 'number', '{"min": 50, "max": 500, "type": "random_number", "precision": 0}'::jsonb, 1
FROM public.device_types WHERE code = 'smart_home';

INSERT INTO public.device_type_data_configs (device_type_id, data_type, display_name, unit, value_type, sample_data_config, sort_order)
SELECT id, 'system_status', 'System Status', '', 'string', '{"type": "enum", "values": ["online", "offline", "maintenance"]}'::jsonb, 2
FROM public.device_types WHERE code = 'smart_home';

-- Seed device_type_data_configs for emergency_button
INSERT INTO public.device_type_data_configs (device_type_id, data_type, display_name, unit, value_type, sample_data_config, sort_order)
SELECT id, 'button_pressed', 'Button Pressed', '', 'boolean', '{"type": "boolean", "probability": 0.02}'::jsonb, 1
FROM public.device_types WHERE code = 'emergency_button';

-- Seed device_type_data_configs for sleep_monitor
INSERT INTO public.device_type_data_configs (device_type_id, data_type, display_name, unit, value_type, sample_data_config, sort_order)
SELECT id, 'sleep_quality', 'Sleep Quality', '%', 'number', '{"min": 60, "max": 95, "type": "random_number", "precision": 0}'::jsonb, 1
FROM public.device_types WHERE code = 'sleep_monitor';

INSERT INTO public.device_type_data_configs (device_type_id, data_type, display_name, unit, value_type, sample_data_config, sort_order)
SELECT id, 'sleep_stage', 'Sleep Stage', '', 'string', '{"type": "enum", "values": ["deep", "light", "rem", "awake"]}'::jsonb, 2
FROM public.device_types WHERE code = 'sleep_monitor';