import { kilogramsToPounds } from '@/lib/unitConversions';

/**
 * Presentation metadata for the metrics device sync writes into device_data.
 *
 * device_data.value is JSONB whose shape differs per data_type ({bpm}, {count}, {kg}…),
 * so rendering needs to know which key carries the number. Anything absent from the
 * registry still renders: the label is derived from the data_type and the first numeric
 * field is charted, so a metric type added later shows up without code changes.
 *
 * Keep the value keys in step with src/lib/capacitor/healthConnect.ts and
 * HealthConnectReader.kt — those decide the shapes this reads.
 */

export interface MetricDescriptor {
  label: string;
  /** Key inside the JSONB value holding the primary number. */
  valueKey: string;
  unit: string;
  precision: number;
  /** Grouping for the dashboard, so related metrics sit together. */
  group: 'vitals' | 'activity' | 'body' | 'sleep' | 'environment' | 'other';
}

export const METRIC_REGISTRY: Record<string, MetricDescriptor> = {
  heart_rate: { label: 'Heart rate', valueKey: 'bpm', unit: 'bpm', precision: 0, group: 'vitals' },
  resting_heart_rate: { label: 'Resting heart rate', valueKey: 'bpm', unit: 'bpm', precision: 0, group: 'vitals' },
  heart_rate_variability: { label: 'Heart rate variability', valueKey: 'rmssd_ms', unit: 'ms', precision: 1, group: 'vitals' },
  oxygen_saturation: { label: 'Oxygen saturation', valueKey: 'percentage', unit: '%', precision: 0, group: 'vitals' },
  respiratory_rate: { label: 'Respiratory rate', valueKey: 'breaths_per_minute', unit: 'breaths/min', precision: 0, group: 'vitals' },
  blood_pressure: { label: 'Blood pressure', valueKey: 'systolic', unit: 'mmHg', precision: 0, group: 'vitals' },
  blood_glucose: { label: 'Blood glucose', valueKey: 'value', unit: 'mmol/L', precision: 1, group: 'vitals' },
  body_temperature: { label: 'Body temperature', valueKey: 'celsius', unit: '°C', precision: 1, group: 'vitals' },
  basal_body_temperature: { label: 'Basal body temperature', valueKey: 'celsius', unit: '°C', precision: 1, group: 'vitals' },
  temperature: { label: 'Temperature', valueKey: 'celsius', unit: '°C', precision: 1, group: 'environment' },

  steps: { label: 'Steps', valueKey: 'count', unit: 'steps', precision: 0, group: 'activity' },
  steps_cadence: { label: 'Step cadence', valueKey: 'rpm', unit: 'rpm', precision: 0, group: 'activity' },
  cycling_pedaling_cadence: { label: 'Pedaling cadence', valueKey: 'rpm', unit: 'rpm', precision: 0, group: 'activity' },
  distance: { label: 'Distance', valueKey: 'meters', unit: 'm', precision: 0, group: 'activity' },
  elevation_gained: { label: 'Elevation gained', valueKey: 'meters', unit: 'm', precision: 0, group: 'activity' },
  floors_climbed: { label: 'Floors climbed', valueKey: 'floors', unit: 'floors', precision: 0, group: 'activity' },
  active_calories: { label: 'Active calories', valueKey: 'kcal', unit: 'kcal', precision: 0, group: 'activity' },
  total_calories: { label: 'Total calories', valueKey: 'kcal', unit: 'kcal', precision: 0, group: 'activity' },
  speed: { label: 'Speed', valueKey: 'meters_per_second', unit: 'm/s', precision: 2, group: 'activity' },
  power: { label: 'Power', valueKey: 'watts', unit: 'W', precision: 0, group: 'activity' },
  wheelchair_pushes: { label: 'Wheelchair pushes', valueKey: 'count', unit: 'pushes', precision: 0, group: 'activity' },
  exercise_session: { label: 'Exercise', valueKey: 'duration_minutes', unit: 'min', precision: 0, group: 'activity' },
  hydration: { label: 'Hydration', valueKey: 'liters', unit: 'L', precision: 2, group: 'activity' },

  weight: { label: 'Weight', valueKey: 'kg', unit: 'kg', precision: 1, group: 'body' },
  height: { label: 'Height', valueKey: 'meters', unit: 'm', precision: 2, group: 'body' },
  body_fat: { label: 'Body fat', valueKey: 'percentage', unit: '%', precision: 1, group: 'body' },
  lean_body_mass: { label: 'Lean body mass', valueKey: 'kg', unit: 'kg', precision: 1, group: 'body' },
  bone_mass: { label: 'Bone mass', valueKey: 'kg', unit: 'kg', precision: 1, group: 'body' },
  body_water_mass: { label: 'Body water mass', valueKey: 'kg', unit: 'kg', precision: 1, group: 'body' },
  bmi: { label: 'BMI', valueKey: 'value', unit: '', precision: 1, group: 'body' },
  basal_metabolic_rate: { label: 'Basal metabolic rate', valueKey: 'kcal_per_day', unit: 'kcal/day', precision: 0, group: 'body' },

  // Unit is embedded in formatMetricValue's "Xh Ym" output rather than appended separately.
  sleep: { label: 'Sleep', valueKey: 'duration_minutes', unit: '', precision: 0, group: 'sleep' },
  sleep_stage: { label: 'Sleep stage', valueKey: 'duration_minutes', unit: 'min', precision: 0, group: 'sleep' },
  sleep_quality: { label: 'Sleep quality', valueKey: 'score', unit: '', precision: 0, group: 'sleep' },
};

/**
 * Every data_type the Health Connect sync can write, whether or not anything has been
 * recorded yet. Lets the dashboard show the full catalogue — a metric the watch has never
 * published is then visibly "not recorded" rather than simply absent, which is the only way
 * to tell "your watch doesn't measure this" apart from "the sync is broken".
 *
 * Thirty-one entries from thirty Health Connect record types: a sleep session produces both
 * `sleep` and `sleep_stage`. Listed explicitly rather than derived from METRIC_REGISTRY,
 * which also covers types written by environment sensors and BLE peripherals that Health
 * Connect never produces.
 *
 * Must track the `map()` cases in HealthConnectReader.kt.
 */
export const SYNCED_METRICS: string[] = [
  'active_calories',
  'basal_body_temperature',
  'basal_metabolic_rate',
  'blood_glucose',
  'blood_pressure',
  'body_fat',
  'body_temperature',
  'body_water_mass',
  'bone_mass',
  'cycling_pedaling_cadence',
  'distance',
  'elevation_gained',
  'exercise_session',
  'floors_climbed',
  'heart_rate',
  'heart_rate_variability',
  'height',
  'hydration',
  'lean_body_mass',
  'oxygen_saturation',
  'power',
  'respiratory_rate',
  'resting_heart_rate',
  'sleep',
  'sleep_stage',
  'speed',
  'steps',
  'steps_cadence',
  'total_calories',
  'weight',
  'wheelchair_pushes',
];

/**
 * The Health Connect permission each metric needs, so a missing metric can say whether it
 * is blocked or simply unpublished.
 *
 * Fewer distinct permissions than metrics: READ_STEPS covers both steps and step cadence,
 * READ_EXERCISE covers exercise sessions and pedaling cadence, and READ_SLEEP covers both
 * sleep rows. That is why the manifest lists 28 permissions for 31 metrics.
 */
const HC = 'android.permission.health.READ_';

export const METRIC_PERMISSIONS: Record<string, string> = {
  active_calories: `${HC}ACTIVE_CALORIES_BURNED`,
  basal_body_temperature: `${HC}BASAL_BODY_TEMPERATURE`,
  basal_metabolic_rate: `${HC}BASAL_METABOLIC_RATE`,
  blood_glucose: `${HC}BLOOD_GLUCOSE`,
  blood_pressure: `${HC}BLOOD_PRESSURE`,
  body_fat: `${HC}BODY_FAT`,
  body_temperature: `${HC}BODY_TEMPERATURE`,
  body_water_mass: `${HC}BODY_WATER_MASS`,
  bone_mass: `${HC}BONE_MASS`,
  cycling_pedaling_cadence: `${HC}EXERCISE`,
  distance: `${HC}DISTANCE`,
  elevation_gained: `${HC}ELEVATION_GAINED`,
  exercise_session: `${HC}EXERCISE`,
  floors_climbed: `${HC}FLOORS_CLIMBED`,
  heart_rate: `${HC}HEART_RATE`,
  heart_rate_variability: `${HC}HEART_RATE_VARIABILITY`,
  height: `${HC}HEIGHT`,
  hydration: `${HC}HYDRATION`,
  lean_body_mass: `${HC}LEAN_BODY_MASS`,
  oxygen_saturation: `${HC}OXYGEN_SATURATION`,
  power: `${HC}POWER`,
  respiratory_rate: `${HC}RESPIRATORY_RATE`,
  resting_heart_rate: `${HC}RESTING_HEART_RATE`,
  sleep: `${HC}SLEEP`,
  sleep_stage: `${HC}SLEEP`,
  speed: `${HC}SPEED`,
  steps: `${HC}STEPS`,
  steps_cadence: `${HC}STEPS`,
  total_calories: `${HC}TOTAL_CALORIES_BURNED`,
  weight: `${HC}WEIGHT`,
  wheelchair_pushes: `${HC}WHEELCHAIR_PUSHES`,
};

export const GROUP_LABELS: Record<MetricDescriptor['group'], string> = {
  vitals: 'Vitals',
  activity: 'Activity',
  body: 'Body composition',
  sleep: 'Sleep',
  environment: 'Environment',
  other: 'Other',
};

/** "oxygen_saturation" -> "Oxygen saturation", for types not in the registry. */
const humanize = (dataType: string): string =>
  dataType.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

export const describeMetric = (dataType: string): MetricDescriptor =>
  METRIC_REGISTRY[dataType] ?? {
    label: humanize(dataType),
    valueKey: '',
    unit: '',
    precision: 1,
    group: 'other',
  };

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

/**
 * Pull the chartable number out of a reading. Falls back to the first numeric field so
 * an unregistered metric still plots instead of silently rendering blank.
 */
export const metricNumber = (dataType: string, value: unknown): number | null => {
  const record = asRecord(value);
  if (!record) return typeof value === 'number' ? value : null;

  const { valueKey } = describeMetric(dataType);
  const primary = valueKey ? record[valueKey] : undefined;
  if (typeof primary === 'number') return primary;

  const firstNumeric = Object.values(record).find((v) => typeof v === 'number');
  return typeof firstNumeric === 'number' ? firstNumeric : null;
};

const isWeightPounds = (unit: string | null | undefined): boolean => {
  if (!unit) return false;
  const normalized = unit.toLowerCase().trim();
  return normalized === 'lb' || normalized === 'lbs' || normalized === 'pound' || normalized === 'pounds';
};

/**
 * Display string for a reading. Blood pressure is the one genuinely two-number metric,
 * so it renders as systolic/diastolic rather than losing half the reading.
 *
 * `unit` is the device-reported unit (device_data.unit), used only to decide whether a
 * value needs converting - the displayed unit label is decided by the caller.
 */
export const formatMetricValue = (dataType: string, value: unknown, unit?: string | null): string => {
  const record = asRecord(value);
  const descriptor = describeMetric(dataType);

  if (dataType === 'weight') {
    const kg = metricNumber(dataType, value);
    if (kg === null) return '—';
    const pounds = isWeightPounds(unit) ? kg : kilogramsToPounds(kg);
    return pounds.toFixed(descriptor.precision);
  }

  if (dataType === 'blood_pressure' && record) {
    const systolic = record.systolic;
    const diastolic = record.diastolic;
    if (typeof systolic === 'number' && typeof diastolic === 'number') {
      return `${Math.round(systolic)}/${Math.round(diastolic)}`;
    }
  }

  if (dataType === 'sleep_stage' && record && typeof record.stage === 'string') {
    const minutes = metricNumber(dataType, value);
    return minutes === null ? record.stage : `${record.stage} · ${Math.round(minutes)}m`;
  }

  if (dataType === 'sleep' && record) {
    const totalMinutes = metricNumber(dataType, value);
    if (totalMinutes === null) return '—';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    const duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    const efficiency = record.sleep_efficiency_percentage;
    return typeof efficiency === 'number' ? `${duration} · ${Math.round(efficiency)}%` : duration;
  }

  const numeric = metricNumber(dataType, value);
  if (numeric === null) return '—';
  return numeric.toFixed(descriptor.precision);
};
