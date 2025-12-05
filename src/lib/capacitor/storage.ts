import { Preferences } from '@capacitor/preferences';
import { isPluginAvailable } from './platform';

/**
 * Storage service for Capacitor
 * Handles persistent storage for user preferences and cached data
 */

/**
 * Check if preferences storage is available
 */
export const isStorageAvailable = (): boolean => {
  return isPluginAvailable('Preferences');
};

/**
 * Set a value in storage
 */
export const setItem = async (key: string, value: string): Promise<void> => {
  if (!isStorageAvailable()) {
    localStorage.setItem(key, value);
    return;
  }

  try {
    await Preferences.set({ key, value });
  } catch (error) {
    console.error('Failed to set storage item:', error);
    localStorage.setItem(key, value);
  }
};

/**
 * Get a value from storage
 */
export const getItem = async (key: string): Promise<string | null> => {
  if (!isStorageAvailable()) {
    return localStorage.getItem(key);
  }

  try {
    const result = await Preferences.get({ key });
    return result.value;
  } catch (error) {
    console.error('Failed to get storage item:', error);
    return localStorage.getItem(key);
  }
};

/**
 * Remove a value from storage
 */
export const removeItem = async (key: string): Promise<void> => {
  if (!isStorageAvailable()) {
    localStorage.removeItem(key);
    return;
  }

  try {
    await Preferences.remove({ key });
  } catch (error) {
    console.error('Failed to remove storage item:', error);
    localStorage.removeItem(key);
  }
};

/**
 * Clear all storage
 */
export const clear = async (): Promise<void> => {
  if (!isStorageAvailable()) {
    localStorage.clear();
    return;
  }

  try {
    await Preferences.clear();
  } catch (error) {
    console.error('Failed to clear storage:', error);
    localStorage.clear();
  }
};

/**
 * Get all keys in storage
 */
export const keys = async (): Promise<string[]> => {
  if (!isStorageAvailable()) {
    return Object.keys(localStorage);
  }

  try {
    const result = await Preferences.keys();
    return result.keys;
  } catch (error) {
    console.error('Failed to get storage keys:', error);
    return Object.keys(localStorage);
  }
};

/**
 * Set an object in storage (JSON serialized)
 */
export const setObject = async <T>(key: string, value: T): Promise<void> => {
  const serialized = JSON.stringify(value);
  await setItem(key, serialized);
};

/**
 * Get an object from storage (JSON parsed)
 */
export const getObject = async <T>(key: string): Promise<T | null> => {
  const value = await getItem(key);
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

/**
 * Check if a key exists in storage
 */
export const hasItem = async (key: string): Promise<boolean> => {
  const value = await getItem(key);
  return value !== null;
};

// Storage keys constants
export const StorageKeys = {
  // Auth
  AUTH_TOKEN: 'auth_token',
  USER_ID: 'user_id',
  BIOMETRIC_ENABLED: 'biometric_enabled',

  // Preferences
  LANGUAGE: 'language',
  THEME: 'theme',
  NOTIFICATIONS_ENABLED: 'notifications_enabled',
  SOUND_ENABLED: 'sound_enabled',

  // Cache
  LAST_SYNC: 'last_sync',
  CACHED_ELDERLY_PERSONS: 'cached_elderly_persons',
  CACHED_DEVICES: 'cached_devices',
  CACHED_ALERTS: 'cached_alerts',

  // Medication
  MEDICATION_REMINDERS: 'medication_reminders',

  // Location
  LAST_KNOWN_LOCATION: 'last_known_location',
  GEOFENCE_SETTINGS: 'geofence_settings',

  // Push notifications
  PUSH_TOKEN: 'push_token',
  NOTIFICATION_PREFERENCES: 'notification_preferences',
} as const;
