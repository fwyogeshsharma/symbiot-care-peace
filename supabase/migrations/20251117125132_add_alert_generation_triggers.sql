-- Alert Generation Triggers
-- This migration creates database functions and triggers to automatically generate alerts
-- based on device data and system events

-- Function to create alert for emergency button press
CREATE OR REPLACE FUNCTION create_emergency_button_alert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for emergency button presses
  IF NEW.data_type = 'button_pressed' THEN
    -- Check if the button was actually pressed (value is true)
    IF (NEW.value->>'value')::boolean = true OR NEW.value::boolean = true THEN
      INSERT INTO public.alerts (
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
        'Emergency Button Pressed',
        'Emergency SOS button has been activated. Immediate attention required.',
        'active'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create alert for fall detection
CREATE OR REPLACE FUNCTION create_fall_detection_alert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for fall detection
  IF NEW.data_type = 'fall_detected' THEN
    -- Check if fall was detected
    IF (NEW.value->>'value')::boolean = true OR NEW.value::boolean = true THEN
      INSERT INTO public.alerts (
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
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create alert for vital signs out of range
CREATE OR REPLACE FUNCTION create_vital_signs_alert()
RETURNS TRIGGER AS $$
DECLARE
  v_value NUMERIC;
  v_title TEXT;
  v_description TEXT;
  v_severity TEXT := 'medium';
BEGIN
  -- Heart Rate Alert
  IF NEW.data_type = 'heart_rate' THEN
    v_value := COALESCE(
      (NEW.value->>'value')::numeric,
      (NEW.value->>'bpm')::numeric,
      NEW.value::numeric
    );

    IF v_value IS NOT NULL THEN
      IF v_value < 50 OR v_value > 120 THEN
        v_severity := 'high';
        v_title := 'Critical Heart Rate Detected';
        v_description := format('Heart rate is %s bpm, which is outside the safe range (50-120 bpm).', v_value);
      ELSIF v_value < 60 OR v_value > 100 THEN
        v_severity := 'medium';
        v_title := 'Abnormal Heart Rate';
        v_description := format('Heart rate is %s bpm, which is outside the normal range (60-100 bpm).', v_value);
      ELSE
        RETURN NEW; -- Normal range, no alert
      END IF;

      INSERT INTO public.alerts (
        elderly_person_id,
        alert_type,
        severity,
        title,
        description,
        status
      ) VALUES (
        NEW.elderly_person_id,
        'vital_signs',
        v_severity,
        v_title,
        v_description,
        'active'
      );
    END IF;
  END IF;

  -- Blood Pressure Alert
  IF NEW.data_type = 'blood_pressure' THEN
    DECLARE
      v_systolic NUMERIC;
      v_diastolic NUMERIC;
    BEGIN
      v_systolic := COALESCE(
        (NEW.value->>'systolic')::numeric,
        (NEW.value->'value'->>'systolic')::numeric
      );
      v_diastolic := COALESCE(
        (NEW.value->>'diastolic')::numeric,
        (NEW.value->'value'->>'diastolic')::numeric
      );

      IF v_systolic IS NOT NULL AND v_diastolic IS NOT NULL THEN
        IF v_systolic > 180 OR v_diastolic > 110 THEN
          v_severity := 'critical';
          v_title := 'Critical Blood Pressure';
          v_description := format('Blood pressure is %s/%s mmHg, indicating a hypertensive crisis.', v_systolic, v_diastolic);
        ELSIF v_systolic > 140 OR v_diastolic > 90 THEN
          v_severity := 'high';
          v_title := 'High Blood Pressure';
          v_description := format('Blood pressure is %s/%s mmHg, which is above normal range.', v_systolic, v_diastolic);
        ELSIF v_systolic < 90 OR v_diastolic < 60 THEN
          v_severity := 'high';
          v_title := 'Low Blood Pressure';
          v_description := format('Blood pressure is %s/%s mmHg, which is below normal range.', v_systolic, v_diastolic);
        ELSE
          RETURN NEW; -- Normal range
        END IF;

        INSERT INTO public.alerts (
          elderly_person_id,
          alert_type,
          severity,
          title,
          description,
          status
        ) VALUES (
          NEW.elderly_person_id,
          'vital_signs',
          v_severity,
          v_title,
          v_description,
          'active'
        );
      END IF;
    END;
  END IF;

  -- Oxygen Saturation Alert
  IF NEW.data_type = 'oxygen_saturation' THEN
    v_value := COALESCE(
      (NEW.value->>'value')::numeric,
      (NEW.value->>'percentage')::numeric,
      NEW.value::numeric
    );

    IF v_value IS NOT NULL THEN
      IF v_value < 90 THEN
        v_severity := 'critical';
        v_title := 'Critical Oxygen Level';
        v_description := format('Oxygen saturation is %s%%, indicating severe hypoxemia.', v_value);
      ELSIF v_value < 95 THEN
        v_severity := 'high';
        v_title := 'Low Oxygen Level';
        v_description := format('Oxygen saturation is %s%%, which is below normal range (95-100%%).', v_value);
      ELSE
        RETURN NEW; -- Normal range
      END IF;

      INSERT INTO public.alerts (
        elderly_person_id,
        alert_type,
        severity,
        title,
        description,
        status
      ) VALUES (
        NEW.elderly_person_id,
        'vital_signs',
        v_severity,
        v_title,
        v_description,
        'active'
      );
    END IF;
  END IF;

  -- Temperature Alert
  IF NEW.data_type = 'temperature' THEN
    v_value := COALESCE(
      (NEW.value->>'value')::numeric,
      (NEW.value->>'celsius')::numeric,
      NEW.value::numeric
    );

    IF v_value IS NOT NULL THEN
      IF v_value >= 39.0 THEN
        v_severity := 'high';
        v_title := 'High Fever';
        v_description := format('Temperature is %s°C, indicating a high fever.', v_value);
      ELSIF v_value >= 37.5 THEN
        v_severity := 'medium';
        v_title := 'Elevated Temperature';
        v_description := format('Temperature is %s°C, slightly elevated.', v_value);
      ELSIF v_value < 35.5 THEN
        v_severity := 'high';
        v_title := 'Low Body Temperature';
        v_description := format('Temperature is %s°C, which is below normal range.', v_value);
      ELSE
        RETURN NEW; -- Normal range
      END IF;

      INSERT INTO public.alerts (
        elderly_person_id,
        alert_type,
        severity,
        title,
        description,
        status
      ) VALUES (
        NEW.elderly_person_id,
        'vital_signs',
        v_severity,
        v_title,
        v_description,
        'active'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_emergency_button_alert ON public.device_data;
DROP TRIGGER IF EXISTS trigger_fall_detection_alert ON public.device_data;
DROP TRIGGER IF EXISTS trigger_vital_signs_alert ON public.device_data;

-- Create triggers
CREATE TRIGGER trigger_emergency_button_alert
  AFTER INSERT ON public.device_data
  FOR EACH ROW
  WHEN (NEW.data_type = 'button_pressed')
  EXECUTE FUNCTION create_emergency_button_alert();

CREATE TRIGGER trigger_fall_detection_alert
  AFTER INSERT ON public.device_data
  FOR EACH ROW
  WHEN (NEW.data_type = 'fall_detected')
  EXECUTE FUNCTION create_fall_detection_alert();

CREATE TRIGGER trigger_vital_signs_alert
  AFTER INSERT ON public.device_data
  FOR EACH ROW
  WHEN (NEW.data_type IN ('heart_rate', 'blood_pressure', 'oxygen_saturation', 'temperature'))
  EXECUTE FUNCTION create_vital_signs_alert();

-- Function to check for device offline and create alerts (to be called periodically)
CREATE OR REPLACE FUNCTION check_device_offline_alerts()
RETURNS void AS $$
DECLARE
  v_device RECORD;
  v_last_data_time TIMESTAMP WITH TIME ZONE;
  v_hours_offline NUMERIC;
BEGIN
  FOR v_device IN
    SELECT d.id, d.device_name, d.elderly_person_id, d.last_sync
    FROM public.devices d
    WHERE d.status = 'active'
  LOOP
    -- Get the most recent data from this device
    SELECT MAX(recorded_at) INTO v_last_data_time
    FROM public.device_data
    WHERE device_id = v_device.id;

    -- Use last_sync or last data time, whichever is more recent
    v_last_data_time := GREATEST(v_device.last_sync, v_last_data_time);

    IF v_last_data_time IS NOT NULL THEN
      v_hours_offline := EXTRACT(EPOCH FROM (NOW() - v_last_data_time)) / 3600;

      -- Only create alert if device has been offline for more than 6 hours
      -- and we haven't already created an alert in the last 12 hours
      IF v_hours_offline > 6 THEN
        -- Check if we already have a recent device_offline alert for this device
        IF NOT EXISTS (
          SELECT 1 FROM public.alerts
          WHERE elderly_person_id = v_device.elderly_person_id
            AND alert_type = 'device_offline'
            AND status = 'active'
            AND description LIKE '%' || v_device.device_name || '%'
            AND created_at > NOW() - INTERVAL '12 hours'
        ) THEN
          INSERT INTO public.alerts (
            elderly_person_id,
            alert_type,
            severity,
            title,
            description,
            status
          ) VALUES (
            v_device.elderly_person_id,
            'device_offline',
            CASE
              WHEN v_hours_offline > 24 THEN 'high'
              ELSE 'medium'
            END,
            'Device Offline',
            format('Device "%s" has been offline for %s hours.', v_device.device_name, ROUND(v_hours_offline, 1)),
            'active'
          );
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a comment explaining how to set up periodic checking
COMMENT ON FUNCTION check_device_offline_alerts() IS
'This function should be called periodically (e.g., via pg_cron or external scheduler) to check for offline devices and create alerts. Example: SELECT check_device_offline_alerts();';
