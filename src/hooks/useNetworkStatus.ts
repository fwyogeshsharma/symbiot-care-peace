import { useEffect, useState, useCallback } from 'react';
import {
  getNetworkStatus,
  addNetworkListener,
  isConnected,
  isOnWifi,
  isOnCellular,
  NetworkState,
} from '@/lib/capacitor/network';

export interface UseNetworkStatusReturn {
  isOnline: boolean;
  connectionType: string;
  isWifi: boolean;
  isCellular: boolean;
  checkConnection: () => Promise<boolean>;
}

export function useNetworkStatus(): UseNetworkStatusReturn {
  const [networkState, setNetworkState] = useState<NetworkState>({
    connected: navigator.onLine,
    connectionType: 'unknown',
  });

  useEffect(() => {
    // Get initial status
    getNetworkStatus().then(setNetworkState);

    // Listen for changes
    const cleanup = addNetworkListener(setNetworkState);

    return cleanup;
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    const connected = await isConnected();
    return connected;
  }, []);

  return {
    isOnline: networkState.connected,
    connectionType: networkState.connectionType,
    isWifi: networkState.connectionType === 'wifi',
    isCellular: networkState.connectionType === 'cellular',
    checkConnection,
  };
}
