import { useEffect, useState, useCallback } from 'react';
import {
  initializePushNotifications,
  initializeLocalNotifications,
  addPushNotificationListeners,
  addLocalNotificationListeners,
  showLocalNotification,
  scheduleLocalNotification,
  cancelNotification,
  cancelAllNotifications,
  getPendingNotifications,
  areNotificationsEnabled,
  NotificationOptions,
  NotificationSeverity,
} from '@/lib/capacitor/notifications';
import { vibrateForSeverity } from '@/lib/capacitor/haptics';
import { isNative } from '@/lib/capacitor/platform';

export interface UseCapacitorNotificationsReturn {
  isInitialized: boolean;
  isEnabled: boolean;
  pushToken: string | null;
  showNotification: (options: NotificationOptions) => Promise<void>;
  scheduleNotification: (options: NotificationOptions) => Promise<number>;
  cancelNotification: (id: number) => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
  getPendingNotifications: () => Promise<any[]>;
}

export function useCapacitorNotifications(): UseCapacitorNotificationsReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    let pushCleanup: (() => void) | null = null;
    let localCleanup: (() => void) | null = null;

    const initialize = async () => {
      try {
        // Initialize local notifications
        const localEnabled = await initializeLocalNotifications();
        setIsEnabled(localEnabled);

        // Initialize push notifications (native only)
        if (isNative()) {
          const token = await initializePushNotifications();
          setPushToken(token);

          // Add push notification listeners
          pushCleanup = addPushNotificationListeners(
            (notification) => {
              console.log('Push notification received:', notification);
              // Handle incoming push notification
            },
            (action) => {
              console.log('Push notification action:', action);
              // Handle notification tap
            }
          );
        }

        // Add local notification listeners
        localCleanup = addLocalNotificationListeners(
          (notification) => {
            console.log('Local notification received:', notification);
          },
          (action) => {
            console.log('Local notification action:', action);
          }
        );

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
      }
    };

    initialize();

    return () => {
      if (pushCleanup) pushCleanup();
      if (localCleanup) localCleanup();
    };
  }, []);

  const showNotification = useCallback(async (options: NotificationOptions) => {
    await showLocalNotification(options);

    // Trigger haptic feedback based on severity
    if (options.severity) {
      await vibrateForSeverity(options.severity);
    }
  }, []);

  const scheduleNotification = useCallback(async (options: NotificationOptions) => {
    return scheduleLocalNotification(options);
  }, []);

  const cancelNotificationById = useCallback(async (id: number) => {
    await cancelNotification(id);
  }, []);

  const cancelAll = useCallback(async () => {
    await cancelAllNotifications();
  }, []);

  const getPending = useCallback(async () => {
    return getPendingNotifications();
  }, []);

  return {
    isInitialized,
    isEnabled,
    pushToken,
    showNotification,
    scheduleNotification,
    cancelNotification: cancelNotificationById,
    cancelAllNotifications: cancelAll,
    getPendingNotifications: getPending,
  };
}
