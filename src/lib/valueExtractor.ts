/**
 * Extracts numeric value from various device data formats
 * Handles formats like: {value: 36.4}, {celsius: 36.4}, {bpm: 75}, {percentage: 47.9}, etc.
 */
export const extractNumericValue = (value: any, dataType?: string): number | null => {
  if (value === null || value === undefined) return null;

  // If it's already a number, return it
  if (typeof value === 'number') return value;

  // If it's not an object, try to parse it
  if (typeof value !== 'object') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }

  // Handle different object formats based on data type
  if (dataType) {
    switch (dataType) {
      case 'temperature':
        if ('celsius' in value) return value.celsius;
        if ('fahrenheit' in value) return value.fahrenheit;
        break;
      case 'heart_rate':
        if ('bpm' in value) return value.bpm;
        break;
      case 'blood_oxygen':
      case 'spo2':
      case 'oxygen_saturation':
      case 'oxygen_level':
      case 'humidity':
        if ('percentage' in value) return value.percentage;
        break;
      case 'pressure':
      case 'barometric_pressure':
        if ('hPa' in value) return value.hPa;
        if ('mmHg' in value) return value.mmHg;
        break;
      case 'steps':
        if ('count' in value) return value.count;
        break;
      case 'weight':
        if ('kg' in value) return value.kg;
        if ('lbs' in value) return value.lbs;
        break;
      case 'glucose':
      case 'blood_glucose':
      case 'blood_sugar':
        if ('mg_dl' in value) return value.mg_dl;
        break;
      case 'calories':
        if ('burned' in value) return value.burned;
        break;
      case 'distance':
        if ('kilometers' in value) return value.kilometers;
        if ('km' in value) return value.km;
        break;
      case 'sleep':
        if ('duration_hours' in value) return value.duration_hours;
        break;
      case 'sleep_quality':
        if ('quality' in value) return value.quality;
        break;
      case 'pm1_0':
      case 'pm1':
        if ('pm1_0' in value) return value.pm1_0;
        break;
      case 'pm2_5':
      case 'pm25':
        if ('pm2_5_atm' in value) return value.pm2_5_atm;
        if ('pm2_5_cf_1' in value) return value.pm2_5_cf_1;
        break;
      case 'pm10':
      case 'pm10_0':
        if ('pm10_0' in value) return value.pm10_0;
        break;
      case 'aqi':
      case 'air_quality_index':
        if ('value' in value) return value.value;
        break;
      case 'co2':
      case 'carbon_dioxide':
        if ('ppm' in value) return value.ppm;
        break;
      case 'voc':
        if ('ppb' in value) return value.ppb;
        break;
      case 'noise':
      case 'sound_level':
        if ('decibels' in value) return value.decibels;
        break;
      case 'light':
      case 'illuminance':
        if ('lux' in value) return value.lux;
        break;
      case 'respiratory_rate':
        if ('breaths_per_minute' in value) return value.breaths_per_minute;
        break;
      case 'hydration':
        if ('ml' in value) return value.ml;
        break;
      case 'fall_detected':
        if ('detected' in value) return value.detected ? 1 : 0;
        break;
      case 'bed_pad':
        // Bed pad can have both pressure and occupancy
        // Return pressure as the primary numeric value
        if ('pressure' in value) return value.pressure;
        break;
    }
  }

  // Generic extraction - try common keys
  const numericKeys = [
    'value', 'celsius', 'fahrenheit', 'bpm', 'percentage',
    'hPa', 'mmHg', 'count', 'kg', 'lbs', 'mg_dl',
    'burned', 'kilometers', 'km', 'duration_hours', 'quality',
    'pm1_0', 'pm2_5_atm', 'pm10_0', 'ppm', 'ppb',
    'decibels', 'lux', 'breaths_per_minute', 'ml'
  ];

  for (const key of numericKeys) {
    if (key in value && typeof value[key] === 'number') {
      return value[key];
    }
  }

  return null;
};

/**
 * Extracts string/enum value from device data
 */
export const extractStringValue = (value: any, dataType?: string): string | null => {
  if (value === null || value === undefined) return null;

  if (typeof value === 'string') return value;

  if (typeof value === 'object') {
    // Handle specific types
    if (dataType === 'activity' && 'type' in value) return value.type;
    if (dataType === 'sleep_stage' && 'stage' in value) return value.stage;
    if (dataType === 'aqi' && 'category' in value) return value.category;

    // Generic extraction
    if ('value' in value) return String(value.value);
    if ('type' in value) return value.type;
    if ('category' in value) return value.category;
    if ('stage' in value) return value.stage;
  }

  return String(value);
};

/**
 * Extracts boolean value from device data
 */
export const extractBooleanValue = (value: any, dataType?: string): boolean | null => {
  if (value === null || value === undefined) return null;

  if (typeof value === 'boolean') return value;

  if (typeof value === 'object') {
    if ('detected' in value) return Boolean(value.detected);
    if ('value' in value) return Boolean(value.value);
    if ('taken' in value) return Boolean(value.taken);
  }

  return Boolean(value);
};

/**
 * Extracts blood pressure values
 */
export const extractBloodPressure = (value: any): { systolic: number; diastolic: number } | null => {
  if (!value || typeof value !== 'object') return null;

  if ('systolic' in value && 'diastolic' in value) {
    return { systolic: value.systolic, diastolic: value.diastolic };
  }

  if ('value' in value && typeof value.value === 'object') {
    if ('systolic' in value.value && 'diastolic' in value.value) {
      return { systolic: value.value.systolic, diastolic: value.value.diastolic };
    }
  }

  return null;
};

/**
 * Extracts GPS/location values
 */
export const extractLocation = (value: any): { latitude: number; longitude: number } | null => {
  if (!value || typeof value !== 'object') return null;

  if ('latitude' in value && 'longitude' in value) {
    return { latitude: value.latitude, longitude: value.longitude };
  }

  if ('lat' in value && 'lng' in value) {
    return { latitude: value.lat, longitude: value.lng };
  }

  return null;
};

/**
 * Extracts bed pad values (duration, pressure and occupancy)
 */
export const extractBedPadData = (value: any): { duration: number | null; pressure: number | null; occupancy: boolean | null } | null => {
  if (!value || typeof value !== 'object') return null;

  const result: { duration: number | null; pressure: number | null; occupancy: boolean | null } = {
    duration: null,
    pressure: null,
    occupancy: null,
  };

  // Extract duration (in minutes)
  if ('duration' in value && typeof value.duration === 'number') {
    result.duration = value.duration;
  }

  // Extract pressure
  if ('pressure' in value && typeof value.pressure === 'number') {
    result.pressure = value.pressure;
  }

  // Extract occupancy
  if ('occupancy' in value && typeof value.occupancy === 'boolean') {
    result.occupancy = value.occupancy;
  }

  // Return null if all fields are missing
  if (result.duration === null && result.pressure === null && result.occupancy === null) {
    return null;
  }

  return result;
};
