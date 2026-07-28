import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { isNative } from '@/lib/capacitor/platform';
import {
  requestBluetoothPermissions,
  scanForDevice,
  connect as bleConnect,
  disconnect as bleDisconnect,
  readHeartRate,
  readBatteryLevel,
} from '@/lib/capacitor/bluetooth';
import {
  checkHealthConnectStatus,
  requestHealthConnectPermissions,
  getGrantedHealthPermissions,
  readRecentHealthRecords,
  type HealthConnectStatus,
} from '@/lib/capacitor/healthConnect';
import { getItem, setItem, StorageKeys } from '@/lib/capacitor/storage';

export type DeviceSyncStatus =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'syncing'
  | 'success'
  | 'unsupported'
  | 'failed';

export type SyncableDevice = Pick<
  Tables<'devices'>,
  'id' | 'device_name' | 'elderly_person_id' | 'ble_device_id' | 'last_sync' | 'health_source'
>;

const watermarkKey = (deviceId: string) => `${StorageKeys.HEALTH_CONNECT_WATERMARK}:${deviceId}`;

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * How far back to re-read from Health Connect. Always covers the whole of today so
 * today's step total matches the source app (Zepp) exactly, even though the source
 * app back-fills and revises interval records after the fact. Re-reading is safe:
 * device_data is uniquely keyed on (device_id, data_type, recorded_at), so repeated
 * reads upsert rather than accumulate.
 */
const readWindowStart = async (deviceId: string): Promise<Date> => {
  const stored = await getItem(watermarkKey(deviceId));
  const watermark = stored ? new Date(stored) : new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dayStart = startOfToday();
  return watermark < dayStart ? watermark : dayStart;
};

/**
 * Orchestrates real BLE sync (scan/match/connect/read) for a person's registered
 * devices, using the standard Heart Rate and Battery GATT services.
 */
export function useDeviceSync(selectedPersonId?: string | null) {
  const queryClient = useQueryClient();
  const [statusByDevice, setStatusByDevice] = useState<Record<string, DeviceSyncStatus>>({});
  const [healthConnectStatusByDevice, setHealthConnectStatusByDevice] = useState<Record<string, HealthConnectStatus>>({});
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const setStatus = useCallback((deviceId: string, status: DeviceSyncStatus) => {
    setStatusByDevice((prev) => ({ ...prev, [deviceId]: status }));
  }, []);

  const invalidateDeviceQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['devices', selectedPersonId] });
    queryClient.invalidateQueries({ queryKey: ['device-data-counts', selectedPersonId] });
    // Readings just landed in device_data — refresh every view built on it so the
    // freshly synced points show up straight away.
    queryClient.invalidateQueries({ queryKey: ['vital-metrics', selectedPersonId] });
    queryClient.invalidateQueries({ queryKey: ['steps-today', selectedPersonId] });
    queryClient.invalidateQueries({ queryKey: ['activity-health-metrics', selectedPersonId] });
    queryClient.invalidateQueries({ queryKey: ['device-history', selectedPersonId] });
    queryClient.invalidateQueries({ queryKey: ['health-metrics-charts', selectedPersonId] });
    // Keyed by person *and* window size, so match on the prefix rather than naming each
    // window — otherwise a freshly synced metric only appears after switching ranges.
    queryClient.invalidateQueries({ queryKey: ['all-health-metrics', selectedPersonId] });
  }, [queryClient, selectedPersonId]);

  const syncOne = useCallback(async (device: SyncableDevice) => {
    if (!isNative()) {
      toast.error('Bluetooth sync is only available in the mobile app');
      setStatus(device.id, 'unsupported');
      return;
    }

    const permitted = await requestBluetoothPermissions();
    if (!permitted) {
      setStatus(device.id, 'failed');
      toast.error(`Couldn't enable Bluetooth to sync ${device.device_name}`);
      return;
    }

    let bleDeviceId = device.ble_device_id;

    if (!bleDeviceId) {
      setStatus(device.id, 'scanning');
      const found = await scanForDevice(device.device_name);
      if (!found) {
        setStatus(device.id, 'unsupported');
        return;
      }
      bleDeviceId = found.deviceId;

      const { error: matchError } = await supabase
        .from('devices')
        .update({ ble_device_id: bleDeviceId })
        .eq('id', device.id);
      if (matchError) console.error('Failed to save matched BLE device id:', matchError);
    }

    setStatus(device.id, 'connecting');
    const connected = await bleConnect(bleDeviceId);
    if (!connected) {
      setStatus(device.id, 'failed');
      return;
    }

    setStatus(device.id, 'syncing');
    try {
      const [heartRate, batteryLevel] = await Promise.all([
        readHeartRate(bleDeviceId),
        readBatteryLevel(bleDeviceId),
      ]);

      const now = new Date().toISOString();

      if (heartRate !== null) {
        const { error: insertError } = await supabase.from('device_data').upsert(
          {
            device_id: device.id,
            elderly_person_id: device.elderly_person_id,
            data_type: 'heart_rate',
            value: { bpm: heartRate },
            unit: 'bpm',
            recorded_at: now,
          },
          { onConflict: 'device_id,data_type,recorded_at' }
        );
        if (insertError) throw insertError;
      }

      const { error: updateError } = await supabase
        .from('devices')
        .update({
          last_sync: now,
          ...(batteryLevel !== null ? { battery_level: batteryLevel } : {}),
        })
        .eq('id', device.id);
      if (updateError) throw updateError;

      if (heartRate !== null || batteryLevel !== null) setLastSyncedAt(new Date(now));

      setStatus(device.id, heartRate === null && batteryLevel === null ? 'unsupported' : 'success');
    } catch (error: any) {
      console.error(`Failed to sync device ${device.device_name}:`, error);
      setStatus(device.id, 'failed');
      toast.error(error.message || `Failed to sync ${device.device_name}`);
    } finally {
      await bleDisconnect(bleDeviceId);
      invalidateDeviceQueries();
    }
  }, [setStatus, invalidateDeviceQueries]);

  const syncOneViaHealthConnect = useCallback(async (device: SyncableDevice) => {
    if (!isNative()) {
      toast.error('Health Connect sync is only available in the mobile app');
      setStatus(device.id, 'unsupported');
      return;
    }

    const hcStatus = await checkHealthConnectStatus();
    setHealthConnectStatusByDevice((prev) => ({ ...prev, [device.id]: hcStatus }));
    if (hcStatus !== 'Available') {
      setStatus(device.id, 'unsupported');
      return;
    }

    // Health Connect pools every app's data together, so without a source this device has
    // no claim to any of it. Syncing anyway would copy the other device's readings in under
    // this device's id — refuse instead of guessing.
    if (!device.health_source) {
      setStatus(device.id, 'unsupported');
      toast.error(
        `Choose which app publishes ${device.device_name}'s data before syncing it from Health Connect.`
      );
      return;
    }

    const permitted = await requestHealthConnectPermissions();
    if (!permitted) {
      setStatus(device.id, 'failed');
      toast.error(`Couldn't get Health Connect permission to sync ${device.device_name}`);
      return;
    }

    setStatus(device.id, 'syncing');
    try {
      // Deliberately NOT device.last_sync: a BLE sync also stamps that column, which
      // would skip every Health Connect record written since the last BLE sync.
      const since = await readWindowStart(device.id);
      const readAt = new Date();
      const rows = await readRecentHealthRecords(since, [device.health_source]);

      // Postgres rejects an ON CONFLICT batch that touches the same key twice, so
      // collapse same-key rows before sending, keeping the last one seen.
      const byKey = new Map<string, (typeof rows)[number]>();
      for (const row of rows) {
        byKey.set(`${row.dataType}|${row.time.toISOString()}`, row);
      }
      const deduped = Array.from(byKey.values());

      if (deduped.length > 0) {
        // Upsert, not insert: the read window overlaps previous syncs on purpose, and
        // the source app revises interval records (a step interval's count can go up
        // after it was first written). Conflicting rows are corrected, not duplicated.
        const { error: upsertError } = await supabase.from('device_data').upsert(
          deduped.map((row) => ({
            device_id: device.id,
            elderly_person_id: device.elderly_person_id,
            data_type: row.dataType,
            value: row.value,
            unit: row.unit,
            recorded_at: row.time.toISOString(),
          })),
          { onConflict: 'device_id,data_type,recorded_at' }
        );
        if (upsertError) throw upsertError;
      }

      const syncedAt = new Date();
      const { error: updateError } = await supabase
        .from('devices')
        .update({ last_sync: syncedAt.toISOString() })
        .eq('id', device.id);
      if (updateError) throw updateError;

      // Advance the watermark only after the data is safely stored, and only to the
      // point we actually read up to — anything written during the read is picked up
      // next time rather than being skipped.
      await setItem(watermarkKey(device.id), readAt.toISOString());
      setLastSyncedAt(syncedAt);

      if (deduped.length > 0) {
        setStatus(device.id, 'success');
        toast.success(`Synced ${deduped.length} readings from ${device.device_name}`);
      } else {
        // A declined metric throws on read and is skipped, so an empty result means
        // nothing was permitted, nothing was written, or the mapped source is the wrong
        // one. Say which, including the source, since a mismapping looks identical to an
        // idle device otherwise.
        const granted = await getGrantedHealthPermissions();
        setStatus(device.id, 'unsupported');
        if (granted.length === 0) {
          toast.error(
            'No Health Connect data is allowed yet. Open Health Connect > App permissions > Symbiot Care and allow the metrics you want to sync.'
          );
        } else {
          toast.info(
            `No new readings from ${device.health_source} since ${since.toLocaleString()} for the ${granted.length} allowed metrics.`
          );
        }
      }
    } catch (error: any) {
      console.error(`Failed to sync device ${device.device_name} from Health Connect:`, error);
      setStatus(device.id, 'failed');
      toast.error(error.message || `Failed to sync ${device.device_name}`);
    } finally {
      invalidateDeviceQueries();
    }
  }, [setStatus, invalidateDeviceQueries]);

  const syncAll = useCallback(async (devices: SyncableDevice[]) => {
    if (devices.length === 0) return;

    setIsSyncingAll(true);
    try {
      for (const device of devices) {
        await syncOne(device);
      }
      toast.success('Device sync complete');
    } finally {
      setIsSyncingAll(false);
    }
  }, [syncOne]);

  return {
    statusByDevice,
    healthConnectStatusByDevice,
    isSyncingAll,
    lastSyncedAt,
    syncOne,
    syncAll,
    syncOneViaHealthConnect,
  };
}
