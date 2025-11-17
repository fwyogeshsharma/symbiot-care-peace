-- Create function to automatically generate alerts from device data
CREATE OR REPLACE FUNCTION public.generate_alerts_from_device_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Panic/SOS Button Alert
  IF NEW.data_type = 'button_pressed' AND NEW.value::boolean = true THEN
    INSERT INTO alerts (
      elderly_person_id,
      alert_type,
      severity,
      title,
      description,
      status
    ) VALUES (
      NEW.elderly_person_id,
      'panic_sos',
      'critical',
      'Emergency Button Activated',
      'Emergency button has been pressed. Immediate attention required.',
      'active'
    );
  END IF;

  -- Fall Detection Alert
  IF NEW.data_type = 'fall_detected' AND NEW.value::boolean = true THEN
    INSERT INTO alerts (
      elderly_person_id,
      alert_type,
      severity,
      title,
      description,
      status
    ) VALUES (
      NEW.elderly_person_id,
      'fall_detected',
      'critical',
      'Fall Detected',
      'A fall has been detected. Please check on the person immediately.',
      'active'
    );
  END IF;

  -- High Heart Rate Alert
  IF NEW.data_type = 'heart_rate' AND (NEW.value::numeric > 100 OR NEW.value::numeric < 50) THEN
    INSERT INTO alerts (
      elderly_person_id,
      alert_type,
      severity,
      title,
      description,
      status
    ) VALUES (
      NEW.elderly_person_id,
      'vital_signs',
      CASE WHEN NEW.value::numeric > 120 OR NEW.value::numeric < 40 THEN 'critical' ELSE 'high' END,
      CASE WHEN NEW.value::numeric > 100 THEN 'Elevated Heart Rate' ELSE 'Low Heart Rate' END,
      'Heart rate of ' || NEW.value::text || ' bpm detected, which is outside normal range.',
      'active'
    );
  END IF;

  -- Blood Pressure Alert
  IF NEW.data_type = 'blood_pressure' THEN
    DECLARE
      systolic numeric;
      diastolic numeric;
    BEGIN
      systolic := (NEW.value->>'systolic')::numeric;
      diastolic := (NEW.value->>'diastolic')::numeric;
      
      IF systolic > 140 OR systolic < 90 OR diastolic > 90 OR diastolic < 60 THEN
        INSERT INTO alerts (
          elderly_person_id,
          alert_type,
          severity,
          title,
          description,
          status
        ) VALUES (
          NEW.elderly_person_id,
          'vital_signs',
          CASE WHEN systolic > 160 OR diastolic > 100 THEN 'critical' ELSE 'medium' END,
          CASE WHEN systolic > 140 THEN 'High Blood Pressure' ELSE 'Low Blood Pressure' END,
          'Blood pressure reading of ' || systolic || '/' || diastolic || ' mmHg detected.',
          'active'
        );
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to automatically generate alerts
DROP TRIGGER IF EXISTS trigger_generate_alerts_from_device_data ON device_data;
CREATE TRIGGER trigger_generate_alerts_from_device_data
  AFTER INSERT ON device_data
  FOR EACH ROW
  EXECUTE FUNCTION generate_alerts_from_device_data();

-- Create index for better alert query performance
CREATE INDEX IF NOT EXISTS idx_alerts_elderly_person_status ON alerts(elderly_person_id, status, created_at DESC);

COMMENT ON FUNCTION generate_alerts_from_device_data() IS 'Automatically generates alerts based on device data thresholds and critical events';