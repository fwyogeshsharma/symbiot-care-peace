import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeviceDataPayload {
  device_id: string;
  data_type: string;
  value: any;
  unit?: string;
  recorded_at?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Device ingest request received');

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract API key (Bearer token)
    const apiKey = authHeader.replace('Bearer ', '');
    console.log('API key received, length:', apiKey.length);

    // Parse request body
    const payload: DeviceDataPayload = await req.json();
    console.log('Payload received:', JSON.stringify(payload));

    // Validate required fields
    if (!payload.device_id || !payload.data_type || payload.value === undefined) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: device_id, data_type, value' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role for device operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify device exists and get elderly_person_id
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('id, elderly_person_id, status, api_key')
      .eq('device_id', payload.device_id)
      .single();

    if (deviceError || !device) {
      console.error('Device not found:', deviceError);
      return new Response(
        JSON.stringify({ error: 'Device not found or not registered' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (device.status !== 'active') {
      console.error('Device not active:', device.status);
      return new Response(
        JSON.stringify({ error: 'Device is not active' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate API key matches the device's stored key
    if (device.api_key !== apiKey) {
      console.error('Invalid API key for device:', payload.device_id);
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Device verified:', device.id);

    // Insert device data
    const { data: deviceData, error: insertError } = await supabase
      .from('device_data')
      .insert({
        device_id: device.id,
        elderly_person_id: device.elderly_person_id,
        data_type: payload.data_type,
        value: payload.value,
        unit: payload.unit || null,
        recorded_at: payload.recorded_at || new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting device data:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store device data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update device last_sync
    await supabase
      .from('devices')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', device.id);

    console.log('Device data stored successfully:', deviceData.id);

    // Check for alert conditions
    await checkAlertConditions(supabase, device.elderly_person_id, payload.data_type, payload.value);
    
    // Check for geofence events if GPS data
    if ((payload.data_type === 'gps' || payload.data_type === 'location') && payload.value.latitude && payload.value.longitude) {
      await checkGeofenceEvents(
        supabase,
        device.elderly_person_id,
        device.id,
        payload.value.latitude,
        payload.value.longitude,
        payload.recorded_at || new Date().toISOString()
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data_id: deviceData.id,
        message: 'Data received and stored successfully' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Function to check alert conditions based on device data
async function checkAlertConditions(
  supabase: any, 
  elderlyPersonId: string, 
  dataType: string, 
  value: any
) {
  console.log('Checking alert conditions for:', dataType, value);

  let shouldAlert = false;
  let alertTitle = '';
  let alertDescription = '';
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';

  // Heart rate alerts
  if (dataType === 'heart_rate' && value.bpm) {
    const bpm = value.bpm;
    if (bpm > 100) {
      shouldAlert = true;
      severity = bpm > 120 ? 'high' : 'medium';
      alertTitle = 'Elevated Heart Rate';
      alertDescription = `Heart rate is ${bpm} bpm, which is above normal range`;
    } else if (bpm < 60) {
      shouldAlert = true;
      severity = bpm < 50 ? 'high' : 'medium';
      alertTitle = 'Low Heart Rate';
      alertDescription = `Heart rate is ${bpm} bpm, which is below normal range`;
    }
  }

  // Blood pressure alerts
  if (dataType === 'blood_pressure' && value.systolic && value.diastolic) {
    const { systolic, diastolic } = value;
    if (systolic > 140 || diastolic > 90) {
      shouldAlert = true;
      severity = systolic > 160 || diastolic > 100 ? 'high' : 'medium';
      alertTitle = 'High Blood Pressure';
      alertDescription = `Blood pressure is ${systolic}/${diastolic} mmHg`;
    }
  }

  // Fall detection alerts
  if (dataType === 'fall_detected' && value.detected === true) {
    shouldAlert = true;
    severity = 'critical';
    alertTitle = 'Fall Detected';
    alertDescription = 'A fall has been detected. Immediate attention may be required.';
  }

  // Temperature alerts
  if (dataType === 'temperature' && value.celsius) {
    const temp = value.celsius;
    if (temp > 38 || temp < 35) {
      shouldAlert = true;
      severity = temp > 39 || temp < 34 ? 'high' : 'medium';
      alertTitle = temp > 38 ? 'High Temperature' : 'Low Temperature';
      alertDescription = `Body temperature is ${temp}°C`;
    }
  }

  // Create alert if conditions are met
  if (shouldAlert) {
    console.log('Creating alert:', alertTitle);
    const { error } = await supabase
      .from('alerts')
      .insert({
        elderly_person_id: elderlyPersonId,
        alert_type: dataType,
        severity: severity,
        title: alertTitle,
        description: alertDescription,
        status: 'active',
      });

    if (error) {
      console.error('Error creating alert:', error);
    } else {
      console.log('Alert created successfully');
    }
  }
}

// Haversine formula to calculate distance between two GPS coordinates
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Check if position is inside a geofence
function isInsideGeofence(
  latitude: number,
  longitude: number,
  placeLatitude: number,
  placeLongitude: number,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(latitude, longitude, placeLatitude, placeLongitude);
  return distance <= radiusMeters;
}

// Function to check geofence entry/exit events
async function checkGeofenceEvents(
  supabase: any,
  elderlyPersonId: string,
  deviceId: string,
  latitude: number,
  longitude: number,
  timestamp: string
) {
  console.log('Checking geofence events for:', elderlyPersonId, latitude, longitude);

  // Fetch all active geofences for this person
  const { data: geofences, error: geofencesError } = await supabase
    .from('geofence_places')
    .select('*')
    .eq('elderly_person_id', elderlyPersonId)
    .eq('is_active', true);

  if (geofencesError) {
    console.error('Error fetching geofences:', geofencesError);
    return;
  }

  if (!geofences || geofences.length === 0) {
    console.log('No active geofences found');
    return;
  }

  // Check which geofences the person is currently inside
  const currentGeofences: string[] = [];
  geofences.forEach((place: any) => {
    if (isInsideGeofence(latitude, longitude, place.latitude, place.longitude, place.radius_meters)) {
      currentGeofences.push(place.id);
    }
  });

  // Fetch the last known state
  const { data: lastState, error: stateError } = await supabase
    .from('geofence_state')
    .select('*')
    .eq('elderly_person_id', elderlyPersonId);

  if (stateError) {
    console.error('Error fetching geofence state:', stateError);
    return;
  }

  const lastGeofences = (lastState || []).map((s: any) => s.place_id);

  // Detect entry events (now inside, wasn't before)
  const entries = currentGeofences.filter(placeId => !lastGeofences.includes(placeId));

  // Detect exit events (was inside, now outside)
  const exits = lastGeofences.filter((placeId: string) => !currentGeofences.includes(placeId));

  console.log('Entries:', entries, 'Exits:', exits);

  // Log entry events
  for (const placeId of entries) {
    const place = geofences.find((g: any) => g.id === placeId);
    console.log('Entry to:', place?.name);
    
    const { error: entryError } = await supabase
      .from('geofence_events')
      .insert({
        elderly_person_id: elderlyPersonId,
        place_id: placeId,
        device_id: deviceId,
        event_type: 'entry',
        latitude,
        longitude,
        timestamp,
      });

    if (entryError) {
      console.error('Error logging entry event:', entryError);
    }

    // Add to state table
    const { error: stateInsertError } = await supabase
      .from('geofence_state')
      .insert({
        elderly_person_id: elderlyPersonId,
        place_id: placeId,
        entry_timestamp: timestamp,
      });

    if (stateInsertError) {
      console.error('Error updating state:', stateInsertError);
    }
  }

  // Log exit events and calculate duration
  for (const placeId of exits) {
    const place = geofences.find((g: any) => g.id === placeId);
    const stateEntry = lastState?.find((s: any) => s.place_id === placeId);
    
    let durationMinutes = null;
    if (stateEntry) {
      const entryTime = new Date(stateEntry.entry_timestamp).getTime();
      const exitTime = new Date(timestamp).getTime();
      durationMinutes = Math.round((exitTime - entryTime) / 1000 / 60);
    }

    console.log('Exit from:', place?.name, 'Duration:', durationMinutes, 'minutes');

    const { error: exitError } = await supabase
      .from('geofence_events')
      .insert({
        elderly_person_id: elderlyPersonId,
        place_id: placeId,
        device_id: deviceId,
        event_type: 'exit',
        latitude,
        longitude,
        timestamp,
        duration_minutes: durationMinutes,
      });

    if (exitError) {
      console.error('Error logging exit event:', exitError);
    }

    // Remove from state table
    const { error: stateDeleteError } = await supabase
      .from('geofence_state')
      .delete()
      .eq('elderly_person_id', elderlyPersonId)
      .eq('place_id', placeId);

    if (stateDeleteError) {
      console.error('Error removing from state:', stateDeleteError);
    }
  }
}
