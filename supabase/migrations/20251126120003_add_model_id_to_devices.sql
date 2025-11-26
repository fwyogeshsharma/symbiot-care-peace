-- Add model_id column to devices table to link devices to specific device models
ALTER TABLE public.devices
ADD COLUMN model_id UUID REFERENCES public.device_models(id);

-- Create index for faster lookups
CREATE INDEX idx_devices_model_id ON public.devices(model_id);

-- Add comment explaining the column
COMMENT ON COLUMN public.devices.model_id IS 'References the specific device model/product';
