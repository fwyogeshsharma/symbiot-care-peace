-- Create device_companies table
CREATE TABLE public.device_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  website TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add company_id column to devices table
ALTER TABLE public.devices
ADD COLUMN company_id UUID REFERENCES public.device_companies(id);

-- Enable RLS
ALTER TABLE public.device_companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for device_companies
CREATE POLICY "Anyone can view active device companies"
ON public.device_companies FOR SELECT
USING (true);

CREATE POLICY "Admins can manage device companies"
ON public.device_companies FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger for device_companies
CREATE TRIGGER update_device_companies_updated_at
BEFORE UPDATE ON public.device_companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed device_companies with common IoT device manufacturers
INSERT INTO public.device_companies (code, name, description) VALUES
('apple', 'Apple', 'Apple Watch and iPhone devices'),
('samsung', 'Samsung', 'Samsung Galaxy Watch and smartphones'),
('fitbit', 'Fitbit', 'Fitbit wearables and health trackers'),
('garmin', 'Garmin', 'Garmin GPS and fitness devices'),
('philips', 'Philips', 'Philips health monitoring devices'),
('omron', 'Omron', 'Omron blood pressure monitors and health devices'),
('withings', 'Withings', 'Withings smart scales and health devices'),
('xiaomi', 'Xiaomi', 'Xiaomi Mi Band and smart home devices'),
('polar', 'Polar', 'Polar heart rate monitors and fitness trackers'),
('oura', 'Oura', 'Oura Ring sleep and health tracker'),
('whoop', 'Whoop', 'Whoop fitness and recovery tracker'),
('dexcom', 'Dexcom', 'Dexcom continuous glucose monitors'),
('medtronic', 'Medtronic', 'Medtronic medical devices'),
('resmed', 'ResMed', 'ResMed sleep apnea devices'),
('honeywell', 'Honeywell', 'Honeywell home and environmental sensors'),
('nest', 'Google Nest', 'Google Nest smart home devices'),
('ring', 'Ring', 'Ring security cameras and doorbells'),
('arlo', 'Arlo', 'Arlo security cameras'),
('eufy', 'Eufy', 'Eufy security and smart home devices'),
('other', 'Other', 'Other device manufacturers');

-- Create index for faster lookups
CREATE INDEX idx_devices_company_id ON public.devices(company_id);
CREATE INDEX idx_device_companies_code ON public.device_companies(code);
CREATE INDEX idx_device_companies_is_active ON public.device_companies(is_active);
