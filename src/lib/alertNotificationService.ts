import { supabase } from '@/integrations/supabase/client';
import { showLocalNotification } from './capacitor/notifications';
import { vibrateForSeverity } from './capacitor/haptics';
import { isNative } from './capacitor/platform';

export interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  elderly_person_id: string;
  elderly_persons?: { full_name: string };
}

/**
 * Alert Notification Service
 * Monitors database for new alerts and sends mobile notifications
 */
class AlertNotificationService {
  private channel: any = null;
  private isInitialized = false;
  private lastAlertTime: Record<string, number> = {};
  private DEBOUNCE_MS = 5000; // Prevent duplicate notifications within 5 seconds

  /**
   * Initialize the alert notification service
   */
  async initialize(userId: string) {
    if (this.isInitialized || !userId) {
      console.log('Alert notification service already initialized or no user');
      return;
    }

    console.log('Initializing alert notification service for user:', userId);

    // Register FCM token for push notifications
    await this.registerFCMToken(userId);

    // Subscribe to real-time changes in alerts table
    this.channel = supabase
      .channel('alert-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
        },
        async (payload) => {
          console.log('New alert detected:', payload);
          await this.handleNewAlert(payload.new as Alert);
        }
      )
      .subscribe((status) => {
        console.log('Alert notification subscription status:', status);
      });

    this.isInitialized = true;
    console.log('Alert notification service initialized successfully');
  }

  /**
   * Handle new alert and send notification
   */
  private async handleNewAlert(alert: Alert) {
    // Debounce - prevent duplicate notifications
    const now = Date.now();
    if (this.lastAlertTime[alert.id] && (now - this.lastAlertTime[alert.id]) < this.DEBOUNCE_MS) {
      console.log('Skipping duplicate alert notification:', alert.id);
      return;
    }
    this.lastAlertTime[alert.id] = now;

    // Fetch elderly person details if not included
    let elderlyPersonName = alert.elderly_persons?.full_name || 'Patient';
    if (!alert.elderly_persons) {
      const { data, error } = await supabase
        .from('elderly_persons')
        .select('full_name')
        .eq('id', alert.elderly_person_id)
        .single();

      if (!error && data) {
        elderlyPersonName = data.full_name;
      }
    }

    // Determine notification severity based on alert severity
    const notificationSeverity = this.mapAlertSeverityToNotification(alert.severity);

    // Get notification title and body based on alert type
    const { title, body } = this.getNotificationContent(alert, elderlyPersonName);

    // Send notification
    try {
      await showLocalNotification({
        id: Date.now(),
        title,
        body,
        severity: notificationSeverity,
        data: {
          alertId: alert.id,
          alertType: alert.alert_type,
          elderlyPersonId: alert.elderly_person_id,
          severity: alert.severity,
        },
      });

      // Trigger haptic feedback
      if (isNative()) {
        await vibrateForSeverity(notificationSeverity);
      }

      console.log('Alert notification sent successfully:', alert.id);
    } catch (error) {
      console.error('Failed to send alert notification:', error);
    }
  }

  /**
   * Map alert severity to notification severity
   */
  private mapAlertSeverityToNotification(severity: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (severity) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Get notification title and body based on alert type
   */
  private getNotificationContent(alert: Alert, elderlyPersonName: string): { title: string; body: string } {
    let title = '';
    let body = '';

    switch (alert.alert_type) {
      case 'panic_sos':
        title = '🚨 PANIC SOS Alert!';
        body = `${elderlyPersonName} has pressed the emergency button. Immediate attention required!`;
        break;

      case 'fall_detected':
        title = '⚠️ Fall Detected!';
        body = `${elderlyPersonName} may have fallen. Please check immediately.`;
        break;

      case 'vital_signs':
        title = '❤️ Vital Signs Alert';
        body = `${elderlyPersonName}: ${alert.description || 'Abnormal vital signs detected'}`;
        break;

      case 'geofence':
        title = '📍 Geofence Alert';
        body = `${elderlyPersonName}: ${alert.description || 'Has left the safe zone'}`;
        break;

      case 'device_offline':
        title = '🔌 Device Offline';
        body = `${elderlyPersonName}: ${alert.description || 'Device is offline'}`;
        break;

      case 'inactivity':
        title = '😴 Inactivity Alert';
        body = `${elderlyPersonName}: ${alert.description || 'No activity detected'}`;
        break;

      case 'medication':
        title = '💊 Medication Alert';
        body = `${elderlyPersonName}: ${alert.description || 'Medication reminder'}`;
        break;

      default:
        title = `⚠️ ${alert.severity.toUpperCase()} Alert`;
        body = `${elderlyPersonName}: ${alert.description || alert.title}`;
    }

    return { title, body };
  }

  /**
   * Register FCM token for push notifications
   */
  private async registerFCMToken(userId: string) {
    try {
      // Import push notifications dynamically to avoid issues on web
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const { Device } = await import('@capacitor/device');

      // Check if we're on a native platform
      if (!isNative()) {
        console.log('Not on native platform, skipping FCM registration');
        return;
      }

      // Get device info
      const deviceInfo = await Device.getInfo();

      // Request permissions
      const permResult = await PushNotifications.requestPermissions();

      if (permResult.receive === 'granted') {
        // Register with FCM
        await PushNotifications.register();

        // Listen for registration success
        await PushNotifications.addListener('registration', async (token) => {
          console.log('FCM token received:', token.value);

          // Store token in database
          const { error } = await supabase
            .from('fcm_tokens')
            .upsert({
              user_id: userId,
              token: token.value,
              device_info: {
                platform: deviceInfo.platform,
                model: deviceInfo.model,
                manufacturer: deviceInfo.manufacturer,
                osVersion: deviceInfo.osVersion,
              },
              last_used_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id,token',
            });

          if (error) {
            console.error('Failed to store FCM token:', error);
          } else {
            console.log('FCM token stored successfully');
          }
        });

        // Listen for registration errors
        await PushNotifications.addListener('registrationError', (error) => {
          console.error('FCM registration failed:', error);
        });

        console.log('FCM registration initiated');
      } else {
        console.log('Push notification permission not granted');
      }
    } catch (error) {
      console.error('Failed to register FCM token:', error);
    }
  }

  /**
   * Cleanup and unsubscribe from channels
   */
  cleanup() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.isInitialized = false;
    console.log('Alert notification service cleaned up');
  }
}

// Export singleton instance
export const alertNotificationService = new AlertNotificationService();
