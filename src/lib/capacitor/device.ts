import { Device, DeviceInfo, DeviceId, BatteryInfo } from '@capacitor/device';
import { isPluginAvailable } from './platform';

/**
 * Device service for Capacitor
 * Provides device information and battery status
 */

/**
 * Check if device plugin is available
 */
export const isDevicePluginAvailable = (): boolean => {
  return isPluginAvailable('Device');
};

/**
 * Get device information
 */
export const getDeviceInfo = async (): Promise<DeviceInfo | null> => {
  if (!isDevicePluginAvailable()) {
    // Return basic web info
    return {
      name: undefined,
      model: navigator.userAgent,
      platform: 'web',
      operatingSystem: navigator.platform,
      osVersion: undefined,
      iOSVersion: undefined,
      androidSDKVersion: undefined,
      manufacturer: undefined,
      isVirtual: false,
      memUsed: undefined,
      diskFree: undefined,
      diskTotal: undefined,
      realDiskFree: undefined,
      realDiskTotal: undefined,
      webViewVersion: undefined,
    };
  }

  try {
    const info = await Device.getInfo();
    return info;
  } catch (error) {
    console.error('Failed to get device info:', error);
    return null;
  }
};

/**
 * Get device unique ID
 */
export const getDeviceId = async (): Promise<string | null> => {
  if (!isDevicePluginAvailable()) {
    // Generate or retrieve a web device ID
    let webId = localStorage.getItem('web_device_id');
    if (!webId) {
      webId = `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('web_device_id', webId);
    }
    return webId;
  }

  try {
    const id = await Device.getId();
    return id.identifier;
  } catch (error) {
    console.error('Failed to get device ID:', error);
    return null;
  }
};

/**
 * Get battery information
 */
export const getBatteryInfo = async (): Promise<BatteryInfo | null> => {
  if (!isDevicePluginAvailable()) {
    // Try web Battery API
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        return {
          batteryLevel: battery.level,
          isCharging: battery.charging,
        };
      } catch {
        return null;
      }
    }
    return null;
  }

  try {
    const battery = await Device.getBatteryInfo();
    return battery;
  } catch (error) {
    console.error('Failed to get battery info:', error);
    return null;
  }
};

/**
 * Get language code
 */
export const getLanguageCode = async (): Promise<string> => {
  if (!isDevicePluginAvailable()) {
    return navigator.language || 'en';
  }

  try {
    const lang = await Device.getLanguageCode();
    return lang.value;
  } catch (error) {
    console.error('Failed to get language code:', error);
    return navigator.language || 'en';
  }
};

/**
 * Get language tag (e.g., en-US)
 */
export const getLanguageTag = async (): Promise<string> => {
  if (!isDevicePluginAvailable()) {
    return navigator.language || 'en-US';
  }

  try {
    const lang = await Device.getLanguageTag();
    return lang.value;
  } catch (error) {
    console.error('Failed to get language tag:', error);
    return navigator.language || 'en-US';
  }
};

/**
 * Check if device is virtual (emulator/simulator)
 */
export const isVirtualDevice = async (): Promise<boolean> => {
  const info = await getDeviceInfo();
  return info?.isVirtual || false;
};

/**
 * Get platform name
 */
export const getPlatformName = async (): Promise<string> => {
  const info = await getDeviceInfo();
  return info?.platform || 'web';
};

/**
 * Get operating system version
 */
export const getOSVersion = async (): Promise<string | undefined> => {
  const info = await getDeviceInfo();
  return info?.osVersion;
};

/**
 * Get device model
 */
export const getDeviceModel = async (): Promise<string | undefined> => {
  const info = await getDeviceInfo();
  return info?.model;
};

/**
 * Get device manufacturer
 */
export const getDeviceManufacturer = async (): Promise<string | undefined> => {
  const info = await getDeviceInfo();
  return info?.manufacturer;
};
