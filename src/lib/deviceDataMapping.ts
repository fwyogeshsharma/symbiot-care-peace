// Centralized mapping of device types to their data types and display locations

export const DEVICE_CATEGORIES = {
  SECURITY: 'Security',
  SAFETY: 'Safety',
  HEALTH: 'Health',
  MEDICAL: 'Medical Device',
  WEARABLE: 'Wearable Device',
  ENVIRONMENTAL: 'Environmental Sensor',
  SLEEP: 'Sleep Monitor',
  MEDICATION: 'Medication Dispenser',
  FALL_DETECTION: 'Fall Detection',
  POSITION_TRACKING: 'Position Tracking',
} as const;

// Data types that represent movement/activity
export const ACTIVITY_DATA_TYPES = [
  'door_status',
  'last_opened',
  'motion_detected',
  'fall_detected',
  'activity',
  'steps',
  'camera_status',
  'recording_active',
  'bed_occupancy',
  'bed_presence',
  'toilet_usage',
  'toilet_occupancy',
  'pressure',
  'weight',
] as const;

// Data types that represent health metrics
export const HEALTH_DATA_TYPES = [
  'heart_rate',
  'blood_pressure',
  'temperature',
  'oxygen_saturation',
  'sleep_quality',
  'sleep_stage',
  'medication_taken',
  'next_dose_time',
  'blood_sugar',
  'steps',
  'activity',
  'humidity',
  'air_quality',
  'fall_detected',
  'impact_force',
  'weight',
  'bmi',
  'body_fat',
] as const;

// Data types that represent position
export const POSITION_DATA_TYPES = ['position', 'gps'] as const;

// Device categories that should appear on Activity Dashboard
export const ACTIVITY_DEVICE_CATEGORIES = [
  DEVICE_CATEGORIES.SECURITY,
  DEVICE_CATEGORIES.SAFETY,
  DEVICE_CATEGORIES.WEARABLE,
  DEVICE_CATEGORIES.FALL_DETECTION,
  DEVICE_CATEGORIES.HEALTH,
] as const;

// Device categories that should appear on Dashboard (Health)
export const HEALTH_DEVICE_CATEGORIES = [
  DEVICE_CATEGORIES.MEDICAL,
  DEVICE_CATEGORIES.WEARABLE,
  DEVICE_CATEGORIES.SLEEP,
  DEVICE_CATEGORIES.MEDICATION,
  DEVICE_CATEGORIES.ENVIRONMENTAL,
  DEVICE_CATEGORIES.FALL_DETECTION,
] as const;

// Device categories that should appear on Indoor Tracking
export const POSITION_DEVICE_CATEGORIES = [
  DEVICE_CATEGORIES.POSITION_TRACKING,
  DEVICE_CATEGORIES.WEARABLE,
] as const;

// Map device type codes to their primary category
export const getDeviceCategory = (deviceTypeCode: string): string => {
  const categoryMap: Record<string, string> = {
    door_sensor: DEVICE_CATEGORIES.SECURITY,
    motion_sensor: DEVICE_CATEGORIES.SECURITY,
    camera: DEVICE_CATEGORIES.SECURITY,
    fall_detector: DEVICE_CATEGORIES.FALL_DETECTION,
    wearable: DEVICE_CATEGORIES.WEARABLE,
    worker_wearable: DEVICE_CATEGORIES.POSITION_TRACKING,
    heart_monitor: DEVICE_CATEGORIES.MEDICAL,
    blood_pressure_monitor: DEVICE_CATEGORIES.MEDICAL,
    thermometer: DEVICE_CATEGORIES.MEDICAL,
    pulse_oximeter: DEVICE_CATEGORIES.MEDICAL,
    sleep_monitor: DEVICE_CATEGORIES.SLEEP,
    medication_dispenser: DEVICE_CATEGORIES.MEDICATION,
    medication: DEVICE_CATEGORIES.MEDICATION,
    temp_sensor: DEVICE_CATEGORIES.ENVIRONMENTAL,
    environmental: DEVICE_CATEGORIES.ENVIRONMENTAL,
    commercial_scale: DEVICE_CATEGORIES.HEALTH,
    bed_pad: DEVICE_CATEGORIES.HEALTH,
    chair_seat: DEVICE_CATEGORIES.HEALTH,
    toilet_seat: DEVICE_CATEGORIES.HEALTH,
    smart_phone: DEVICE_CATEGORIES.POSITION_TRACKING,
    medical: DEVICE_CATEGORIES.MEDICAL,
    emergency_button: DEVICE_CATEGORIES.SAFETY,
  };

  return categoryMap[deviceTypeCode] || 'Other';
};

// Check if device type should appear on Activity Dashboard
export const isActivityDevice = (deviceType: string, deviceCategory?: string): boolean => {
  const category = deviceCategory || getDeviceCategory(deviceType);
  return ACTIVITY_DEVICE_CATEGORIES.includes(category as any);
};

// Check if device type should appear on Health Dashboard
export const isHealthDevice = (deviceType: string, deviceCategory?: string): boolean => {
  const category = deviceCategory || getDeviceCategory(deviceType);
  return HEALTH_DEVICE_CATEGORIES.includes(category as any);
};

// Check if device type should appear on Indoor Tracking
export const isPositionDevice = (deviceType: string, deviceCategory?: string): boolean => {
  const category = deviceCategory || getDeviceCategory(deviceType);
  return POSITION_DEVICE_CATEGORIES.includes(category as any);
};

// Check if a data type represents activity
export const isActivityDataType = (dataType: string): boolean => {
  return ACTIVITY_DATA_TYPES.includes(dataType as any);
};

// Check if a data type represents health metrics
export const isHealthDataType = (dataType: string): boolean => {
  return HEALTH_DATA_TYPES.includes(dataType as any);
};

// Check if a data type represents position
export const isPositionDataType = (dataType: string): boolean => {
  return POSITION_DATA_TYPES.includes(dataType as any);
};
