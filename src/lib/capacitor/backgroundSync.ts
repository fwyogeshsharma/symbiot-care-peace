import { registerPlugin } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { isNative, isPluginAvailable } from './platform';

/**
 * Periodic background device sync (Android only).
 *
 * The WebView is frozen once the app is backgrounded, so the sync itself runs in a
 * native WorkManager job. This module's job is to keep that job supplied with a valid
 * Supabase session and an up to date device list.
 */

export interface BackgroundSyncStatus {
  enabled: boolean;
  configured: boolean;
  intervalMinutes: number;
  deviceCount: number;
  healthConnectPermissions: boolean;
  backgroundReadPermission: boolean;
  lastRunAt: number;
  lastResult: string;
}

export interface BackgroundSyncDevice {
  id: string;
  elderly_person_id: string;
  device_name: string;
  ble_device_id: string | null;
  /** Health Connect writing-app package this device owns; null means it syncs BLE only. */
  health_source: string | null;
}

/** An app that has written health data, as offered to the user when mapping a device. */
export interface HealthSource {
  packageName: string;
  recordCount: number;
}

/** A reading from the native full-catalogue read, before it is shaped for device_data. */
export interface NativeHealthReading {
  dataType: string;
  value: Record<string, unknown>;
  unit: string;
  /** ISO-8601 instant. */
  recordedAt: string;
}

export interface HealthPermissionState {
  /** Granted read permissions, e.g. android.permission.health.READ_SLEEP. */
  granted: string[];
  /** Every read permission the sync can use, so the UI can name the missing ones. */
  all: string[];
  grantedCount: number;
  totalCount: number;
  backgroundRead: boolean;
}

interface BackgroundSyncPlugin {
  configure(options: {
    supabaseUrl: string;
    anonKey: string;
    accessToken: string;
    refreshToken?: string;
    devices?: BackgroundSyncDevice[];
  }): Promise<void>;
  enable(options: { intervalMinutes: number }): Promise<{ intervalMinutes: number }>;
  disable(): Promise<void>;
  syncNow(): Promise<void>;
  getStatus(): Promise<BackgroundSyncStatus>;
  listHealthSources(): Promise<{ sources: HealthSource[] }>;
  requestHealthPermissions(): Promise<HealthPermissionState>;
  checkHealthPermissions(): Promise<HealthPermissionState>;
  readHealthConnect(options: {
    since: string;
    dataOrigins: string[];
  }): Promise<{ readings: NativeHealthReading[]; readAt: string }>;
  clear(): Promise<void>;
}

const BackgroundSync = registerPlugin<BackgroundSyncPlugin>('BackgroundSync');

/**
 * The worker must talk to the same project as the app. The generated client hardcodes
 * its URL and key rather than reading the environment, so take them from the live client
 * instance — they are only `protected` in the types, not absent at runtime — and fall
 * back to the env vars if a future client stops exposing them.
 */
const credentials = (): { url: string; anonKey: string } | null => {
  const client = supabase as unknown as { supabaseUrl?: string; supabaseKey?: string };
  const url = client.supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
  const anonKey = client.supabaseKey || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anonKey) {
    console.error('Background sync: no Supabase URL/key available');
    return null;
  }
  return { url, anonKey };
};

/** Android's floor for periodic work; shorter intervals are silently raised by the OS. */
export const MIN_BACKGROUND_INTERVAL_MINUTES = 15;

export const isBackgroundSyncAvailable = (): boolean =>
  isNative() && isPluginAvailable('BackgroundSync');

/**
 * Hands the current Supabase session and device list to the native worker.
 * Safe to call often — it overwrites whatever was stored previously.
 */
export const configureBackgroundSync = async (
  devices: BackgroundSyncDevice[]
): Promise<boolean> => {
  if (!isBackgroundSyncAvailable()) return false;

  const creds = credentials();
  if (!creds) return false;

  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return false;

  try {
    await BackgroundSync.configure({
      supabaseUrl: creds.url,
      anonKey: creds.anonKey,
      accessToken: session.access_token,
      // The worker outlives the hour-long access token, so it needs the refresh token
      // to renew the session on its own.
      refreshToken: session.refresh_token,
      devices,
    });
    return true;
  } catch (error) {
    console.error('Failed to configure background sync:', error);
    return false;
  }
};

export const enableBackgroundSync = async (
  intervalMinutes: number = MIN_BACKGROUND_INTERVAL_MINUTES
): Promise<number | null> => {
  if (!isBackgroundSyncAvailable()) return null;
  try {
    const { intervalMinutes: applied } = await BackgroundSync.enable({ intervalMinutes });
    return applied;
  } catch (error) {
    console.error('Failed to enable background sync:', error);
    return null;
  }
};

export const disableBackgroundSync = async (): Promise<void> => {
  if (!isBackgroundSyncAvailable()) return;
  try {
    await BackgroundSync.disable();
  } catch (error) {
    console.error('Failed to disable background sync:', error);
  }
};

export const runBackgroundSyncNow = async (): Promise<void> => {
  if (!isBackgroundSyncAvailable()) return;
  await BackgroundSync.syncNow();
};

export const getBackgroundSyncStatus = async (): Promise<BackgroundSyncStatus | null> => {
  if (!isBackgroundSyncAvailable()) return null;
  try {
    return await BackgroundSync.getStatus();
  } catch (error) {
    console.error('Failed to read background sync status:', error);
    return null;
  }
};

/**
 * Apps that have written health data, for binding each device to exactly one of them.
 *
 * Prefers the native scan because it covers all 30 record types the worker syncs, where the
 * web Health Connect plugin sees only 14 — a device publishing solely sleep or distance
 * would otherwise never appear. Returns null (not an empty list) when the native path is
 * unavailable, so the caller can fall back rather than show "no sources found".
 */
export const listBackgroundHealthSources = async (): Promise<HealthSource[] | null> => {
  if (!isBackgroundSyncAvailable()) return null;
  try {
    const { sources } = await BackgroundSync.listHealthSources();
    return sources;
  } catch (error) {
    console.error('Failed to list Health Connect sources:', error);
    return null;
  }
};

/**
 * The native Health Connect path, covering all 30 record types the sync stores.
 *
 * These exist because the web Health Connect plugin models only 14 record types: it cannot
 * request permission for sleep, distance, HRV, total calories or exercise, and cannot read
 * them either. Anything relying on the web plugin alone therefore silently misses over half
 * the catalogue. Each returns null when the native plugin is unavailable — null means "fall
 * back", which an empty array would not distinguish from "genuinely nothing".
 */
export const requestNativeHealthPermissions = async (): Promise<HealthPermissionState | null> => {
  if (!isBackgroundSyncAvailable()) return null;
  try {
    return await BackgroundSync.requestHealthPermissions();
  } catch (error) {
    console.error('Failed to request Health Connect permissions natively:', error);
    return null;
  }
};

export const checkNativeHealthPermissions = async (): Promise<HealthPermissionState | null> => {
  if (!isBackgroundSyncAvailable()) return null;
  try {
    return await BackgroundSync.checkHealthPermissions();
  } catch (error) {
    console.error('Failed to check Health Connect permissions natively:', error);
    return null;
  }
};

export const readNativeHealthRecords = async (
  since: Date,
  dataOrigins: string[]
): Promise<NativeHealthReading[] | null> => {
  if (!isBackgroundSyncAvailable()) return null;
  // Guarded here as well as natively: an empty filter reads as "every app" to Health
  // Connect, which is exactly how one device's readings get stored against another.
  if (dataOrigins.length === 0) return [];
  try {
    const { readings } = await BackgroundSync.readHealthConnect({
      since: since.toISOString(),
      dataOrigins,
    });
    return readings;
  } catch (error) {
    console.error('Failed to read Health Connect natively:', error);
    return null;
  }
};

/** Clears the stored session on sign-out so the worker stops touching the account. */
export const clearBackgroundSync = async (): Promise<void> => {
  if (!isBackgroundSyncAvailable()) return;
  try {
    await BackgroundSync.clear();
  } catch (error) {
    console.error('Failed to clear background sync:', error);
  }
};
