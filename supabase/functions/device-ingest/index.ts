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

interface GenerateSampleDataPayload {
  action: 'generate_sample_data';
  device_id: string;
  hours_back?: number;
  interval_hours?: number;
}

// ============================================
// Sample Data Generation Functions (Server-Side)
// ============================================

interface ModelSpecifications {
  [key: string]: {
    min?: number;
    max?: number;
    precision?: number;
    unit?: string;
    values?: string[];
    probability?: number;
    systolic?: { min: number; max: number };
    diastolic?: { min: number; max: number };
    latitude?: { min: number; max: number };
    longitude?: { min: number; max: number };
  };
}

// Generate value based on model specification for a specific data type
function generateValueFromModelSpec(spec: any, dataType: string): any {
  if (!spec) spec = {};

  switch (dataType) {
    case 'heart_rate':
      const hrMin = spec.min || 60;
      const hrMax = spec.max || 100;
      return { bpm: Math.floor(hrMin + Math.random() * (hrMax - hrMin)) };

    case 'blood_pressure':
      const sysMin = spec.systolic?.min || spec.min || 110;
      const sysMax = spec.systolic?.max || spec.max || 130;
      const diaMin = spec.diastolic?.min || 70;
      const diaMax = spec.diastolic?.max || 85;
      return {
        systolic: Math.floor(sysMin + Math.random() * (sysMax - sysMin)),
        diastolic: Math.floor(diaMin + Math.random() * (diaMax - diaMin)),
      };

    case 'blood_oxygen':
    case 'spo2':
      const o2Min = spec.min || 95;
      const o2Max = spec.max || 100;
      const precision = spec.precision || 0;
      const o2Value = o2Min + Math.random() * (o2Max - o2Min);
      return { percentage: precision === 0 ? Math.floor(o2Value) : Number(o2Value.toFixed(precision)) };

    case 'temperature':
      const tempMin = spec.min || 36.0;
      const tempMax = spec.max || 37.5;
      const tempPrecision = spec.precision || 1;
      const temp = tempMin + Math.random() * (tempMax - tempMin);
      return { celsius: Number(temp.toFixed(tempPrecision)) };

    case 'steps':
      const stepsMin = spec.min || 0;
      const stepsMax = spec.max || 15000;
      return { count: Math.floor(stepsMin + Math.random() * (stepsMax - stepsMin)) };

    case 'sleep':
      const sleepMin = spec.min || 5;
      const sleepMax = spec.max || 9;
      const hours = sleepMin + Math.random() * (sleepMax - sleepMin);
      const qualities = ['poor', 'fair', 'good', 'excellent'];
      return {
        duration_hours: Number(hours.toFixed(1)),
        quality: qualities[Math.floor(Math.random() * qualities.length)],
      };

    case 'activity':
      const activities = spec.values || ['walking', 'sitting', 'standing', 'running', 'sleeping'];
      return { type: activities[Math.floor(Math.random() * activities.length)] };

    case 'calories':
      const calMin = spec.min || 1500;
      const calMax = spec.max || 2500;
      return { burned: Math.floor(calMin + Math.random() * (calMax - calMin)) };

    case 'distance':
      const distMin = spec.min || 0;
      const distMax = spec.max || 10;
      return { kilometers: Number((distMin + Math.random() * (distMax - distMin)).toFixed(2)) };

    case 'weight':
      const weightMin = spec.min || 50;
      const weightMax = spec.max || 100;
      return { kg: Number((weightMin + Math.random() * (weightMax - weightMin)).toFixed(1)) };

    case 'glucose':
    case 'blood_glucose':
      const glucoseMin = spec.min || 70;
      const glucoseMax = spec.max || 140;
      return { mg_dl: Math.floor(glucoseMin + Math.random() * (glucoseMax - glucoseMin)) };

    case 'location':
    case 'gps':
      const latMin = spec.latitude?.min || 37.7749;
      const latMax = spec.latitude?.max || 37.7849;
      const lonMin = spec.longitude?.min || -122.4294;
      const lonMax = spec.longitude?.max || -122.4094;
      return {
        latitude: latMin + Math.random() * (latMax - latMin),
        longitude: lonMin + Math.random() * (lonMax - lonMin),
      };

    case 'fall_detected':
      const fallProb = spec.probability || 0.01;
      return { detected: Math.random() < fallProb };

    case 'respiratory_rate':
      const respMin = spec.min || 12;
      const respMax = spec.max || 20;
      return { breaths_per_minute: Math.floor(respMin + Math.random() * (respMax - respMin)) };

    case 'hydration':
      const hydMin = spec.min || 1500;
      const hydMax = spec.max || 3000;
      return { ml: Math.floor(hydMin + Math.random() * (hydMax - hydMin)) };

    // Environmental / Air Quality Sensors (PurpleAir, etc.)
    case 'air_quality':
    case 'environment':
    case 'purpleair':
      return {
        pm1_0: Number((spec.pm1_0?.min || 0 + Math.random() * (spec.pm1_0?.max || 50 - (spec.pm1_0?.min || 0))).toFixed(1)),
        pm2_5_atm: Number((spec.pm2_5?.min || 0 + Math.random() * (spec.pm2_5?.max || 100 - (spec.pm2_5?.min || 0))).toFixed(1)),
        pm2_5_cf_1: Number((spec.pm2_5?.min || 0 + Math.random() * (spec.pm2_5?.max || 100 - (spec.pm2_5?.min || 0))).toFixed(1)),
        pm10_0: Number((spec.pm10?.min || 0 + Math.random() * (spec.pm10?.max || 150 - (spec.pm10?.min || 0))).toFixed(1)),
        temperature: Number((spec.temperature?.min || 15 + Math.random() * (spec.temperature?.max || 35 - (spec.temperature?.min || 15))).toFixed(1)),
        humidity: Number((spec.humidity?.min || 30 + Math.random() * (spec.humidity?.max || 70 - (spec.humidity?.min || 30))).toFixed(1)),
        pressure: Number((spec.pressure?.min || 980 + Math.random() * (spec.pressure?.max || 1040 - (spec.pressure?.min || 980))).toFixed(1)),
        sensor_index: spec.sensor_index || Math.floor(10000 + Math.random() * 90000),
        uptime: Math.floor(Math.random() * 604800), // up to 7 days in seconds
        last_seen: Math.floor(Date.now() / 1000),
      };

    case 'pm2_5':
    case 'pm25':
      const pm25Min = spec.min || 0;
      const pm25Max = spec.max || 100;
      return {
        pm2_5_atm: Number((pm25Min + Math.random() * (pm25Max - pm25Min)).toFixed(1)),
        pm2_5_cf_1: Number((pm25Min + Math.random() * (pm25Max - pm25Min)).toFixed(1)),
      };

    case 'pm1_0':
    case 'pm1':
      const pm1Min = spec.min || 0;
      const pm1Max = spec.max || 50;
      return { pm1_0: Number((pm1Min + Math.random() * (pm1Max - pm1Min)).toFixed(1)) };

    case 'pm10':
    case 'pm10_0':
      const pm10Min = spec.min || 0;
      const pm10Max = spec.max || 150;
      return { pm10_0: Number((pm10Min + Math.random() * (pm10Max - pm10Min)).toFixed(1)) };

    case 'humidity':
      const humMin = spec.min || 30;
      const humMax = spec.max || 70;
      return { percentage: Number((humMin + Math.random() * (humMax - humMin)).toFixed(1)) };

    case 'pressure':
    case 'barometric_pressure':
      const pressMin = spec.min || 980;
      const pressMax = spec.max || 1040;
      return { hPa: Number((pressMin + Math.random() * (pressMax - pressMin)).toFixed(1)) };

    case 'aqi':
    case 'air_quality_index':
      const aqiMin = spec.min || 0;
      const aqiMax = spec.max || 200;
      const aqi = Math.floor(aqiMin + Math.random() * (aqiMax - aqiMin));
      let category = 'Good';
      if (aqi > 150) category = 'Unhealthy';
      else if (aqi > 100) category = 'Unhealthy for Sensitive Groups';
      else if (aqi > 50) category = 'Moderate';
      return { value: aqi, category };

    case 'co2':
    case 'carbon_dioxide':
      const co2Min = spec.min || 400;
      const co2Max = spec.max || 1000;
      return { ppm: Math.floor(co2Min + Math.random() * (co2Max - co2Min)) };

    case 'voc':
    case 'volatile_organic_compounds':
      const vocMin = spec.min || 0;
      const vocMax = spec.max || 500;
      return { ppb: Math.floor(vocMin + Math.random() * (vocMax - vocMin)) };

    case 'noise':
    case 'sound_level':
      const noiseMin = spec.min || 30;
      const noiseMax = spec.max || 80;
      return { decibels: Number((noiseMin + Math.random() * (noiseMax - noiseMin)).toFixed(1)) };

    case 'light':
    case 'illuminance':
      const luxMin = spec.min || 0;
      const luxMax = spec.max || 1000;
      return { lux: Math.floor(luxMin + Math.random() * (luxMax - luxMin)) };

    default:
      // Generic number generation
      if (spec.min !== undefined && spec.max !== undefined) {
        const val = spec.min + Math.random() * (spec.max - spec.min);
        return { value: spec.precision ? Number(val.toFixed(spec.precision)) : Math.floor(val) };
      }
      return null;
  }
}

// Get default unit for a data type
function getDefaultUnit(dataType: string): string {
  const units: Record<string, string> = {
    heart_rate: 'bpm',
    blood_pressure: 'mmHg',
    blood_oxygen: '%',
    spo2: '%',
    temperature: '°C',
    steps: 'steps',
    sleep: 'hours',
    calories: 'kcal',
    distance: 'km',
    weight: 'kg',
    glucose: 'mg/dL',
    blood_glucose: 'mg/dL',
    respiratory_rate: 'breaths/min',
    hydration: 'ml',
  };
  return units[dataType] || '';
}

// Generate sample data using model specifications
async function generateSampleDataFromModel(
  supabase: any,
  device: any,
  modelSpecs: ModelSpecifications,
  supportedDataTypes: string[],
  hoursBack: number = 168,
  intervalHours: number = 2
): Promise<any[]> {
  const now = new Date();
  const sampleData: any[] = [];

  // Use supported data types from the model, or keys from specs
  const dataTypes = supportedDataTypes.length > 0
    ? supportedDataTypes
    : Object.keys(modelSpecs);

  // Fetch geofences for GPS data
  const { data: geofences } = await supabase
    .from('geofence_places')
    .select('*')
    .eq('elderly_person_id', device.elderly_person_id)
    .eq('is_active', true);

  for (let i = hoursBack; i >= 0; i -= intervalHours) {
    const recordedAt = new Date(now.getTime() - i * 60 * 60 * 1000);
    const timeIndex = Math.floor((hoursBack - i) / intervalHours);

    for (const dataType of dataTypes) {
      const spec = modelSpecs[dataType] || {};

      let value: any;

      // Special handling for GPS with geofences
      if ((dataType === 'location' || dataType === 'gps') && geofences && geofences.length > 0) {
        const geofenceIndex = timeIndex % geofences.length;
        const currentGeofence = geofences[geofenceIndex];
        const radiusInDegrees = (currentGeofence.radius_meters || 100) / 111000;
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * radiusInDegrees;

        value = {
          latitude: Number(currentGeofence.latitude) + distance * Math.cos(angle),
          longitude: Number(currentGeofence.longitude) + distance * Math.sin(angle),
        };
      } else {
        value = generateValueFromModelSpec(spec, dataType);
      }

      if (value !== null) {
        sampleData.push({
          device_id: device.id,
          elderly_person_id: device.elderly_person_id,
          data_type: dataType,
          value: value,
          unit: spec.unit || getDefaultUnit(dataType),
          recorded_at: recordedAt.toISOString(),
        });
      }
    }
  }

  return sampleData;
}

// Generate sample data using device type configs (fallback)
async function generateSampleDataFromDeviceType(
  supabase: any,
  device: any,
  hoursBack: number = 168,
  intervalHours: number = 2
): Promise<any[]> {
  const now = new Date();
  const sampleData: any[] = [];

  // Fetch device type data configs
  const { data: dataConfigs } = await supabase
    .from('device_type_data_configs')
    .select(`*, device_types!inner(code)`)
    .eq('device_types.code', device.device_type);

  if (!dataConfigs || dataConfigs.length === 0) {
    // Default data types if no configs found
    const defaultSpecs: ModelSpecifications = {
      heart_rate: { min: 60, max: 100 },
      blood_pressure: { systolic: { min: 110, max: 130 }, diastolic: { min: 70, max: 85 } },
      temperature: { min: 36.0, max: 37.5, precision: 1 },
      steps: { min: 0, max: 10000 },
    };
    return generateSampleDataFromModel(supabase, device, defaultSpecs, Object.keys(defaultSpecs), hoursBack, intervalHours);
  }

  // Fetch geofences
  const { data: geofences } = await supabase
    .from('geofence_places')
    .select('*')
    .eq('elderly_person_id', device.elderly_person_id)
    .eq('is_active', true);

  for (let i = hoursBack; i >= 0; i -= intervalHours) {
    const recordedAt = new Date(now.getTime() - i * 60 * 60 * 1000);
    const timeIndex = Math.floor((hoursBack - i) / intervalHours);

    for (const config of dataConfigs) {
      if (!config.sample_data_config) continue;

      let value: any;
      const sampleConfig = config.sample_data_config;

      // Handle GPS with geofences
      if (sampleConfig.type === 'gps' && geofences && geofences.length > 0) {
        const geofenceIndex = timeIndex % geofences.length;
        const currentGeofence = geofences[geofenceIndex];
        const radiusInDegrees = (currentGeofence.radius_meters || 100) / 111000;
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * radiusInDegrees;

        value = {
          latitude: Number(currentGeofence.latitude) + distance * Math.cos(angle),
          longitude: Number(currentGeofence.longitude) + distance * Math.sin(angle),
        };
      } else {
        value = generateValueFromConfig(sampleConfig);
      }

      if (value !== null) {
        sampleData.push({
          device_id: device.id,
          elderly_person_id: device.elderly_person_id,
          data_type: config.data_type,
          value: typeof value === 'object' ? value : { value },
          unit: config.unit || '',
          recorded_at: recordedAt.toISOString(),
        });
      }
    }
  }

  return sampleData;
}

// Generate value from device type config
function generateValueFromConfig(config: any): any {
  if (!config) return null;

  const type = config.type;

  switch (type) {
    case 'random_number':
      const { min = 0, max = 100, precision = 0 } = config;
      const value = min + Math.random() * (max - min);
      return precision === 0 ? Math.floor(value) : Number(value.toFixed(precision));

    case 'boolean':
      const probability = config.probability || 0.5;
      return Math.random() < probability;

    case 'enum':
      const values = config.values || [];
      return values[Math.floor(Math.random() * values.length)];

    case 'blood_pressure':
      return {
        systolic: Math.floor(config.systolic.min + Math.random() * (config.systolic.max - config.systolic.min)),
        diastolic: Math.floor(config.diastolic.min + Math.random() * (config.diastolic.max - config.diastolic.min)),
      };

    case 'gps':
      return {
        latitude: config.latitude.min + Math.random() * (config.latitude.max - config.latitude.min),
        longitude: config.longitude.min + Math.random() * (config.longitude.max - config.longitude.min),
      };

    default:
      return null;
  }
}

// ============================================
// Main Request Handler
// ============================================

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

    // Parse request body
    const payload = await req.json();
    console.log('Payload received:', JSON.stringify(payload));

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this is a sample data generation request
    if (payload.action === 'generate_sample_data') {
      return await handleGenerateSampleData(supabase, apiKey, payload);
    }

    // Otherwise, handle normal device data ingestion
    return await handleDeviceDataIngestion(supabase, apiKey, payload);

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================
// Handle Sample Data Generation
// ============================================

async function handleGenerateSampleData(
  supabase: any,
  apiKey: string,
  payload: GenerateSampleDataPayload
) {
  console.log('Generating sample data for device:', payload.device_id);

  if (!payload.device_id) {
    return new Response(
      JSON.stringify({ error: 'device_id is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Verify device exists
  const { data: device, error: deviceError } = await supabase
    .from('devices')
    .select('id, elderly_person_id, device_type, model_id, status, api_key')
    .eq('device_id', payload.device_id)
    .single();

  if (deviceError || !device) {
    console.error('Device not found:', deviceError);
    return new Response(
      JSON.stringify({ error: 'Device not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validate API key
  if (device.api_key !== apiKey) {
    console.error('Invalid API key');
    return new Response(
      JSON.stringify({ error: 'Invalid API key' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const hoursBack = payload.hours_back || 168; // 7 days default
  const intervalHours = payload.interval_hours || 2;

  let sampleData: any[] = [];

  // Check if device has a model with specifications
  if (device.model_id) {
    const { data: deviceModel } = await supabase
      .from('device_models')
      .select('specifications, supported_data_types')
      .eq('id', device.model_id)
      .single();

    if (deviceModel?.specifications && Object.keys(deviceModel.specifications).length > 0) {
      console.log('Generating data from model specifications');
      sampleData = await generateSampleDataFromModel(
        supabase,
        device,
        deviceModel.specifications as ModelSpecifications,
        deviceModel.supported_data_types || [],
        hoursBack,
        intervalHours
      );
    }
  }

  // Fallback to device type configs if no model data generated
  if (sampleData.length === 0) {
    console.log('Generating data from device type configs');
    sampleData = await generateSampleDataFromDeviceType(
      supabase,
      device,
      hoursBack,
      intervalHours
    );
  }

  // Insert sample data
  if (sampleData.length > 0) {
    const { error: insertError } = await supabase
      .from('device_data')
      .insert(sampleData);

    if (insertError) {
      console.error('Error inserting sample data:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to insert sample data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update device last_sync
    await supabase
      .from('devices')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', device.id);

    console.log(`Generated ${sampleData.length} sample data points`);
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: `Generated ${sampleData.length} sample data points`,
      data_points: sampleData.length,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================
// Handle Normal Device Data Ingestion
// ============================================

async function handleDeviceDataIngestion(
  supabase: any,
  apiKey: string,
  payload: DeviceDataPayload
) {
  // Validate required fields
  if (!payload.device_id || !payload.data_type || payload.value === undefined) {
    console.error('Missing required fields');
    return new Response(
      JSON.stringify({ error: 'Missing required fields: device_id, data_type, value' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

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
      message: 'Data received and stored successfully',
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================
// Alert Checking
// ============================================

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

  // Blood oxygen alerts
  if ((dataType === 'blood_oxygen' || dataType === 'spo2') && value.percentage) {
    const o2 = value.percentage;
    if (o2 < 95) {
      shouldAlert = true;
      severity = o2 < 90 ? 'high' : 'medium';
      alertTitle = 'Low Blood Oxygen';
      alertDescription = `Blood oxygen level is ${o2}%, which is below normal range`;
    }
  }

  // Glucose alerts
  if ((dataType === 'glucose' || dataType === 'blood_glucose') && value.mg_dl) {
    const glucose = value.mg_dl;
    if (glucose < 70) {
      shouldAlert = true;
      severity = glucose < 54 ? 'high' : 'medium';
      alertTitle = 'Low Blood Glucose';
      alertDescription = `Blood glucose is ${glucose} mg/dL (hypoglycemia)`;
    } else if (glucose > 180) {
      shouldAlert = true;
      severity = glucose > 250 ? 'high' : 'medium';
      alertTitle = 'High Blood Glucose';
      alertDescription = `Blood glucose is ${glucose} mg/dL (hyperglycemia)`;
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
