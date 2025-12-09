-- Fix: device_id should be unique per elderly_person, not globally unique
-- This allows different elderly persons to have devices with the same device_id (e.g., "SC-1")

-- Drop the global unique constraint on device_id
ALTER TABLE public.devices DROP CONSTRAINT IF EXISTS devices_device_id_key;

-- Add composite unique constraint: device_id must be unique within each elderly_person
ALTER TABLE public.devices ADD CONSTRAINT devices_elderly_person_device_id_unique
  UNIQUE (elderly_person_id, device_id);

-- Add index for faster lookups by device_id (since we removed the unique index)
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON public.devices(device_id);
