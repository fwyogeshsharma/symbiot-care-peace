-- Add furniture column to floor_plans table
ALTER TABLE floor_plans
ADD COLUMN IF NOT EXISTS furniture jsonb DEFAULT '[]'::jsonb;