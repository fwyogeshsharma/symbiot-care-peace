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
  readRecentHealthRecords,
  type HealthConnectStatus,
} from '@/lib/capacitor/healthConnect';

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
  'id' | 'device_name' | 'elderly_person_id' | 'ble_device_id' | 'last_sync'
>;

/**
 * Orchestrates real BLE sync (scan/match/connect/read) for a person's registered
 * devices, using the standard Heart Rate and Battery GATT services.
 */
export function useDeviceSync(selectedPersonId?: string | null) {
  const queryClient = useQueryClient();
  const [statusByDevice, setStatusByDevice] = useState<Record<string, DeviceSyncStatus>>({});
  const [healthConnectStatusByDevice, setHealthConnectStatusByDevice] = useState<Record<string, HealthConnectStatus>>({});
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  const setStatus = useCallback((deviceId: string, status: DeviceSyncStatus) => {
    setStatusByDevice((prev) => ({ ...prev, [deviceId]: status }));
  }, []);

  const invalidateDeviceQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['devices', selectedPersonId] });
    queryClient.invalidateQueries({ queryKey: ['device-data-counts', selectedPersonId] });
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
        const { error: insertError } = await supabase.from('device_data').insert({
          device_id: device.id,
          elderly_person_id: device.elderly_person_id,
          data_type: 'heart_rate',
          value: { bpm: heartRate },
          unit: 'bpm',
          recorded_at: now,
        });
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

    const permitted = await requestHealthConnectPermissions();
    if (!permitted) {
      setStatus(device.id, 'failed');
      toast.error(`Couldn't get Health Connect permission to sync ${device.device_name}`);
      return;
    }

    setStatus(device.id, 'syncing');
    try {
      const since = device.last_sync
        ? new Date(device.last_sync)
        : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const records = await readRecentHealthRecords(since);

      const rows = [
        ...records.heartRate.map((p) => ({ data_type: 'heart_rate', value: { bpm: p.value }, unit: 'bpm', time: p.time })),
        ...records.steps.map((p) => ({ data_type: 'steps', value: { count: p.value }, unit: 'steps', time: p.time })),
        ...records.oxygenSaturation.map((p) => ({ data_type: 'oxygen_saturation', value: { percentage: p.value }, unit: '%', time: p.time })),
        ...records.restingHeartRate.map((p) => ({ data_type: 'heart_rate', value: { bpm: p.value, type: 'resting' }, unit: 'bpm', time: p.time })),
      ];

      if (rows.length > 0) {
        const { error: insertError } = await supabase.from('device_data').insert(
          rows.map((row) => ({
            device_id: device.id,
            elderly_person_id: device.elderly_person_id,
            data_type: row.data_type,
            value: row.value,
            unit: row.unit,
            recorded_at: row.time.toISOString(),
          }))
        );
        if (insertError) throw insertError;
      }

      const { error: updateError } = await supabase
        .from('devices')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', device.id);
      if (updateError) throw updateError;

      setStatus(device.id, rows.length > 0 ? 'success' : 'unsupported');
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
    syncOne,
    syncAll,
    syncOneViaHealthConnect,
  };
}
