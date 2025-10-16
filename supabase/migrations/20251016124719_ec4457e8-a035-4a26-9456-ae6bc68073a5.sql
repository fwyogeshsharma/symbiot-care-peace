-- Add api_key column to devices table
ALTER TABLE public.devices
ADD COLUMN api_key TEXT UNIQUE NOT NULL DEFAULT 'symbiot_' || substring(md5(random()::text || clock_timestamp()::text) from 1 for 25);