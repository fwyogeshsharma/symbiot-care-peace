import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCapacitor } from '@/contexts/CapacitorContext';
import { getBatteryInfo } from '@/lib/capacitor/device';
import { getCurrentPosition, watchPosition, clearWatch, LocationCoordinates } from '@/lib/capacitor/geolocation';

export interface DeviceData {
  battery: {
    level: number | null;
    isCharging?: boolean;
    source: 'mobile' | 'database';
    timestamp: Date;
  } | null;
  gps: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number | null;
    heading?: number | null;
    speed?: number | null;
    source: 'mobile' | 'database';
    timestamp: Date;
  } | null;
  isFromMobile: boolean;
  allData: any[];
}

interface UsePrioritizedDeviceDataOptions {
  selectedPersonId: string | null;
  enableGPSTracking?: boolean;
  gpsUpdateInterval?: number; // milliseconds
}

/**
 * Hook to get prioritized device data
 * Priority: Real mobile device data (if logged in from mobile) > Database fallback
 */
export const usePrioritizedDeviceData = ({
  selectedPersonId,
  enableGPSTracking = false,
  gpsUpdateInterval = 30000, // 30 seconds default
}: UsePrioritizedDeviceDataOptions): DeviceData & { isLoading: boolean } => {
  const { platform } = useCapacitor();
  const [mobileBattery, setMobileBattery] = useState<DeviceData['battery']>(null);
  const [mobileGPS, setMobileGPS] = useState<DeviceData['gps']>(null);
  const [watchId, setWatchId] = useState<string | null>(null);

  // Check if this is the actual mobile device being used
  const isThisMobileDevice = platform.isNative && (platform.isAndroid || platform.isIOS);

  // Fetch database fallback data
  const { data: databaseData, isLoading: isDatabaseLoading } = useQuery({
    queryKey: ['smart-phone-data', selectedPersonId],
    queryFn: async () => {
      if (!selectedPersonId) return [];

      const { data, error } = await supabase
        .from('device_data')
        .select(`
          *,
          devices!inner(device_name, device_type, device_types!inner(category))
        `)
        .eq('elderly_person_id', selectedPersonId)
        .eq('devices.device_type', 'smart_phone')
        .order('recorded_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedPersonId,
  });

  // Get real-time battery info from mobile device
  useEffect(() => {
    if (!isThisMobileDevice) return;

    const updateBattery = async () => {
      try {
        const batteryInfo = await getBatteryInfo();
        if (batteryInfo) {
          setMobileBattery({
            level: batteryInfo.batteryLevel * 100, // Convert to percentage
            isCharging: batteryInfo.isCharging,
            source: 'mobile',
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.error('Failed to get mobile battery info:', error);
      }
    };

    // Initial update
    updateBattery();

    // Update battery every 60 seconds
    const interval = setInterval(updateBattery, 60000);

    return () => clearInterval(interval);
  }, [isThisMobileDevice]);

  // Get real-time GPS from mobile device
  useEffect(() => {
    if (!isThisMobileDevice || !enableGPSTracking) return;

    let gpsInterval: NodeJS.Timeout | null = null;

    const updateGPS = async () => {
      try {
        const position = await getCurrentPosition(true);
        if (position) {
          setMobileGPS({
            latitude: position.latitude,
            longitude: position.longitude,
            accuracy: position.accuracy,
            altitude: position.altitude,
            heading: position.heading,
            speed: position.speed,
            source: 'mobile',
            timestamp: new Date(position.timestamp),
          });
        }
      } catch (error) {
        console.error('Failed to get mobile GPS:', error);
      }
    };

    // Initial GPS fetch
    updateGPS();

    // Set up periodic updates
    gpsInterval = setInterval(updateGPS, gpsUpdateInterval);

    // Alternative: Use watchPosition for continuous tracking (more battery intensive)
    // watchPosition((position) => {
    //   if (position) {
    //     setMobileGPS({
    //       latitude: position.latitude,
    //       longitude: position.longitude,
    //       accuracy: position.accuracy,
    //       altitude: position.altitude,
    //       heading: position.heading,
    //       speed: position.speed,
    //       source: 'mobile',
    //       timestamp: new Date(position.timestamp),
    //     });
    //   }
    // }, true).then(id => {
    //   if (id) setWatchId(id);
    // });

    return () => {
      if (gpsInterval) clearInterval(gpsInterval);
      // if (watchId) clearWatch(watchId);
    };
  }, [isThisMobileDevice, enableGPSTracking, gpsUpdateInterval]);

  // Parse database fallback data
  const databaseBattery: DeviceData['battery'] = databaseData?.find(d => d.data_type === 'battery_level')
    ? {
        level:
          typeof databaseData.find(d => d.data_type === 'battery_level')?.value === 'object'
            ? Number((databaseData.find(d => d.data_type === 'battery_level')?.value as any)?.value) || null
            : typeof databaseData.find(d => d.data_type === 'battery_level')?.value === 'number'
            ? databaseData.find(d => d.data_type === 'battery_level')?.value
            : null,
        source: 'database',
        timestamp: new Date(databaseData.find(d => d.data_type === 'battery_level')?.recorded_at),
      }
    : null;

  const databaseGPS: DeviceData['gps'] = (() => {
    const gpsData = databaseData?.find(d => d.data_type === 'gps');
    if (!gpsData || typeof gpsData.value !== 'object' || !gpsData.value) return null;

    const value = gpsData.value as any;
    if (!value.latitude || !value.longitude) return null;

    return {
      latitude: value.latitude,
      longitude: value.longitude,
      accuracy: value.accuracy || 0,
      altitude: value.altitude,
      heading: value.heading,
      speed: value.speed,
      source: 'database',
      timestamp: new Date(gpsData.recorded_at),
    };
  })();

  // Priority logic: Use mobile data if available, otherwise fallback to database
  return {
    battery: mobileBattery || databaseBattery,
    gps: mobileGPS || databaseGPS,
    isFromMobile: isThisMobileDevice && (!!mobileBattery || !!mobileGPS),
    allData: databaseData || [],
    isLoading: isDatabaseLoading,
  };
};
