-- Migration: Fix alert recipients for existing alerts and handle access grants/revokes
-- This ensures existing alerts show up for users with access, and dynamically updates when access is granted/revoked

-- Function to backfill alert_recipients for existing alerts
CREATE OR REPLACE FUNCTION backfill_alert_recipients()
RETURNS void AS $$
BEGIN
  -- Populate alert_recipients for all existing alerts
  INSERT INTO alert_recipients (alert_id, user_id)
  SELECT DISTINCT a.id, ep.user_id
  FROM alerts a
  JOIN elderly_persons ep ON a.elderly_person_id = ep.id
  WHERE NOT EXISTS (
    SELECT 1 FROM alert_recipients ar
    WHERE ar.alert_id = a.id AND ar.user_id = ep.user_id
  )
  ON CONFLICT (alert_id, user_id) DO NOTHING;

  -- Add recipients from relative_assignments
  INSERT INTO alert_recipients (alert_id, user_id)
  SELECT DISTINCT a.id, ra.relative_user_id
  FROM alerts a
  JOIN relative_assignments ra ON a.elderly_person_id = ra.elderly_person_id
  WHERE NOT EXISTS (
    SELECT 1 FROM alert_recipients ar
    WHERE ar.alert_id = a.id AND ar.user_id = ra.relative_user_id
  )
  ON CONFLICT (alert_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the backfill immediately
SELECT backfill_alert_recipients();

-- Function to add user to all existing alerts when access is granted
CREATE OR REPLACE FUNCTION add_user_to_existing_alerts()
RETURNS TRIGGER AS $$
BEGIN
  -- When a relative_assignment is created, add the user to all existing active alerts
  -- for that elderly person
  INSERT INTO alert_recipients (alert_id, user_id)
  SELECT a.id, NEW.relative_user_id
  FROM alerts a
  WHERE a.elderly_person_id = NEW.elderly_person_id
    AND a.status IN ('active', 'acknowledged')
  ON CONFLICT (alert_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove user from alerts when access is revoked
CREATE OR REPLACE FUNCTION remove_user_from_alerts()
RETURNS TRIGGER AS $$
BEGIN
  -- When a relative_assignment is deleted, remove the user from alert recipients
  -- for that elderly person's alerts
  DELETE FROM alert_recipients
  WHERE user_id = OLD.relative_user_id
    AND alert_id IN (
      SELECT id FROM alerts WHERE elderly_person_id = OLD.elderly_person_id
    );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for when access is granted (relative_assignment INSERT)
DROP TRIGGER IF EXISTS trigger_add_user_to_existing_alerts ON relative_assignments;
CREATE TRIGGER trigger_add_user_to_existing_alerts
  AFTER INSERT ON relative_assignments
  FOR EACH ROW
  EXECUTE FUNCTION add_user_to_existing_alerts();

-- Create trigger for when access is revoked (relative_assignment DELETE)
DROP TRIGGER IF EXISTS trigger_remove_user_from_alerts ON relative_assignments;
CREATE TRIGGER trigger_remove_user_from_alerts
  AFTER DELETE ON relative_assignments
  FOR EACH ROW
  EXECUTE FUNCTION remove_user_from_alerts();

-- Grant permissions
GRANT EXECUTE ON FUNCTION backfill_alert_recipients() TO authenticated;
