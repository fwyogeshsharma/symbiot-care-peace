-- Migration: Add alert_recipients table and trigger to control alert notifications
-- This ensures only users with access to an elderly person receive their alerts

-- Create alert_recipients table
CREATE TABLE IF NOT EXISTS alert_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(alert_id, user_id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_alert_recipients_user_id ON alert_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_recipients_alert_id ON alert_recipients(alert_id);

-- Enable Row Level Security
ALTER TABLE alert_recipients ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own alert recipients
CREATE POLICY "Users can view their own alert recipients"
  ON alert_recipients
  FOR SELECT
  USING (auth.uid() = user_id);

-- Function to automatically populate alert_recipients when an alert is created
CREATE OR REPLACE FUNCTION populate_alert_recipients()
RETURNS TRIGGER AS $$
DECLARE
  v_elderly_person_id uuid;
  v_owner_user_id uuid;
BEGIN
  -- Get the elderly_person_id from the alert
  SELECT elderly_person_id INTO v_elderly_person_id
  FROM alerts
  WHERE id = NEW.id;

  -- If no elderly_person_id, skip (shouldn't happen based on schema)
  IF v_elderly_person_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the owner of the elderly person
  SELECT user_id INTO v_owner_user_id
  FROM elderly_persons
  WHERE id = v_elderly_person_id;

  -- Add the owner as a recipient
  IF v_owner_user_id IS NOT NULL THEN
    INSERT INTO alert_recipients (alert_id, user_id)
    VALUES (NEW.id, v_owner_user_id)
    ON CONFLICT (alert_id, user_id) DO NOTHING;
  END IF;

  -- Add all users who have been granted access via relative_assignments
  INSERT INTO alert_recipients (alert_id, user_id)
  SELECT NEW.id, ra.relative_user_id
  FROM relative_assignments ra
  WHERE ra.elderly_person_id = v_elderly_person_id
  ON CONFLICT (alert_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run after alert is inserted
DROP TRIGGER IF EXISTS trigger_populate_alert_recipients ON alerts;
CREATE TRIGGER trigger_populate_alert_recipients
  AFTER INSERT ON alerts
  FOR EACH ROW
  EXECUTE FUNCTION populate_alert_recipients();

-- Update RLS policy on alerts table to only show alerts user has access to
DROP POLICY IF EXISTS "Users can view alerts for their elderly persons" ON alerts;
CREATE POLICY "Users can view alerts for their elderly persons"
  ON alerts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM alert_recipients ar
      WHERE ar.alert_id = alerts.id
      AND ar.user_id = auth.uid()
    )
  );

-- Allow users to acknowledge/update alerts they have access to
DROP POLICY IF EXISTS "Users can update alerts for their elderly persons" ON alerts;
CREATE POLICY "Users can update alerts for their elderly persons"
  ON alerts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM alert_recipients ar
      WHERE ar.alert_id = alerts.id
      AND ar.user_id = auth.uid()
    )
  );

-- Enable Realtime for alert_recipients table
ALTER PUBLICATION supabase_realtime ADD TABLE alert_recipients;

-- Grant permissions
GRANT SELECT ON alert_recipients TO authenticated;
GRANT SELECT, UPDATE ON alerts TO authenticated;
