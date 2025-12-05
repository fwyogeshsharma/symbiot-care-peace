import { Network, ConnectionStatus, ConnectionType } from '@capacitor/network';
import { isPluginAvailable } from './platform';

/**
 * Network service for Capacitor
 * Handles network status monitoring for offline support
 */

export interface NetworkState {
  connected: boolean;
  connectionType: ConnectionType;
}

/**
 * Check if network plugin is available
 */
export const isNetworkPluginAvailable = (): boolean => {
  return isPluginAvailable('Network');
};

/**
 * Get current network status
 */
export const getNetworkStatus = async (): Promise<NetworkState> => {
  if (!isNetworkPluginAvailable()) {
    // Web fallback
    return {
      connected: navigator.onLine,
      connectionType: navigator.onLine ? 'wifi' : 'none',
    };
  }

  try {
    const status = await Network.getStatus();
    return {
      connected: status.connected,
      connectionType: status.connectionType,
    };
  } catch (error) {
    console.error('Failed to get network status:', error);
    return {
      connected: navigator.onLine,
      connectionType: 'unknown',
    };
  }
};

/**
 * Check if connected to the internet
 */
export const isConnected = async (): Promise<boolean> => {
  const status = await getNetworkStatus();
  return status.connected;
};

/**
 * Check if on WiFi
 */
export const isOnWifi = async (): Promise<boolean> => {
  const status = await getNetworkStatus();
  return status.connectionType === 'wifi';
};

/**
 * Check if on cellular
 */
export const isOnCellular = async (): Promise<boolean> => {
  const status = await getNetworkStatus();
  return status.connectionType === 'cellular';
};

/**
 * Add listener for network status changes
 */
export const addNetworkListener = (
  callback: (status: NetworkState) => void
): (() => void) => {
  if (!isNetworkPluginAvailable()) {
    // Web fallback
    const onlineHandler = () => callback({ connected: true, connectionType: 'wifi' });
    const offlineHandler = () => callback({ connected: false, connectionType: 'none' });

    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);

    return () => {
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
    };
  }

  const listener = Network.addListener('networkStatusChange', (status) => {
    callback({
      connected: status.connected,
      connectionType: status.connectionType,
    });
  });

  return () => {
    listener.then(l => l.remove());
  };
};

/**
 * Execute a callback only when online
 */
export const whenOnline = async <T>(
  callback: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> => {
  const connected = await isConnected();

  if (connected) {
    return callback();
  }

  if (fallback !== undefined) {
    return fallback;
  }

  return undefined;
};

/**
 * Wait for network connection
 */
export const waitForConnection = (timeoutMs = 30000): Promise<boolean> => {
  return new Promise((resolve) => {
    let resolved = false;
    let cleanup: (() => void) | null = null;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (cleanup) cleanup();
        resolve(false);
      }
    }, timeoutMs);

    isConnected().then((connected) => {
      if (connected && !resolved) {
        resolved = true;
        clearTimeout(timeout);
        if (cleanup) cleanup();
        resolve(true);
      } else if (!resolved) {
        cleanup = addNetworkListener((status) => {
          if (status.connected && !resolved) {
            resolved = true;
            clearTimeout(timeout);
            if (cleanup) cleanup();
            resolve(true);
          }
        });
      }
    });
  });
};
