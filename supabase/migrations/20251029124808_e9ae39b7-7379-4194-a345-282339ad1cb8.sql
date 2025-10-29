-- Add data_frequency_per_day column to device_types table
ALTER TABLE device_types 
ADD COLUMN data_frequency_per_day integer NOT NULL DEFAULT 48;

-- Add check constraint to ensure positive values
ALTER TABLE device_types
ADD CONSTRAINT device_types_frequency_check 
CHECK (data_frequency_per_day > 0);

-- Add comment for documentation
COMMENT ON COLUMN device_types.data_frequency_per_day IS 
'Average number of times the device sends data per 24 hours';