import { BleClient, numberToUUID } from '@capacitor-community/bluetooth-le';
import { isPluginAvailable } from './platform';

/**
 * Bluetooth Low Energy service for Capacitor
 * Talks to already-registered fitness devices over standard BLE GATT
 * profiles (Heart Rate, Battery) to sync live readings.
 */

const HEART_RATE_SERVICE = numberToUUID(0x180d);
const HEART_RATE_MEASUREMENT = numberToUUID(0x2a37);
const BATTERY_SERVICE = numberToUUID(0x180f);
const BATTERY_LEVEL = numberToUUID(0x2a19);

export interface DiscoveredDevice {
  deviceId: string;
  name: string;
}

let initialized = false;

export const isBluetoothAvailable = (): boolean => {
  return isPluginAvailable('BluetoothLe');
};

/**
 * Initialize the BLE client and prompt for permissions/enable Bluetooth.
 * Safe to call more than once.
 */
export const requestBluetoothPermissions = async (): Promise<boolean> => {
  if (!isBluetoothAvailable()) return false;

  try {
    if (!initialized) {
      await BleClient.initialize({ androidNeverForLocation: true });
      initialized = true;
    }

    const enabled = await BleClient.isEnabled();
    if (!enabled) {
      try {
        await BleClient.requestEnable();
      } catch {
        // User declined to enable Bluetooth
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Failed to initialize Bluetooth:', error);
    return false;
  }
};

/**
 * Scan for a nearby BLE peripheral whose advertised name contains nameFilter.
 * Resolves with the first match, or null if nothing matched before timeoutMs.
 */
export const scanForDevice = async (
  nameFilter: string,
  timeoutMs = 8000
): Promise<DiscoveredDevice | null> => {
  if (!isBluetoothAvailable()) return null;

  const needle = nameFilter.trim().toLowerCase();
  if (!needle) return null;

  return new Promise((resolve) => {
    let settled = false;

    const finish = async (result: DiscoveredDevice | null) => {
      if (settled) return;
      settled = true;
      try {
        await BleClient.stopLEScan();
      } catch {
        // scan may already be stopped
      }
      resolve(result);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    BleClient.requestLEScan({}, (scanResult) => {
      const advertisedName = (scanResult.localName || scanResult.device.name || '').toLowerCase();
      if (advertisedName && (advertisedName.includes(needle) || needle.includes(advertisedName))) {
        clearTimeout(timer);
        finish({ deviceId: scanResult.device.deviceId, name: scanResult.device.name || advertisedName });
      }
    }).catch((error) => {
      console.error('Failed to start BLE scan:', error);
      clearTimeout(timer);
      finish(null);
    });
  });
};

export const connect = async (deviceId: string): Promise<boolean> => {
  if (!isBluetoothAvailable()) return false;

  try {
    await BleClient.connect(deviceId);
    return true;
  } catch (error) {
    console.error(`Failed to connect to BLE device ${deviceId}:`, error);
    return false;
  }
};

export const disconnect = async (deviceId: string): Promise<void> => {
  if (!isBluetoothAvailable()) return;

  try {
    await BleClient.disconnect(deviceId);
  } catch (error) {
    console.error(`Failed to disconnect BLE device ${deviceId}:`, error);
  }
};

const deviceHasService = async (deviceId: string, serviceUuid: string): Promise<boolean> => {
  try {
    const services = await BleClient.getServices(deviceId);
    return services.some((service) => service.uuid.toLowerCase() === serviceUuid.toLowerCase());
  } catch (error) {
    console.error(`Failed to read services for BLE device ${deviceId}:`, error);
    return false;
  }
};

/**
 * Read the standard Battery Level characteristic (0x2A19), if present.
 * Returns a 0-100 percentage, or null if the device doesn't expose it.
 */
export const readBatteryLevel = async (deviceId: string): Promise<number | null> => {
  if (!(await deviceHasService(deviceId, BATTERY_SERVICE))) return null;

  try {
    const value = await BleClient.read(deviceId, BATTERY_SERVICE, BATTERY_LEVEL);
    return value.getUint8(0);
  } catch (error) {
    console.error(`Failed to read battery level for BLE device ${deviceId}:`, error);
    return null;
  }
};

/**
 * Read one heart rate measurement from the standard Heart Rate service (0x180D), if present.
 * The characteristic is notify-only per the BLE spec, so this subscribes, waits for a single
 * reading, then unsubscribes.
 */
export const readHeartRate = async (deviceId: string, timeoutMs = 6000): Promise<number | null> => {
  if (!(await deviceHasService(deviceId, HEART_RATE_SERVICE))) return null;

  return new Promise((resolve) => {
    let settled = false;

    const finish = async (result: number | null) => {
      if (settled) return;
      settled = true;
      try {
        await BleClient.stopNotifications(deviceId, HEART_RATE_SERVICE, HEART_RATE_MEASUREMENT);
      } catch {
        // notifications may already be stopped
      }
      resolve(result);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    BleClient.startNotifications(deviceId, HEART_RATE_SERVICE, HEART_RATE_MEASUREMENT, (value) => {
      clearTimeout(timer);
      finish(parseHeartRateMeasurement(value));
    }).catch((error) => {
      console.error(`Failed to subscribe to heart rate for BLE device ${deviceId}:`, error);
      clearTimeout(timer);
      finish(null);
    });
  });
};

/**
 * Parse the BLE Heart Rate Measurement characteristic per the Bluetooth SIG spec:
 * byte 0 is a flags bitfield; bit 0 selects whether the bpm value is uint8 or uint16.
 */
const parseHeartRateMeasurement = (value: DataView): number => {
  const flags = value.getUint8(0);
  const is16Bit = (flags & 0x1) === 1;
  return is16Bit ? value.getUint16(1, true) : value.getUint8(1);
};
