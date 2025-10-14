-- Expand allowed data types for device_data and alerts tables, then add fake data

-- Update device_data constraints
ALTER TABLE public.device_data DROP CONSTRAINT IF EXISTS device_data_data_type_check;
ALTER TABLE public.device_data ADD CONSTRAINT device_data_data_type_check
  CHECK (data_type IN (
    'heart_rate', 'blood_pressure', 'oxygen_level', 'temperature', 'steps', 'sleep', 
    'location', 'fall_detection', 'activity', 'blood_sugar', 'glucose',
    'door_sensor', 'bed_sensor', 'seat_sensor', 'room_sensor', 'presence_sensor',
    'scale_weight', 'ambient_environment', 'electronics_monitor', 'motion_sensor'
  ));

-- Update alerts constraints
ALTER TABLE public.alerts DROP CONSTRAINT IF EXISTS alerts_alert_type_check;
ALTER TABLE public.alerts ADD CONSTRAINT alerts_alert_type_check
  CHECK (alert_type IN (
    'fall', 'vital_abnormal', 'medication_missed', 'inactivity', 'environmental', 
    'device_offline', 'vital_sign', 'medication', 'emergency', 'sensor_alert'
  ));

-- Add fake data for yogesh.sharma@faberwork.com
DO $$
DECLARE
  v_elderly_person_id UUID;
  v_device_id UUID;
BEGIN
  -- Get the elderly person ID for yogesh.sharma@faberwork.com
  SELECT ep.id INTO v_elderly_person_id
  FROM elderly_persons ep
  JOIN profiles p ON ep.user_id = p.id
  WHERE p.email = 'yogesh.sharma@faberwork.com'
  LIMIT 1;

  -- Only proceed if we found the elderly person
  IF v_elderly_person_id IS NOT NULL THEN
    -- Create a sample device if it doesn't exist
    INSERT INTO devices (device_name, device_type, device_id, elderly_person_id, location, status, battery_level, last_sync)
    VALUES ('Health Monitor', 'medical', 'DEV-YOGESH-001', v_elderly_person_id, 'Bedroom', 'active', 85, NOW())
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_device_id;

    -- If device already exists, get its ID
    IF v_device_id IS NULL THEN
      SELECT id INTO v_device_id
      FROM devices
      WHERE elderly_person_id = v_elderly_person_id
      LIMIT 1;
    END IF;

    -- Insert recent vital signs data (heart rate)
    INSERT INTO device_data (device_id, elderly_person_id, data_type, value, unit, recorded_at)
    VALUES
      (v_device_id, v_elderly_person_id, 'heart_rate', '{"bpm": 95}', 'bpm', NOW() - INTERVAL '5 minutes'),
      (v_device_id, v_elderly_person_id, 'heart_rate', '{"bpm": 92}', 'bpm', NOW() - INTERVAL '2 hours'),
      (v_device_id, v_elderly_person_id, 'heart_rate', '{"bpm": 88}', 'bpm', NOW() - INTERVAL '4 hours');

    -- Insert blood pressure data
    INSERT INTO device_data (device_id, elderly_person_id, data_type, value, unit, recorded_at)
    VALUES
      (v_device_id, v_elderly_person_id, 'blood_pressure', '{"systolic": 150, "diastolic": 95}', 'mmHg', NOW() - INTERVAL '1 hour'),
      (v_device_id, v_elderly_person_id, 'blood_pressure', '{"systolic": 148, "diastolic": 92}', 'mmHg', NOW() - INTERVAL '3 hours');

    -- Insert blood sugar data
    INSERT INTO device_data (device_id, elderly_person_id, data_type, value, unit, recorded_at)
    VALUES
      (v_device_id, v_elderly_person_id, 'blood_sugar', '{"level": 110}', 'mg/dL', NOW() - INTERVAL '30 minutes'),
      (v_device_id, v_elderly_person_id, 'blood_sugar', '{"level": 105}', 'mg/dL', NOW() - INTERVAL '5 hours');

    -- Insert temperature data
    INSERT INTO device_data (device_id, elderly_person_id, data_type, value, unit, recorded_at)
    VALUES
      (v_device_id, v_elderly_person_id, 'temperature', '{"temp": 37.2}', '°C', NOW() - INTERVAL '15 minutes');

    -- Insert active alerts
    INSERT INTO alerts (elderly_person_id, alert_type, severity, title, description, status)
    VALUES
      (v_elderly_person_id, 'vital_sign', 'high', 'Elevated Heart Rate', 'Heart rate reading of 95 bpm detected, which is above normal range for this person.', 'active'),
      (v_elderly_person_id, 'vital_sign', 'medium', 'High Blood Pressure', 'Blood pressure reading of 150/95 mmHg detected. Please monitor closely.', 'active'),
      (v_elderly_person_id, 'medication', 'low', 'Medication Reminder', 'Evening medication is due in 30 minutes.', 'active');

  END IF;
END $$;