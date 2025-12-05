-- Seed session_logs with sample data for the past 7 days
-- This creates realistic login session patterns

DO $$
DECLARE
  user_record RECORD;
  day_offset INTEGER;
  session_count INTEGER;
  session_hour INTEGER;
  login_time TIMESTAMP WITH TIME ZONE;
  session_duration INTEGER;
BEGIN
  -- Loop through each user in profiles
  FOR user_record IN SELECT id FROM profiles LIMIT 20 LOOP
    -- Generate sessions for each of the past 7 days
    FOR day_offset IN 0..6 LOOP
      -- Random number of sessions per day (1-5 sessions per user per day)
      session_count := 1 + floor(random() * 4)::INTEGER;

      FOR i IN 1..session_count LOOP
        -- Random hour between 6 AM and 10 PM
        session_hour := 6 + floor(random() * 16)::INTEGER;

        -- Calculate login time
        login_time := (CURRENT_DATE - day_offset * INTERVAL '1 day') + (session_hour * INTERVAL '1 hour') + (floor(random() * 60) * INTERVAL '1 minute');

        -- Random session duration between 5 and 120 minutes
        session_duration := 5 + floor(random() * 115)::INTEGER;

        -- Insert session log (completed sessions for past days, some ongoing for today)
        IF day_offset = 0 AND random() > 0.5 THEN
          -- Today: some sessions still ongoing (no logout)
          INSERT INTO session_logs (user_id, login_at, logout_at, session_duration_minutes)
          VALUES (user_record.id, login_time, NULL, NULL);
        ELSE
          -- Past days or completed today sessions
          INSERT INTO session_logs (user_id, login_at, logout_at, session_duration_minutes)
          VALUES (
            user_record.id,
            login_time,
            login_time + (session_duration * INTERVAL '1 minute'),
            session_duration
          );
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
