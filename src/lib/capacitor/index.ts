/**
 * Capacitor Services - Main Export File
 *
 * This module provides a unified interface for all Capacitor native features
 * used in the Symbiot Care application.
 */

// Platform utilities
export * from './platform';

// Notification services (push and local)
export * from './notifications';

// Location/GPS services
export * from './geolocation';

// Camera services
export * from './camera';

// File system services
export * from './filesystem';

// Haptic feedback services
export * from './haptics';

// Persistent storage services
export * from './storage';

// App lifecycle services
export * from './app';

// Network status services
export * from './network';

// Device information services
export * from './device';

// Re-export commonly used types
export type { Directory, Encoding } from '@capacitor/filesystem';
export type { CameraSource, CameraResultType } from '@capacitor/camera';
export type { ConnectionType } from '@capacitor/network';
