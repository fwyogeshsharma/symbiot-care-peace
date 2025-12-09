-- Test notification script
-- Run this in your Supabase SQL Editor to trigger a test notification

-- First, get an elderly person ID
-- SELECT id, full_name FROM elderly_persons LIMIT 1;

-- Then insert a test panic SOS alert (replace 'your-elderly-person-id' with actual ID)
INSERT INTO alerts (
  elderly_person_id,
  alert_type,
  severity,
  title,
  description,
  status,
  created_at
) VALUES (
  'your-elderly-person-id-here',  -- Replace with actual elderly person ID
  'panic_sos',
  'critical',
  'Emergency SOS Alert',
  'Patient has pressed the emergency button. Immediate attention required!',
  'active',
  NOW()
);

-- This will trigger an Android system notification on your device
-- The notification will appear in the notification tray with:
-- - Title: "🚨 PANIC SOS Alert!"
-- - Body: "[Patient Name] has pressed the emergency button. Immediate attention required!"
-- - Vibration based on severity
-- - Sound alert
