import { DeviceTypeDataConfig } from '@/hooks/useDeviceTypeDataConfigs';

// Interface for model specifications
export interface ModelSpecifications {
  [key: string]: {
    min?: number;
    max?: number;
    precision?: number;
    unit?: string;
    accuracy?: string;
    values?: string[];
    probability?: number;
    type?: string;
  };
}

// Generate value based on model specification for a specific data type
export const generateValueFromModelSpec = (spec: any, dataType: string): any => {
  if (!spec) return null;

  // Handle different data types based on model specifications
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
      return {
        duration_hours: Number(hours.toFixed(1)),
        quality: ['poor', 'fair', 'good', 'excellent'][Math.floor(Math.random() * 4)],
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
      return {
        latitude: spec.latitude?.min || 37.7749 + (Math.random() - 0.5) * 0.01,
        longitude: spec.longitude?.min || -122.4194 + (Math.random() - 0.5) * 0.01,
      };

    case 'fall_detected':
      const fallProb = spec.probability || 0.01;
      return { detected: Math.random() < fallProb };

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
        uptime: Math.floor(Math.random() * 604800),
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
      const aqiVal = Math.floor(aqiMin + Math.random() * (aqiMax - aqiMin));
      let aqiCategory = 'Good';
      if (aqiVal > 150) aqiCategory = 'Unhealthy';
      else if (aqiVal > 100) aqiCategory = 'Unhealthy for Sensitive Groups';
      else if (aqiVal > 50) aqiCategory = 'Moderate';
      return { value: aqiVal, category: aqiCategory };

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
};

// Generate sample data points using model specifications
export const generateSampleDataFromModelSpecs = (
  modelSpecs: ModelSpecifications,
  supportedDataTypes: string[],
  device: any,
  hoursBack: number = 168,
  intervalHours: number = 2,
  geofences: any[] = []
): any[] => {
  const now = new Date();
  const sampleData: any[] = [];

  // Use supported data types from the model, or default set
  const dataTypes = supportedDataTypes.length > 0
    ? supportedDataTypes
    : Object.keys(modelSpecs);

  for (let i = hoursBack; i >= 0; i -= intervalHours) {
    const recordedAt = new Date(now.getTime() - i * 60 * 60 * 1000);
    const timeIndex = Math.floor((hoursBack - i) / intervalHours);

    for (const dataType of dataTypes) {
      const spec = modelSpecs[dataType] || {};

      // Special handling for GPS with geofences
      let value: any;
      if ((dataType === 'location' || dataType === 'gps') && geofences.length > 0) {
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
};

// Get default unit for a data type
const getDefaultUnit = (dataType: string): string => {
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
  };
  return units[dataType] || '';
};

export const generateValueFromConfig = (config: any): any => {
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
        systolic: config.systolic.min + Math.random() * (config.systolic.max - config.systolic.min),
        diastolic: config.diastolic.min + Math.random() * (config.diastolic.max - config.diastolic.min),
      };

    case 'gps':
      return {
        latitude: config.latitude.min + Math.random() * (config.latitude.max - config.latitude.min),
        longitude: config.longitude.min + Math.random() * (config.longitude.max - config.longitude.min),
      };

    case 'position':
      // Position data is handled separately with floor plan logic
      return null;

    case 'timestamp':
      return new Date().toISOString();

    default:
      return null;
  }
};

export const generateSampleDataPoints = (
  dataConfigs: DeviceTypeDataConfig[],
  device: any,
  hoursBack: number = 168, // 7 days
  intervalHours: number = 2,
  geofences: any[] = []
) => {
  const now = new Date();
  const sampleData: any[] = [];

  for (let i = hoursBack; i >= 0; i -= intervalHours) {
    const recordedAt = new Date(now.getTime() - i * 60 * 60 * 1000);
    const timeIndex = Math.floor((hoursBack - i) / intervalHours);

    for (const config of dataConfigs) {
      // Skip position data as it's handled separately
      if (config.sample_data_config?.type === 'position') continue;

      let value: any;
      
      // Special handling for GPS data with geofences
      if (config.sample_data_config?.type === 'gps' && geofences.length > 0) {
        // Cycle through geofences and add variation within radius
        const geofenceIndex = timeIndex % geofences.length;
        const currentGeofence = geofences[geofenceIndex];
        
        // Add random offset within geofence radius (convert meters to degrees, roughly)
        const radiusInDegrees = (currentGeofence.radius_meters || 100) / 111000;
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * radiusInDegrees;
        
        value = {
          latitude: Number(currentGeofence.latitude) + distance * Math.cos(angle),
          longitude: Number(currentGeofence.longitude) + distance * Math.sin(angle),
        };
      } else {
        value = generateValueFromConfig(config.sample_data_config);
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
};
