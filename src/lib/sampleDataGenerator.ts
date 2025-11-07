import { DeviceTypeDataConfig } from '@/hooks/useDeviceTypeDataConfigs';

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
