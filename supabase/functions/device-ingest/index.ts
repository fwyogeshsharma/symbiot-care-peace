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
