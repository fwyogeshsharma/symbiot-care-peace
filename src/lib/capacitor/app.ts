import { App, URLOpenListenerEvent } from '@capacitor/app';
import { isPluginAvailable, isNative } from './platform';

/**
 * App lifecycle service for Capacitor
 * Handles app state changes, deep links, and back button
 */

export type AppState = 'active' | 'inactive' | 'background';

export interface AppInfo {
  name: string;
  id: string;
  build: string;
  version: string;
}

/**
 * Check if app plugin is available
 */
export const isAppPluginAvailable = (): boolean => {
  return isPluginAvailable('App');
};

/**
 * Get app info
 */
export const getAppInfo = async (): Promise<AppInfo | null> => {
  if (!isAppPluginAvailable()) {
    return null;
  }

  try {
    const info = await App.getInfo();
    return info;
  } catch (error) {
    console.error('Failed to get app info:', error);
    return null;
  }
};

/**
 * Get app state
 */
export const getAppState = async (): Promise<{ isActive: boolean } | null> => {
  if (!isAppPluginAvailable()) {
    return { isActive: document.visibilityState === 'visible' };
  }

  try {
    const state = await App.getState();
    return state;
  } catch (error) {
    console.error('Failed to get app state:', error);
    return null;
  }
};

/**
 * Add listener for app state changes
 */
export const addAppStateListener = (
  callback: (state: { isActive: boolean }) => void
): (() => void) => {
  if (!isAppPluginAvailable()) {
    // Web fallback using visibility change
    const handler = () => {
      callback({ isActive: document.visibilityState === 'visible' });
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }

  const listener = App.addListener('appStateChange', callback);
  return () => {
    listener.then(l => l.remove());
  };
};

/**
 * Add listener for app URL open (deep links)
 */
export const addUrlOpenListener = (
  callback: (event: URLOpenListenerEvent) => void
): (() => void) => {
  if (!isAppPluginAvailable()) {
    return () => {};
  }

  const listener = App.addListener('appUrlOpen', callback);
  return () => {
    listener.then(l => l.remove());
  };
};

/**
 * Add listener for back button (Android)
 */
export const addBackButtonListener = (
  callback: () => void
): (() => void) => {
  if (!isAppPluginAvailable()) {
    return () => {};
  }

  const listener = App.addListener('backButton', callback);
  return () => {
    listener.then(l => l.remove());
  };
};

/**
 * Exit the app (Android only)
 */
export const exitApp = async (): Promise<void> => {
  if (!isAppPluginAvailable() || !isNative()) {
    return;
  }

  try {
    await App.exitApp();
  } catch (error) {
    console.error('Failed to exit app:', error);
  }
};

/**
 * Minimize the app (Android only)
 */
export const minimizeApp = async (): Promise<void> => {
  if (!isAppPluginAvailable() || !isNative()) {
    return;
  }

  try {
    await App.minimizeApp();
  } catch (error) {
    console.error('Failed to minimize app:', error);
  }
};

/**
 * Add listener for resume (app becomes active)
 */
export const addResumeListener = (callback: () => void): (() => void) => {
  if (!isAppPluginAvailable()) {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        callback();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }

  const listener = App.addListener('resume', callback);
  return () => {
    listener.then(l => l.remove());
  };
};

/**
 * Add listener for pause (app goes to background)
 */
export const addPauseListener = (callback: () => void): (() => void) => {
  if (!isAppPluginAvailable()) {
    const handler = () => {
      if (document.visibilityState === 'hidden') {
        callback();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }

  const listener = App.addListener('pause', callback);
  return () => {
    listener.then(l => l.remove());
  };
};

/**
 * Get the URL the app was launched with
 */
export const getLaunchUrl = async (): Promise<string | null> => {
  if (!isAppPluginAvailable()) {
    return null;
  }

  try {
    const result = await App.getLaunchUrl();
    return result?.url || null;
  } catch (error) {
    console.error('Failed to get launch URL:', error);
    return null;
  }
};
