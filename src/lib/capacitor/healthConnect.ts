import { HealthConnect, type RecordType } from '@pianissimoproject/capacitor-health-connect';
import { isPluginAvailable } from './platform';
import {
  checkNativeHealthPermissions,
  readNativeHealthRecords,
  requestNativeHealthPermissions,
} from './backgroundSync';

/**
 * Android Health Connect service for Capacitor.
 * Reads health data that other apps (e.g. Zepp, for Amazfit devices) have
 * already written into Health Connect — this app never writes to it.
 *
 * Health Connect is one shared store, not a per-device feed, so every read here must be
 * narrowed to the source app that publishes a given device's readings. Reading unfiltered
 * and labelling the result with whichever device is syncing writes the same readings under
 * every paired device and doubles every total. See `dataOrigins` on the read functions.
 *
 * Note the plugin only exposes 14 record types. Sleep, distance, calories totals, HRV
 * and exercise sessions are NOT among them, so the foreground sync cannot see them; the
 * native background worker reads those directly through the Health Connect SDK. Keep the
 * data_type and value shapes here identical to HealthConnectReader.kt — both write the
 * same table and the same rows must upsert onto each other, not duplicate.
 */

export type HealthConnectStatus = 'Available' | 'NotInstalled' | 'NotSupported' | 'PluginUnavailable';

const READ_TYPES: RecordType[] = [
  'ActiveCaloriesBurned',
  'BasalBodyTemperature',
  'BasalMetabolicRate',
  'BloodGlucose',
  'BloodPressure',
  'BodyFat',
  'BodyTemperature',
  'HeartRateSeries',
  'Height',
  'OxygenSaturation',
  'RespiratoryRate',
  'RestingHeartRate',
  'Steps',
  'Weight',
];

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue | undefined }
  | JsonValue[];

/** A reading already shaped for the device_data table. */
export interface HealthConnectReading {
  dataType: string;
  /** Structurally compatible with the generated Supabase `Json` type. */
  value: { [key: string]: JsonValue | undefined };
  unit: string;
  time: Date;
}

export const isHealthConnectAvailable = (): boolean => {
  return isPluginAvailable('HealthConnect');
};

export const checkHealthConnectStatus = async (): Promise<HealthConnectStatus> => {
  if (!isHealthConnectAvailable()) return 'PluginUnavailable';

  try {
    const { availability } = await HealthConnect.checkAvailability();
    return availability;
  } catch (error) {
    console.error('Failed to check Health Connect availability:', error);
    return 'PluginUnavailable';
  }
};

export const requestHealthConnectPermissions = async (): Promise<boolean> => {
  if (!isHealthConnectAvailable()) return false;

  // Ask natively first: the web plugin can only request its 14 record types, so going
  // through it alone means the user is never asked about sleep, distance, HRV, total
  // calories or exercise — and the sync then skips them for want of permission.
  const native = await requestNativeHealthPermissions();
  if (native) return native.grantedCount > 0;

  try {
    const { grantedPermissions } = await HealthConnect.requestHealthPermissions({
      read: READ_TYPES,
      write: [],
    });
    // Not hasAllPermissions: the user grants each metric separately, and refusing to
    // sync anything because one of fourteen was declined would be worse than syncing
    // what was allowed.
    return grantedPermissions.length > 0;
  } catch (error) {
    console.error('Failed to request Health Connect permissions:', error);
    return false;
  }
};

/**
 * Which of the requested metrics the user has actually allowed.
 *
 * Needed to tell "you never granted permission" apart from "the watch wrote nothing":
 * a declined type throws on read and is skipped, so without this both look like an
 * empty sync.
 */
export const getGrantedHealthPermissions = async (): Promise<string[]> => {
  if (!isHealthConnectAvailable()) return [];

  // Native first, for the same reason as the request: the web plugin can only report on
  // the 14 types it models, so it would call a sleep-only grant "nothing allowed".
  const native = await checkNativeHealthPermissions();
  if (native) return native.granted;

  try {
    const { grantedPermissions } = await HealthConnect.checkHealthPermissions({
      read: READ_TYPES,
      write: [],
    });
    return grantedPermissions;
  } catch (error) {
    console.error('Failed to check Health Connect permissions:', error);
    return [];
  }
};

/**
 * Records of one type, restricted to the given writing apps.
 *
 * `dataOrigins` is passed straight to Health Connect as its dataOriginFilter, so the
 * narrowing happens in the provider rather than by discarding rows here. An empty array
 * would mean "no filter" to Health Connect — callers must never reach this with one.
 */
const readType = async (
  type: RecordType,
  since: Date,
  dataOrigins: string[]
): Promise<HealthConnectReading[]> => {
  const timeRangeFilter = { type: 'between' as const, startTime: since, endTime: new Date() };
  const readings: HealthConnectReading[] = [];

  // A declined metric rejects on read; skip it rather than lose the whole batch.
  let records: any[];
  try {
    const result = await HealthConnect.readRecords({
      type,
      timeRangeFilter,
      dataOriginFilter: dataOrigins,
    });
    records = result.records;
  } catch (error) {
    console.warn(`Skipping Health Connect type ${type}:`, error);
    return readings;
  }

  for (const record of records) {
    switch (record.type) {
      case 'HeartRateSeries':
        for (const sample of record.samples) {
          readings.push({
            dataType: 'heart_rate',
            value: { bpm: sample.beatsPerMinute },
            unit: 'bpm',
            time: new Date(sample.time),
          });
        }
        break;
      case 'RestingHeartRate':
        readings.push({
          dataType: 'resting_heart_rate',
          value: { bpm: record.beatsPerMinute },
          unit: 'bpm',
          time: new Date(record.time),
        });
        break;
      case 'Steps':
        readings.push({
          dataType: 'steps',
          value: { count: record.count },
          unit: 'steps',
          time: new Date(record.endTime),
        });
        break;
      case 'OxygenSaturation':
        readings.push({
          dataType: 'oxygen_saturation',
          value: { percentage: record.percentage.value },
          unit: '%',
          time: new Date(record.time),
        });
        break;
      case 'RespiratoryRate':
        readings.push({
          dataType: 'respiratory_rate',
          value: { breaths_per_minute: record.rate },
          unit: 'breaths/min',
          time: new Date(record.time),
        });
        break;
      case 'ActiveCaloriesBurned':
        readings.push({
          dataType: 'active_calories',
          value: { kcal: toKilocalories(record.energy) },
          unit: 'kcal',
          time: new Date(record.endTime),
        });
        break;
      case 'BasalMetabolicRate':
        readings.push({
          dataType: 'basal_metabolic_rate',
          value: { kcal_per_day: toKilocaloriesPerDay(record.basalMetabolicRate) },
          unit: 'kcal/day',
          time: new Date(record.time),
        });
        break;
      case 'BloodGlucose':
        readings.push({
          dataType: 'blood_glucose',
          value: {
            value: toMillimolesPerLiter(record.level),
            unit: 'mmol/L',
            meal_type: record.mealType,
            specimen_source: record.specimenSource,
            relation_to_meal: record.relationToMeal,
          },
          unit: 'mmol/L',
          time: new Date(record.time),
        });
        break;
      case 'BloodPressure':
        readings.push({
          dataType: 'blood_pressure',
          value: {
            systolic: record.systolic.value,
            diastolic: record.diastolic.value,
            body_position: record.bodyPosition,
            measurement_location: record.measurementLocation,
          },
          unit: 'mmHg',
          time: new Date(record.time),
        });
        break;
      case 'BodyFat':
        readings.push({
          dataType: 'body_fat',
          value: { percentage: record.percentage.value },
          unit: '%',
          time: new Date(record.time),
        });
        break;
      case 'BodyTemperature':
      case 'BasalBodyTemperature':
        readings.push({
          dataType: record.type === 'BodyTemperature' ? 'body_temperature' : 'basal_body_temperature',
          value: { celsius: toCelsius(record.temperature) },
          unit: '°C',
          time: new Date(record.time),
        });
        break;
      case 'Height':
        readings.push({
          dataType: 'height',
          value: { meters: toMeters(record.height) },
          unit: 'm',
          time: new Date(record.time),
        });
        break;
      case 'Weight':
        readings.push({
          dataType: 'weight',
          value: { kg: toKilograms(record.weight) },
          unit: 'kg',
          time: new Date(record.time),
        });
        break;
    }
  }

  return readings;
};

// The plugin reports each quantity in whatever unit the writing app chose, so normalise
// here — a stored value must never need interpreting against its source.
const toKilocalories = (e: { unit: string; value: number }): number => {
  switch (e.unit) {
    case 'calories': return e.value / 1000;
    case 'joules': return e.value / 4184;
    case 'kilojoules': return e.value / 4.184;
    default: return e.value;
  }
};

const toKilocaloriesPerDay = (p: { unit: string; value: number }): number =>
  p.unit === 'watts' ? p.value * 20.6362 : p.value;

const toMillimolesPerLiter = (g: { unit: string; value: number }): number =>
  g.unit === 'milligramsPerDeciliter' ? g.value / 18 : g.value;

const toCelsius = (t: { unit: string; value: number }): number =>
  t.unit === 'fahrenheit' ? (t.value - 32) / 1.8 : t.value;

const toMeters = (l: { unit: string; value: number }): number => {
  switch (l.unit) {
    case 'kilometer': return l.value * 1000;
    case 'mile': return l.value * 1609.344;
    case 'inch': return l.value * 0.0254;
    case 'feet': return l.value * 0.3048;
    default: return l.value;
  }
};

const toKilograms = (m: { unit: string; value: number }): number => {
  switch (m.unit) {
    case 'gram': return m.value / 1000;
    case 'milligram': return m.value / 1e6;
    case 'microgram': return m.value / 1e9;
    case 'ounce': return m.value * 0.0283495;
    case 'pound': return m.value * 0.453592;
    default: return m.value;
  }
};

/**
 * Read every supported record type written since `since` by the given apps.
 *
 * `dataOrigins` is the set of writing-app package names belonging to one device. Passing
 * an empty set returns nothing rather than everything: Health Connect treats an empty
 * dataOriginFilter as "all sources", and inheriting that here is precisely how readings
 * from one watch end up stored against another.
 */
export const readRecentHealthRecords = async (
  since: Date,
  dataOrigins: string[]
): Promise<HealthConnectReading[]> => {
  if (!isHealthConnectAvailable()) return [];
  if (dataOrigins.length === 0) {
    console.warn('[HealthConnect] read skipped: no data origin mapped for this device');
    return [];
  }

  // The native reader covers all 30 record types the app stores; the web plugin models
  // only 14, so going through it alone drops sleep, distance, HRV, total calories,
  // exercise sessions, cadence, speed, power, hydration and body composition entirely.
  const native = await readNativeHealthRecords(since, dataOrigins);
  if (native) {
    console.log(
      `[HealthConnect] native read since ${since.toISOString()} from ${dataOrigins.join(',')}: ${native.length} readings`
    );
    return native.map((reading) => ({
      dataType: reading.dataType,
      value: reading.value as HealthConnectReading['value'],
      unit: reading.unit,
      time: new Date(reading.recordedAt),
    }));
  }

  const batches = await Promise.all(READ_TYPES.map((type) => readType(type, since, dataOrigins)));

  // Logged per type so an empty sync can be diagnosed from logcat without guessing
  // which metric was missing versus merely unwritten.
  console.log(
    `[HealthConnect] read since ${since.toISOString()} from ${dataOrigins.join(',')}:`,
    READ_TYPES.map((type, i) => `${type}=${batches[i].length}`).join(' ')
  );

  return batches.flat();
};

/** A writing app that has published readings, as offered to the user for mapping. */
export interface HealthDataOrigin {
  /** Package name, e.g. com.huami.watch.hmwatchmanager — the value stored in devices.health_source. */
  packageName: string;
  /** How many records it wrote in the sampled window; lets the user tell an active source from a dormant one. */
  recordCount: number;
}

/** How far back to look when discovering sources. Long enough that a device worn only
 *  occasionally still shows up, short enough not to scan the user's whole history. */
const ORIGIN_DISCOVERY_DAYS = 30;

/**
 * Which apps have written health data, so each device can be bound to one of them.
 *
 * This is the only device attribution Health Connect offers: Metadata.dataOrigin names the
 * app that wrote a record, never the physical unit. Two watches publishing through the same
 * app therefore collapse to a single entry here and cannot be told apart downstream.
 */
export const listHealthDataOrigins = async (): Promise<HealthDataOrigin[]> => {
  if (!isHealthConnectAvailable()) return [];

  const since = new Date(Date.now() - ORIGIN_DISCOVERY_DAYS * 24 * 60 * 60 * 1000);
  const timeRangeFilter = { type: 'between' as const, startTime: since, endTime: new Date() };
  const counts = new Map<string, number>();

  await Promise.all(
    READ_TYPES.map(async (type) => {
      try {
        // No dataOriginFilter here on purpose — discovering the sources is the point.
        const { records } = await HealthConnect.readRecords({ type, timeRangeFilter });
        for (const record of records as any[]) {
          const origin = record?.metadata?.dataOrigin;
          if (origin) counts.set(origin, (counts.get(origin) ?? 0) + 1);
        }
      } catch (error) {
        // A declined metric throws; other types can still reveal their sources.
        console.warn(`Skipping Health Connect type ${type} during origin discovery:`, error);
      }
    })
  );

  return Array.from(counts, ([packageName, recordCount]) => ({ packageName, recordCount }))
    .sort((a, b) => b.recordCount - a.recordCount);
};

export const openHealthConnectSettings = async (): Promise<void> => {
  if (!isHealthConnectAvailable()) return;

  try {
    await HealthConnect.openHealthConnectSetting();
  } catch (error) {
    console.error('Failed to open Health Connect settings:', error);
  }
};
