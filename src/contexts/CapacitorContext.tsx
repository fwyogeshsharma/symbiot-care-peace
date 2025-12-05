import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useCapacitorNotifications } from '@/hooks/useCapacitorNotifications';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAppState } from '@/hooks/useAppState';
import { usePlatform } from '@/hooks/usePlatform';
import { initializeLocalNotifications, initializePushNotifications } from '@/lib/capacitor/notifications';
import { isNative } from '@/lib/capacitor/platform';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

interface CapacitorContextType {
  // Platform info
  platform: {
    isNative: boolean;
    isAndroid: boolean;
    isIOS: boolean;
    isWeb: boolean;
    platform: string;
  };

  // Network status
  network: {
    isOnline: boolean;
    connectionType: string;
    isWifi: boolean;
    isCellular: boolean;
  };

  // App state
  app: {
    isActive: boolean;
    appInfo: any;
  };

  // Notifications
  notifications: {
    isInitialized: boolean;
    isEnabled: boolean;
    pushToken: string | null;
    showNotification: (options: any) => Promise<void>;
    scheduleNotification: (options: any) => Promise<number>;
  };

  // Initialization state
  isReady: boolean;
}

const CapacitorContext = createContext<CapacitorContextType | null>(null);

interface CapacitorProviderProps {
  children: ReactNode;
}

export function CapacitorProvider({ children }: CapacitorProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const platform = usePlatform();
  const network = useNetworkStatus();
  const appState = useAppState();
  const notifications = useCapacitorNotifications();

  useEffect(() => {
    const initializeCapacitor = async () => {
      try {
        // Hide splash screen
        if (isNative()) {
          await SplashScreen.hide();

          // Configure status bar
          try {
            await StatusBar.setStyle({ style: Style.Light });
            await StatusBar.setBackgroundColor({ color: '#0095DB' });
          } catch (e) {
            // Status bar might not be available
          }
        }

        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize Capacitor:', error);
        setIsReady(true); // Continue even if initialization fails
      }
    };

    initializeCapacitor();
  }, []);

  const value: CapacitorContextType = {
    platform: {
      isNative: platform.isNative,
      isAndroid: platform.isAndroid,
      isIOS: platform.isIOS,
      isWeb: platform.isWeb,
      platform: platform.platform,
    },
    network: {
      isOnline: network.isOnline,
      connectionType: network.connectionType,
      isWifi: network.isWifi,
      isCellular: network.isCellular,
    },
    app: {
      isActive: appState.isActive,
      appInfo: appState.appInfo,
    },
    notifications: {
      isInitialized: notifications.isInitialized,
      isEnabled: notifications.isEnabled,
      pushToken: notifications.pushToken,
      showNotification: notifications.showNotification,
      scheduleNotification: notifications.scheduleNotification,
    },
    isReady,
  };

  return (
    <CapacitorContext.Provider value={value}>
      {children}
    </CapacitorContext.Provider>
  );
}

export function useCapacitor(): CapacitorContextType {
  const context = useContext(CapacitorContext);
  if (!context) {
    throw new Error('useCapacitor must be used within a CapacitorProvider');
  }
  return context;
}

// Export individual hooks for convenience
export { useCapacitorNotifications } from '@/hooks/useCapacitorNotifications';
export { useNetworkStatus } from '@/hooks/useNetworkStatus';
export { useAppState } from '@/hooks/useAppState';
export { usePlatform } from '@/hooks/usePlatform';
export { useNativeLocation } from '@/hooks/useNativeLocation';
export { useFileSystem } from '@/hooks/useFileSystem';
