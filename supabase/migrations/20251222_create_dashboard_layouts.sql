-- Create dashboard_layouts table for storing custom dashboard configurations
CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  layout_config JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id)
);

-- Add RLS policies
ALTER TABLE dashboard_layouts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own dashboard layout
CREATE POLICY "Users can view own dashboard layout"
  ON dashboard_layouts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own dashboard layout
CREATE POLICY "Users can insert own dashboard layout"
  ON dashboard_layouts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own dashboard layout
CREATE POLICY "Users can update own dashboard layout"
  ON dashboard_layouts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own dashboard layout
CREATE POLICY "Users can delete own dashboard layout"
  ON dashboard_layouts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_user_id ON dashboard_layouts(user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dashboard_layouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
CREATE TRIGGER update_dashboard_layouts_timestamp
  BEFORE UPDATE ON dashboard_layouts
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboard_layouts_updated_at();
