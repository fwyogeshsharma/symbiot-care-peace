-- Round temperature values in alert descriptions
-- This migration updates the vital signs alert trigger to round temperature values
-- to 1 decimal place to avoid displaying values like "79.39999999999999°F"

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
  v_temp_unit TEXT := '°F'; -- Default to Fahrenheit
  v_rounded_value NUMERIC;
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
      v_rounded_value := ROUND(v_value, 1);
      IF v_value < 50 OR v_value > 120 THEN
        v_severity := 'high';
        v_title := 'Critical Heart Rate Detected';
        v_description := format('Heart rate is %s bpm, which is outside the safe range (50-120 bpm).', v_rounded_value);
      ELSIF v_value < 60 OR v_value > 100 THEN
        v_severity := 'medium';
        v_title := 'Abnormal Heart Rate';
        v_description := format('Heart rate is %s bpm, which is outside the normal range (60-100 bpm).', v_rounded_value);
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
      v_systolic_rounded NUMERIC;
      v_diastolic_rounded NUMERIC;
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
        v_systolic_rounded := ROUND(v_systolic, 1);
        v_diastolic_rounded := ROUND(v_diastolic, 1);

        IF v_systolic > 180 OR v_diastolic > 110 THEN
          v_severity := 'critical';
          v_title := 'Critical Blood Pressure';
          v_description := format('Blood pressure is %s/%s mmHg, indicating a hypertensive crisis.', v_systolic_rounded, v_diastolic_rounded);
        ELSIF v_systolic > 140 OR v_diastolic > 90 THEN
          v_severity := 'high';
          v_title := 'High Blood Pressure';
          v_description := format('Blood pressure is %s/%s mmHg, which is above normal range.', v_systolic_rounded, v_diastolic_rounded);
        ELSIF v_systolic < 90 OR v_diastolic < 60 THEN
          v_severity := 'high';
          v_title := 'Low Blood Pressure';
          v_description := format('Blood pressure is %s/%s mmHg, which is below normal range.', v_systolic_rounded, v_diastolic_rounded);
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
      v_rounded_value := ROUND(v_value, 1);
      IF v_value < 90 THEN
        v_severity := 'critical';
        v_title := 'Critical Oxygen Level';
        v_description := format('Oxygen saturation is %s%%, indicating severe hypoxemia.', v_rounded_value);
      ELSIF v_value < 95 THEN
        v_severity := 'high';
        v_title := 'Low Oxygen Level';
        v_description := format('Oxygen saturation is %s%%, which is below normal range (95-100%%).', v_rounded_value);
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

  -- Temperature Alert (Updated to handle Fahrenheit and round values)
  IF NEW.data_type = 'temperature' THEN
    v_value := COALESCE(
      (NEW.value->>'value')::numeric,
      (NEW.value->>'celsius')::numeric,
      (NEW.value->>'fahrenheit')::numeric,
      NEW.value::numeric
    );

    IF v_value IS NOT NULL THEN
      -- Round to 1 decimal place
      v_rounded_value := ROUND(v_value, 1);

      -- Determine if temperature is in Fahrenheit (value > 50 likely means Fahrenheit)
      -- Body temp in Celsius is typically 35-42°C, in Fahrenheit is 95-107°F
      IF v_value > 50 THEN
        -- Temperature is in Fahrenheit
        v_temp_unit := '°F';
        IF v_value >= 102.2 THEN  -- 39°C = 102.2°F
          v_severity := 'high';
          v_title := 'High Fever';
          v_description := format('Temperature is %s°F, indicating a high fever.', v_rounded_value);
        ELSIF v_value >= 99.5 THEN  -- 37.5°C = 99.5°F
          v_severity := 'medium';
          v_title := 'Elevated Temperature';
          v_description := format('Temperature is %s°F, slightly elevated.', v_rounded_value);
        ELSIF v_value < 95.9 THEN  -- 35.5°C = 95.9°F
          v_severity := 'high';
          v_title := 'Low Body Temperature';
          v_description := format('Temperature is %s°F, which is below normal range.', v_rounded_value);
        ELSE
          RETURN NEW; -- Normal range
        END IF;
      ELSE
        -- Temperature is in Celsius
        v_temp_unit := '°C';
        IF v_value >= 39.0 THEN
          v_severity := 'high';
          v_title := 'High Fever';
          v_description := format('Temperature is %s°C, indicating a high fever.', v_rounded_value);
        ELSIF v_value >= 37.5 THEN
          v_severity := 'medium';
          v_title := 'Elevated Temperature';
          v_description := format('Temperature is %s°C, slightly elevated.', v_rounded_value);
        ELSIF v_value < 35.5 THEN
          v_severity := 'high';
          v_title := 'Low Body Temperature';
          v_description := format('Temperature is %s°C, which is below normal range.', v_rounded_value);
        ELSE
          RETURN NEW; -- Normal range
        END IF;
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

COMMENT ON FUNCTION create_vital_signs_alert() IS
'Updated trigger function that rounds temperature values to 1 decimal place and properly handles both Fahrenheit and Celsius temperatures in alert descriptions';
