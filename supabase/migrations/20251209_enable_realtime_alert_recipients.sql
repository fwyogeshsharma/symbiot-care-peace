-- Migration: Enable Realtime for alert_recipients table
-- This allows real-time notifications when alert recipients are added

-- Enable Realtime for alert_recipients table
ALTER PUBLICATION supabase_realtime ADD TABLE alert_recipients;
