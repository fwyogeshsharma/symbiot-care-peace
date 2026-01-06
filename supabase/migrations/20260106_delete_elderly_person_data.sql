-- Create a function to delete all data for specific elderly persons
CREATE OR REPLACE FUNCTION delete_elderly_person_data(elderly_person_ids UUID[])
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_counts JSON;
  device_data_count INT;
  medication_logs_count INT;
  medication_schedules_count INT;
  geofence_events_count INT;
  geofence_places_count INT;
  ilq_alerts_count INT;
  ilq_trends_count INT;
  ilq_scores_count INT;
  alerts_count INT;
BEGIN
  -- Delete from device_data
  DELETE FROM device_data WHERE elderly_person_id = ANY(elderly_person_ids);
  GET DIAGNOSTICS device_data_count = ROW_COUNT;

  -- Delete from medication_adherence_logs
  DELETE FROM medication_adherence_logs WHERE elderly_person_id = ANY(elderly_person_ids);
  GET DIAGNOSTICS medication_logs_count = ROW_COUNT;

  -- Delete from medication_schedules
  DELETE FROM medication_schedules WHERE elderly_person_id = ANY(elderly_person_ids);
  GET DIAGNOSTICS medication_schedules_count = ROW_COUNT;

  -- Delete from geofence_events
  DELETE FROM geofence_events WHERE elderly_person_id = ANY(elderly_person_ids);
  GET DIAGNOSTICS geofence_events_count = ROW_COUNT;

  -- Delete from geofence_places
  DELETE FROM geofence_places WHERE elderly_person_id = ANY(elderly_person_ids);
  GET DIAGNOSTICS geofence_places_count = ROW_COUNT;

  -- Delete from ilq_alerts
  DELETE FROM ilq_alerts WHERE elderly_person_id = ANY(elderly_person_ids);
  GET DIAGNOSTICS ilq_alerts_count = ROW_COUNT;

  -- Delete from ilq_trends
  DELETE FROM ilq_trends WHERE elderly_person_id = ANY(elderly_person_ids);
  GET DIAGNOSTICS ilq_trends_count = ROW_COUNT;

  -- Delete from ilq_scores
  DELETE FROM ilq_scores WHERE elderly_person_id = ANY(elderly_person_ids);
  GET DIAGNOSTICS ilq_scores_count = ROW_COUNT;

  -- Delete from alerts
  DELETE FROM alerts WHERE elderly_person_id = ANY(elderly_person_ids);
  GET DIAGNOSTICS alerts_count = ROW_COUNT;

  -- Build JSON response with counts
  deleted_counts := json_build_object(
    'device_data', device_data_count,
    'medication_adherence_logs', medication_logs_count,
    'medication_schedules', medication_schedules_count,
    'geofence_events', geofence_events_count,
    'geofence_places', geofence_places_count,
    'ilq_alerts', ilq_alerts_count,
    'ilq_trends', ilq_trends_count,
    'ilq_scores', ilq_scores_count,
    'alerts', alerts_count
  );

  RETURN deleted_counts;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_elderly_person_data(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_elderly_person_data(UUID[]) TO service_role;
