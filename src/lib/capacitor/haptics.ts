import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isPluginAvailable, isNative } from './platform';

/**
 * Haptics service for Capacitor
 * Provides vibration feedback for alerts and notifications
 */

/**
 * Check if haptics is available
 */
export const isHapticsAvailable = (): boolean => {
  return isPluginAvailable('Haptics') && isNative();
};

/**
 * Trigger a light impact vibration
 */
export const lightImpact = async (): Promise<void> => {
  if (!isHapticsAvailable()) {
    vibrateWeb(50);
    return;
  }

  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (error) {
    console.error('Haptics light impact failed:', error);
  }
};

/**
 * Trigger a medium impact vibration
 */
export const mediumImpact = async (): Promise<void> => {
  if (!isHapticsAvailable()) {
    vibrateWeb(100);
    return;
  }

  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch (error) {
    console.error('Haptics medium impact failed:', error);
  }
};

/**
 * Trigger a heavy impact vibration
 */
export const heavyImpact = async (): Promise<void> => {
  if (!isHapticsAvailable()) {
    vibrateWeb(200);
    return;
  }

  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch (error) {
    console.error('Haptics heavy impact failed:', error);
  }
};

/**
 * Trigger success notification haptics
 */
export const successNotification = async (): Promise<void> => {
  if (!isHapticsAvailable()) {
    vibrateWeb([50, 50, 50]);
    return;
  }

  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch (error) {
    console.error('Haptics success notification failed:', error);
  }
};

/**
 * Trigger warning notification haptics
 */
export const warningNotification = async (): Promise<void> => {
  if (!isHapticsAvailable()) {
    vibrateWeb([100, 50, 100]);
    return;
  }

  try {
    await Haptics.notification({ type: NotificationType.Warning });
  } catch (error) {
    console.error('Haptics warning notification failed:', error);
  }
};

/**
 * Trigger error notification haptics
 */
export const errorNotification = async (): Promise<void> => {
  if (!isHapticsAvailable()) {
    vibrateWeb([200, 100, 200, 100, 200]);
    return;
  }

  try {
    await Haptics.notification({ type: NotificationType.Error });
  } catch (error) {
    console.error('Haptics error notification failed:', error);
  }
};

/**
 * Trigger selection changed haptics
 */
export const selectionChanged = async (): Promise<void> => {
  if (!isHapticsAvailable()) {
    vibrateWeb(10);
    return;
  }

  try {
    await Haptics.selectionChanged();
  } catch (error) {
    console.error('Haptics selection changed failed:', error);
  }
};

/**
 * Trigger selection start haptics
 */
export const selectionStart = async (): Promise<void> => {
  if (!isHapticsAvailable()) {
    return;
  }

  try {
    await Haptics.selectionStart();
  } catch (error) {
    console.error('Haptics selection start failed:', error);
  }
};

/**
 * Trigger selection end haptics
 */
export const selectionEnd = async (): Promise<void> => {
  if (!isHapticsAvailable()) {
    return;
  }

  try {
    await Haptics.selectionEnd();
  } catch (error) {
    console.error('Haptics selection end failed:', error);
  }
};

/**
 * Vibrate for a specific duration (native) or pattern (web)
 */
export const vibrate = async (duration: number = 300): Promise<void> => {
  if (!isHapticsAvailable()) {
    vibrateWeb(duration);
    return;
  }

  try {
    await Haptics.vibrate({ duration });
  } catch (error) {
    console.error('Haptics vibrate failed:', error);
  }
};

/**
 * Custom vibration pattern for alerts by severity
 */
export const vibrateForSeverity = async (severity: 'critical' | 'high' | 'medium' | 'low'): Promise<void> => {
  switch (severity) {
    case 'critical':
      // Long, strong vibration pattern
      await vibrate(500);
      await new Promise(r => setTimeout(r, 200));
      await vibrate(500);
      await new Promise(r => setTimeout(r, 200));
      await vibrate(500);
      break;
    case 'high':
      // Medium vibration pattern
      await vibrate(300);
      await new Promise(r => setTimeout(r, 150));
      await vibrate(300);
      break;
    case 'medium':
      // Short double vibration
      await vibrate(150);
      await new Promise(r => setTimeout(r, 100));
      await vibrate(150);
      break;
    case 'low':
      // Single short vibration
      await vibrate(100);
      break;
  }
};

/**
 * Web fallback vibration
 */
const vibrateWeb = (pattern: number | number[]): void => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};
