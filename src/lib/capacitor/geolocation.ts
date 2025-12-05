import { Geolocation, Position, PositionOptions, WatchPositionCallback } from '@capacitor/geolocation';
import { isPluginAvailable } from './platform';

/**
 * Geolocation service for Capacitor
 * Handles GPS tracking with high accuracy for elderly monitoring
 */

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

// Default options for high-accuracy tracking
const HIGH_ACCURACY_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
};

// Options for battery-saving mode
const LOW_POWER_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 30000,
  maximumAge: 60000,
};

/**
 * Check if geolocation is available
 */
export const isGeolocationAvailable = (): boolean => {
  return isPluginAvailable('Geolocation');
};

/**
 * Request geolocation permissions
 */
export const requestLocationPermission = async (): Promise<'granted' | 'denied' | 'prompt'> => {
  if (!isGeolocationAvailable()) {
    // Fallback to browser geolocation
    if ('geolocation' in navigator) {
      try {
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        return 'granted';
      } catch {
        return 'denied';
      }
    }
    return 'denied';
  }

  try {
    const result = await Geolocation.requestPermissions();
    return result.location;
  } catch (error) {
    console.error('Failed to request location permission:', error);
    return 'denied';
  }
};

/**
 * Check current location permission status
 */
export const checkLocationPermission = async (): Promise<'granted' | 'denied' | 'prompt'> => {
  if (!isGeolocationAvailable()) {
    return 'prompt';
  }

  try {
    const result = await Geolocation.checkPermissions();
    return result.location;
  } catch (error) {
    console.error('Failed to check location permission:', error);
    return 'denied';
  }
};

/**
 * Get current position with high accuracy
 */
export const getCurrentPosition = async (highAccuracy = true): Promise<LocationCoordinates | null> => {
  const options = highAccuracy ? HIGH_ACCURACY_OPTIONS : LOW_POWER_OPTIONS;

  if (!isGeolocationAvailable()) {
    // Fallback to browser geolocation
    return new Promise((resolve) => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve(convertPosition(position)),
          () => resolve(null),
          { enableHighAccuracy: options.enableHighAccuracy, timeout: options.timeout }
        );
      } else {
        resolve(null);
      }
    });
  }

  try {
    const position = await Geolocation.getCurrentPosition(options);
    return convertCapacitorPosition(position);
  } catch (error) {
    console.error('Failed to get current position:', error);
    return null;
  }
};

/**
 * Start watching position for continuous tracking
 */
export const watchPosition = async (
  callback: (position: LocationCoordinates | null, error?: GeolocationError) => void,
  highAccuracy = true
): Promise<string | null> => {
  const options = highAccuracy ? HIGH_ACCURACY_OPTIONS : LOW_POWER_OPTIONS;

  if (!isGeolocationAvailable()) {
    // Fallback to browser geolocation
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => callback(convertPosition(position)),
        (error) => callback(null, { code: error.code, message: error.message }),
        { enableHighAccuracy: options.enableHighAccuracy }
      );
      return `browser-${watchId}`;
    }
    return null;
  }

  try {
    const watchId = await Geolocation.watchPosition(options, (position, error) => {
      if (error) {
        callback(null, { code: 0, message: error.message || 'Unknown error' });
      } else if (position) {
        callback(convertCapacitorPosition(position));
      }
    });
    return watchId;
  } catch (error) {
    console.error('Failed to start position watch:', error);
    return null;
  }
};

/**
 * Stop watching position
 */
export const clearWatch = async (watchId: string): Promise<void> => {
  if (watchId.startsWith('browser-')) {
    const id = parseInt(watchId.replace('browser-', ''), 10);
    navigator.geolocation.clearWatch(id);
    return;
  }

  if (!isGeolocationAvailable()) return;

  try {
    await Geolocation.clearWatch({ id: watchId });
  } catch (error) {
    console.error('Failed to clear position watch:', error);
  }
};

/**
 * Calculate distance between two coordinates in meters
 */
export const calculateDistance = (
  coord1: { latitude: number; longitude: number },
  coord2: { latitude: number; longitude: number }
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (coord1.latitude * Math.PI) / 180;
  const φ2 = (coord2.latitude * Math.PI) / 180;
  const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Check if a point is within a geofence
 */
export const isWithinGeofence = (
  point: { latitude: number; longitude: number },
  center: { latitude: number; longitude: number },
  radiusMeters: number
): boolean => {
  const distance = calculateDistance(point, center);
  return distance <= radiusMeters;
};

/**
 * Convert browser GeolocationPosition to LocationCoordinates
 */
const convertPosition = (position: GeolocationPosition): LocationCoordinates => ({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  accuracy: position.coords.accuracy,
  altitude: position.coords.altitude,
  altitudeAccuracy: position.coords.altitudeAccuracy,
  heading: position.coords.heading,
  speed: position.coords.speed,
  timestamp: position.timestamp,
});

/**
 * Convert Capacitor Position to LocationCoordinates
 */
const convertCapacitorPosition = (position: Position): LocationCoordinates => ({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  accuracy: position.coords.accuracy,
  altitude: position.coords.altitude,
  altitudeAccuracy: position.coords.altitudeAccuracy,
  heading: position.coords.heading,
  speed: position.coords.speed,
  timestamp: position.timestamp,
});
