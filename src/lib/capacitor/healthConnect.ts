import { HealthConnect, type RecordType } from '@pianissimoproject/capacitor-health-connect';
import { isPluginAvailable } from './platform';

/**
 * Android Health Connect service for Capacitor.
 * Reads health data that other apps (e.g. Zepp, for Amazfit devices) have
 * already written into Health Connect — this app never writes to it.
 */

export type HealthConnectStatus = 'Available' | 'NotInstalled' | 'NotSupported' | 'PluginUnavailable';

const READ_TYPES: RecordType[] = ['HeartRateSeries', 'Steps', 'OxygenSaturation', 'RestingHeartRate'];

export interface HealthConnectPoint {
  time: Date;
  value: number;
}

export interface RecentHealthRecords {
  heartRate: HealthConnectPoint[];
  steps: HealthConnectPoint[];
  oxygenSaturation: HealthConnectPoint[];
  restingHeartRate: HealthConnectPoint[];
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

  try {
    const { hasAllPermissions } = await HealthConnect.requestHealthPermissions({
      read: READ_TYPES,
      write: [],
    });
    return hasAllPermissions;
  } catch (error) {
    console.error('Failed to request Health Connect permissions:', error);
    return false;
  }
};

/**
 * Read everything written to Health Connect for the tracked record types since `since`.
 */
export const readRecentHealthRecords = async (since: Date): Promise<RecentHealthRecords> => {
  const result: RecentHealthRecords = {
    heartRate: [],
    steps: [],
    oxygenSaturation: [],
    restingHeartRate: [],
  };

  if (!isHealthConnectAvailable()) return result;

  const timeRangeFilter = { type: 'between' as const, startTime: since, endTime: new Date() };

  try {
    const [heartRateSeries, steps, oxygenSaturation, restingHeartRate] = await Promise.all([
      HealthConnect.readRecords({ type: 'HeartRateSeries', timeRangeFilter }),
      HealthConnect.readRecords({ type: 'Steps', timeRangeFilter }),
      HealthConnect.readRecords({ type: 'OxygenSaturation', timeRangeFilter }),
      HealthConnect.readRecords({ type: 'RestingHeartRate', timeRangeFilter }),
    ]);

    for (const record of heartRateSeries.records) {
      if (record.type !== 'HeartRateSeries') continue;
      for (const sample of record.samples) {
        result.heartRate.push({ time: new Date(sample.time), value: sample.beatsPerMinute });
      }
    }

    for (const record of steps.records) {
      if (record.type !== 'Steps') continue;
      result.steps.push({ time: new Date(record.endTime), value: record.count });
    }

    for (const record of oxygenSaturation.records) {
      if (record.type !== 'OxygenSaturation') continue;
      result.oxygenSaturation.push({ time: new Date(record.time), value: record.percentage.value });
    }

    for (const record of restingHeartRate.records) {
      if (record.type !== 'RestingHeartRate') continue;
      result.restingHeartRate.push({ time: new Date(record.time), value: record.beatsPerMinute });
    }
  } catch (error) {
    console.error('Failed to read Health Connect records:', error);
  }

  return result;
};

export const openHealthConnectSettings = async (): Promise<void> => {
  if (!isHealthConnectAvailable()) return;

  try {
    await HealthConnect.openHealthConnectSetting();
  } catch (error) {
    console.error('Failed to open Health Connect settings:', error);
  }
};
