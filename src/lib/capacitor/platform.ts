import { Capacitor } from '@capacitor/core';

/**
 * Platform detection utilities for Capacitor
 */

export const isNative = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const isAndroid = (): boolean => {
  return Capacitor.getPlatform() === 'android';
};

export const isIOS = (): boolean => {
  return Capacitor.getPlatform() === 'ios';
};

export const isWeb = (): boolean => {
  return Capacitor.getPlatform() === 'web';
};

export const getPlatform = (): string => {
  return Capacitor.getPlatform();
};

export const isPluginAvailable = (pluginName: string): boolean => {
  return Capacitor.isPluginAvailable(pluginName);
};

/**
 * Check if running in a native environment where native features are available
 */
export const canUseNativeFeatures = (): boolean => {
  return isNative() && (isAndroid() || isIOS());
};
