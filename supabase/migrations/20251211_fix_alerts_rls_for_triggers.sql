-- Fix RLS policy on alerts table to allow trigger-based inserts
-- The issue: Database triggers that create alerts run in the context of the user
-- inserting device_data, who may not have admin/caregiver roles.
-- The solution: Allow inserts when the function is running as SECURITY DEFINER

-- First, let's update the trigger functions to ensure they're properly set as SECURITY DEFINER
-- and update the RLS policy to allow system-generated alerts

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Only system roles can create alerts" ON public.alerts;

-- Create a new policy that allows:
-- 1. Users with admin/caregiver roles to manually create alerts
-- 2. SECURITY DEFINER functions (triggers) to create alerts automatically
CREATE POLICY "Allow authorized alert creation"
ON public.alerts
FOR INSERT
WITH CHECK (
  -- Allow admins and caregivers to manually create alerts
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'caregiver'::app_role) OR
  -- Allow SECURITY DEFINER functions (triggers) to create alerts
  -- When called from a SECURITY DEFINER function, current_setting will show the definer's role
  current_setting('role', true) = 'postgres' OR
  -- Alternative: check if we're in a trigger context by checking session variables
  current_setting('is.security_definer', true) = 'on'
);

-- Update the trigger functions to set a session variable indicating SECURITY DEFINER context
-- This helps RLS policies identify legitimate system-generated inserts

-- Update emergency button alert function
CREATE OR REPLACE FUNCTION create_emergency_button_alert()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set session variable to indicate we're in a SECURITY DEFINER context
  PERFORM set_config('is.security_definer', 'on', true);

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

-- Update fall detection alert function
CREATE OR REPLACE FUNCTION create_fall_detection_alert()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set session variable to indicate we're in a SECURITY DEFINER context
  PERFORM set_config('is.security_definer', 'on', true);

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

-- Update vital signs alert function
CREATE OR REPLACE FUNCTION create_vital_signs_alert()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_value NUMERIC;
  v_title TEXT;
  v_description TEXT;
  v_severity TEXT := 'medium';
BEGIN
  -- Set session variable to indicate we're in a SECURITY DEFINER context
  PERFORM set_config('is.security_definer', 'on', true);

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

-- Update the older trigger function as well
CREATE OR REPLACE FUNCTION public.generate_alerts_from_device_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set session variable to indicate we're in a SECURITY DEFINER context
  PERFORM set_config('is.security_definer', 'on', true);

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

COMMENT ON POLICY "Allow authorized alert creation" ON alerts IS
'Allows admins/caregivers to manually create alerts and SECURITY DEFINER trigger functions to auto-generate alerts from device data';
