import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications, ScheduleOptions, LocalNotificationSchema } from '@capacitor/local-notifications';
import { isNative, isPluginAvailable } from './platform';

/**
 * Notification service for Capacitor
 * Handles both push notifications and local notifications
 */

export type NotificationSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface NotificationOptions {
  id?: number;
  title: string;
  body: string;
  severity?: NotificationSeverity;
  data?: Record<string, any>;
  schedule?: {
    at?: Date;
    repeats?: boolean;
    every?: 'day' | 'hour' | 'minute' | 'week' | 'month' | 'year';
  };
  sound?: string;
  actionTypeId?: string;
}

// Notification channel IDs for Android
export const NotificationChannels = {
  CRITICAL: 'critical-alerts',
  HIGH: 'high-priority',
  MEDIUM: 'medium-priority',
  LOW: 'low-priority',
  MEDICATION: 'medication-reminders',
  GEOFENCE: 'geofence-alerts',
} as const;

/**
 * Initialize push notifications
 */
export const initializePushNotifications = async (): Promise<string | null> => {
  if (!isNative() || !isPluginAvailable('PushNotifications')) {
    console.log('Push notifications not available on this platform');
    return null;
  }

  try {
    // Request permission
    const permResult = await PushNotifications.requestPermissions();

    if (permResult.receive === 'granted') {
      // Register for push notifications
      await PushNotifications.register();

      // Return the token when received
      return new Promise((resolve) => {
        PushNotifications.addListener('registration', (token: Token) => {
          console.log('Push registration success, token:', token.value);
          resolve(token.value);
        });

        PushNotifications.addListener('registrationError', (error: any) => {
          console.error('Push registration failed:', error);
          resolve(null);
        });
      });
    }

    return null;
  } catch (error) {
    console.error('Failed to initialize push notifications:', error);
    return null;
  }
};

/**
 * Add push notification listeners
 */
export const addPushNotificationListeners = (
  onReceived: (notification: PushNotificationSchema) => void,
  onActionPerformed: (action: ActionPerformed) => void
): (() => void) => {
  if (!isNative() || !isPluginAvailable('PushNotifications')) {
    return () => {};
  }

  const receivedListener = PushNotifications.addListener('pushNotificationReceived', onReceived);
  const actionListener = PushNotifications.addListener('pushNotificationActionPerformed', onActionPerformed);

  // Return cleanup function
  return () => {
    receivedListener.then(l => l.remove());
    actionListener.then(l => l.remove());
  };
};

/**
 * Initialize local notifications
 */
export const initializeLocalNotifications = async (): Promise<boolean> => {
  if (!isPluginAvailable('LocalNotifications')) {
    console.log('Local notifications not available');
    return false;
  }

  try {
    const permResult = await LocalNotifications.requestPermissions();

    if (permResult.display === 'granted') {
      // Create notification channels for Android
      if (isNative()) {
        await createNotificationChannels();
      }
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to initialize local notifications:', error);
    return false;
  }
};

/**
 * Create notification channels for Android
 */
const createNotificationChannels = async (): Promise<void> => {
  try {
    await LocalNotifications.createChannel({
      id: NotificationChannels.CRITICAL,
      name: 'Critical Alerts',
      description: 'Critical health and safety alerts',
      importance: 5,
      visibility: 1,
      vibration: true,
      sound: 'critical.wav',
    });

    await LocalNotifications.createChannel({
      id: NotificationChannels.HIGH,
      name: 'High Priority Alerts',
      description: 'High priority health alerts',
      importance: 4,
      visibility: 1,
      vibration: true,
    });

    await LocalNotifications.createChannel({
      id: NotificationChannels.MEDIUM,
      name: 'Medium Priority Alerts',
      description: 'Medium priority alerts',
      importance: 3,
      visibility: 1,
    });

    await LocalNotifications.createChannel({
      id: NotificationChannels.LOW,
      name: 'Low Priority Alerts',
      description: 'Low priority informational alerts',
      importance: 2,
      visibility: 1,
    });

    await LocalNotifications.createChannel({
      id: NotificationChannels.MEDICATION,
      name: 'Medication Reminders',
      description: 'Reminders to take medication',
      importance: 4,
      visibility: 1,
      vibration: true,
      sound: 'medication.wav',
    });

    await LocalNotifications.createChannel({
      id: NotificationChannels.GEOFENCE,
      name: 'Geofence Alerts',
      description: 'Alerts when entering or leaving safe zones',
      importance: 5,
      visibility: 1,
      vibration: true,
    });
  } catch (error) {
    console.error('Failed to create notification channels:', error);
  }
};

/**
 * Show a local notification immediately
 */
export const showLocalNotification = async (options: NotificationOptions): Promise<void> => {
  if (!isPluginAvailable('LocalNotifications')) {
    // Fallback to browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(options.title, { body: options.body });
    }
    return;
  }

  const channelId = getChannelForSeverity(options.severity || 'medium');

  const notification: LocalNotificationSchema = {
    id: options.id || Date.now(),
    title: options.title,
    body: options.body,
    channelId,
    extra: options.data,
    sound: options.sound,
    actionTypeId: options.actionTypeId,
  };

  await LocalNotifications.schedule({
    notifications: [notification],
  });
};

/**
 * Schedule a local notification for later
 */
export const scheduleLocalNotification = async (options: NotificationOptions): Promise<number> => {
  if (!isPluginAvailable('LocalNotifications')) {
    console.warn('Local notifications not available');
    return -1;
  }

  const id = options.id || Date.now();
  const channelId = getChannelForSeverity(options.severity || 'medium');

  const scheduleOptions: ScheduleOptions = {
    notifications: [
      {
        id,
        title: options.title,
        body: options.body,
        channelId,
        extra: options.data,
        sound: options.sound,
        actionTypeId: options.actionTypeId,
        schedule: options.schedule ? {
          at: options.schedule.at,
          repeats: options.schedule.repeats,
          every: options.schedule.every,
          allowWhileIdle: true,
        } : undefined,
      },
    ],
  };

  await LocalNotifications.schedule(scheduleOptions);
  return id;
};

/**
 * Cancel a scheduled notification
 */
export const cancelNotification = async (id: number): Promise<void> => {
  if (!isPluginAvailable('LocalNotifications')) return;

  await LocalNotifications.cancel({ notifications: [{ id }] });
};

/**
 * Cancel all pending notifications
 */
export const cancelAllNotifications = async (): Promise<void> => {
  if (!isPluginAvailable('LocalNotifications')) return;

  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({ notifications: pending.notifications });
  }
};

/**
 * Get pending notifications
 */
export const getPendingNotifications = async (): Promise<LocalNotificationSchema[]> => {
  if (!isPluginAvailable('LocalNotifications')) return [];

  const result = await LocalNotifications.getPending();
  return result.notifications;
};

/**
 * Add local notification listeners
 */
export const addLocalNotificationListeners = (
  onReceived: (notification: LocalNotificationSchema) => void,
  onActionPerformed: (action: { notification: LocalNotificationSchema; actionId: string }) => void
): (() => void) => {
  if (!isPluginAvailable('LocalNotifications')) {
    return () => {};
  }

  const receivedListener = LocalNotifications.addListener('localNotificationReceived', onReceived);
  const actionListener = LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    onActionPerformed({ notification: action.notification, actionId: action.actionId });
  });

  return () => {
    receivedListener.then(l => l.remove());
    actionListener.then(l => l.remove());
  };
};

/**
 * Get the appropriate channel for a severity level
 */
const getChannelForSeverity = (severity: NotificationSeverity): string => {
  switch (severity) {
    case 'critical':
      return NotificationChannels.CRITICAL;
    case 'high':
      return NotificationChannels.HIGH;
    case 'medium':
      return NotificationChannels.MEDIUM;
    case 'low':
      return NotificationChannels.LOW;
    default:
      return NotificationChannels.MEDIUM;
  }
};

/**
 * Check if notifications are enabled
 */
export const areNotificationsEnabled = async (): Promise<boolean> => {
  if (!isPluginAvailable('LocalNotifications')) {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  const result = await LocalNotifications.checkPermissions();
  return result.display === 'granted';
};
