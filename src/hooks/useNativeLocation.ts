import { useEffect, useState, useCallback, useRef } from 'react';
import {
  getCurrentPosition,
  watchPosition,
  clearWatch,
  requestLocationPermission,
  checkLocationPermission,
  isWithinGeofence,
  calculateDistance,
  LocationCoordinates,
  GeolocationError,
} from '@/lib/capacitor/geolocation';

export interface UseNativeLocationOptions {
  enableWatch?: boolean;
  highAccuracy?: boolean;
  onPositionChange?: (position: LocationCoordinates) => void;
  onError?: (error: GeolocationError) => void;
}

export interface UseNativeLocationReturn {
  position: LocationCoordinates | null;
  error: GeolocationError | null;
  isLoading: boolean;
  permissionStatus: 'granted' | 'denied' | 'prompt' | null;
  requestPermission: () => Promise<boolean>;
  refreshPosition: () => Promise<void>;
  startWatching: () => Promise<void>;
  stopWatching: () => void;
  isWithinGeofence: (center: { latitude: number; longitude: number }, radius: number) => boolean;
  calculateDistance: (to: { latitude: number; longitude: number }) => number | null;
}

export function useNativeLocation(options: UseNativeLocationOptions = {}): UseNativeLocationReturn {
  const {
    enableWatch = false,
    highAccuracy = true,
    onPositionChange,
    onError,
  } = options;

  const [position, setPosition] = useState<LocationCoordinates | null>(null);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | null>(null);
  const watchIdRef = useRef<string | null>(null);

  // Check permission on mount
  useEffect(() => {
    checkLocationPermission().then(setPermissionStatus);
  }, []);

  // Auto-start watching if enabled and permission granted
  useEffect(() => {
    if (enableWatch && permissionStatus === 'granted') {
      startWatching();
    }

    return () => {
      if (watchIdRef.current) {
        clearWatch(watchIdRef.current);
      }
    };
  }, [enableWatch, permissionStatus]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const status = await requestLocationPermission();
    setPermissionStatus(status);
    return status === 'granted';
  }, []);

  const refreshPosition = useCallback(async (): Promise<void> => {
    if (permissionStatus !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const pos = await getCurrentPosition(highAccuracy);
      if (pos) {
        setPosition(pos);
        onPositionChange?.(pos);
      } else {
        setError({ code: 0, message: 'Failed to get position' });
      }
    } catch (err: any) {
      const geoError = { code: err.code || 0, message: err.message || 'Unknown error' };
      setError(geoError);
      onError?.(geoError);
    } finally {
      setIsLoading(false);
    }
  }, [permissionStatus, highAccuracy, onPositionChange, onError, requestPermission]);

  const startWatching = useCallback(async (): Promise<void> => {
    if (watchIdRef.current) return; // Already watching

    if (permissionStatus !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }

    setIsLoading(true);

    const watchId = await watchPosition((pos, err) => {
      if (err) {
        setError(err);
        onError?.(err);
      } else if (pos) {
        setPosition(pos);
        setError(null);
        onPositionChange?.(pos);
      }
      setIsLoading(false);
    }, highAccuracy);

    watchIdRef.current = watchId;
  }, [permissionStatus, highAccuracy, onPositionChange, onError, requestPermission]);

  const stopWatching = useCallback((): void => {
    if (watchIdRef.current) {
      clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const checkWithinGeofence = useCallback(
    (center: { latitude: number; longitude: number }, radius: number): boolean => {
      if (!position) return false;
      return isWithinGeofence(
        { latitude: position.latitude, longitude: position.longitude },
        center,
        radius
      );
    },
    [position]
  );

  const getDistanceTo = useCallback(
    (to: { latitude: number; longitude: number }): number | null => {
      if (!position) return null;
      return calculateDistance(
        { latitude: position.latitude, longitude: position.longitude },
        to
      );
    },
    [position]
  );

  return {
    position,
    error,
    isLoading,
    permissionStatus,
    requestPermission,
    refreshPosition,
    startWatching,
    stopWatching,
    isWithinGeofence: checkWithinGeofence,
    calculateDistance: getDistanceTo,
  };
}
