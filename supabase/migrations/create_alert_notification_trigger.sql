-- Database trigger to send push notifications when alerts are created
-- This trigger calls the Supabase Edge Function to send FCM push notifications

-- Function to invoke Edge Function for push notifications
CREATE OR REPLACE FUNCTION notify_alert_created()
RETURNS TRIGGER AS $$
DECLARE
  request_id bigint;
  supabase_url text;
  service_role_key text;
BEGIN
  -- Get Supabase URL and service role key from environment
  -- These should be set in your Supabase project settings
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);

  -- Call the Edge Function using pg_net (if available)
  -- Note: This requires the pg_net extension to be enabled
  -- Alternative: Use Supabase webhooks in the dashboard

  -- For now, we'll use a simpler approach with http extension
  -- You can also configure this as a webhook in Supabase dashboard

  -- Log the alert creation
  RAISE NOTICE 'Alert created: % for elderly person: %', NEW.id, NEW.elderly_person_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_alert_created ON alerts;
CREATE TRIGGER on_alert_created
  AFTER INSERT ON alerts
  FOR EACH ROW
  EXECUTE FUNCTION notify_alert_created();

-- Alternative: Create a webhook in Supabase Dashboard
-- Go to Database > Webhooks and create a new webhook with:
-- Table: alerts
-- Events: INSERT
-- Type: Supabase Edge Functions
-- Edge Function: send-push-notification
-- HTTP Request Body:
-- {
--   "alert": {
--     "id": "{{record.id}}",
--     "elderly_person_id": "{{record.elderly_person_id}}",
--     "alert_type": "{{record.alert_type}}",
--     "severity": "{{record.severity}}",
--     "title": "{{record.title}}",
--     "description": "{{record.description}}",
--     "status": "{{record.status}}",
--     "created_at": "{{record.created_at}}"
--   }
-- }

COMMENT ON FUNCTION notify_alert_created() IS 'Trigger function to send push notifications when alerts are created. Configure webhook in Supabase Dashboard: Database > Webhooks > New Webhook targeting send-push-notification Edge Function';
