-- Create device_models table (specific device products/models under each device type)
CREATE TABLE public.device_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_type_id UUID NOT NULL REFERENCES public.device_types(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.device_companies(id),
  manufacturer TEXT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  model_number TEXT,
  image_url TEXT,
  specifications JSONB DEFAULT '{}'::jsonb,
  supported_data_types TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(device_type_id, code)
);

-- Enable RLS
ALTER TABLE public.device_models ENABLE ROW LEVEL SECURITY;

-- RLS Policies for device_models
CREATE POLICY "Anyone can view active device models"
ON public.device_models FOR SELECT
USING (true);

CREATE POLICY "Admins can manage device models"
ON public.device_models FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger for device_models
CREATE TRIGGER update_device_models_updated_at
BEFORE UPDATE ON public.device_models
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for faster lookups
CREATE INDEX idx_device_models_device_type_id ON public.device_models(device_type_id);
CREATE INDEX idx_device_models_company_id ON public.device_models(company_id);
CREATE INDEX idx_device_models_is_active ON public.device_models(is_active);

-- Seed some sample device models
INSERT INTO public.device_models (device_type_id, company_id, code, name, description, model_number, specifications, supported_data_types)
SELECT
  dt.id,
  dc.id,
  'apple-watch-series-9',
  'Apple Watch Series 9',
  'Advanced health and fitness smartwatch with ECG and blood oxygen monitoring',
  'MRX92LL/A',
  '{"display": "Always-On Retina", "water_resistance": "50m", "battery_life": "18 hours", "sensors": ["Heart Rate", "ECG", "Blood Oxygen", "Temperature"]}'::jsonb,
  ARRAY['heart_rate', 'steps', 'activity', 'oxygen_saturation', 'sleep_quality']
FROM public.device_types dt
CROSS JOIN public.device_companies dc
WHERE dt.code = 'wearable' AND dc.code = 'apple';

INSERT INTO public.device_models (device_type_id, company_id, code, name, description, model_number, specifications, supported_data_types)
SELECT
  dt.id,
  dc.id,
  'fitbit-charge-6',
  'Fitbit Charge 6',
  'Advanced fitness and health tracker with stress management and ECG',
  'FB423BKBK',
  '{"display": "AMOLED touchscreen", "water_resistance": "50m", "battery_life": "7 days", "sensors": ["Heart Rate", "SpO2", "Skin Temperature"]}'::jsonb,
  ARRAY['heart_rate', 'steps', 'activity', 'sleep_quality', 'oxygen_saturation']
FROM public.device_types dt
CROSS JOIN public.device_companies dc
WHERE dt.code = 'wearable' AND dc.code = 'fitbit';

INSERT INTO public.device_models (device_type_id, company_id, code, name, description, model_number, specifications, supported_data_types)
SELECT
  dt.id,
  dc.id,
  'omron-bp7250',
  'Omron Complete',
  'Blood pressure monitor with EKG capability',
  'BP7250',
  '{"type": "Upper arm", "memory": "200 readings", "connectivity": "Bluetooth", "features": ["AFib detection", "Two users"]}'::jsonb,
  ARRAY['blood_pressure', 'heart_rate']
FROM public.device_types dt
CROSS JOIN public.device_companies dc
WHERE dt.code = 'medical' AND dc.code = 'omron';

INSERT INTO public.device_models (device_type_id, company_id, code, name, description, model_number, specifications, supported_data_types)
SELECT
  dt.id,
  dc.id,
  'philips-temp-sensor',
  'Philips Smart Temperature Sensor',
  'Room temperature and humidity monitoring sensor',
  'PHI-TS200',
  '{"range": "-10°C to 50°C", "accuracy": "±0.5°C", "battery": "2 years", "connectivity": "Zigbee"}'::jsonb,
  ARRAY['temperature', 'humidity']
FROM public.device_types dt
CROSS JOIN public.device_companies dc
WHERE dt.code = 'environmental' AND dc.code = 'philips';

INSERT INTO public.device_models (device_type_id, company_id, code, name, description, model_number, specifications, supported_data_types)
SELECT
  dt.id,
  dc.id,
  'ring-indoor-cam',
  'Ring Indoor Cam (2nd Gen)',
  'Indoor security camera with 1080p HD video and motion detection',
  'B0B6GLQ1FL',
  '{"resolution": "1080p HD", "field_of_view": "140°", "night_vision": true, "two_way_audio": true}'::jsonb,
  ARRAY['motion_detected', 'recording_status']
FROM public.device_types dt
CROSS JOIN public.device_companies dc
WHERE dt.code = 'camera' AND dc.code = 'ring';

INSERT INTO public.device_models (device_type_id, company_id, code, name, description, model_number, specifications, supported_data_types)
SELECT
  dt.id,
  dc.id,
  'oura-ring-gen3',
  'Oura Ring Generation 3',
  'Smart ring for sleep, activity and readiness tracking',
  'OURA3-SIL',
  '{"sensors": ["Temperature", "Heart Rate", "HRV", "Blood Oxygen"], "battery_life": "7 days", "water_resistance": "100m"}'::jsonb,
  ARRAY['sleep_quality', 'sleep_stage', 'heart_rate', 'activity']
FROM public.device_types dt
CROSS JOIN public.device_companies dc
WHERE dt.code = 'sleep_monitor' AND dc.code = 'oura';
