export interface HealthPermissionState {
  /** Granted read permissions, e.g. android.permission.health.READ_SLEEP. */
  granted: string[];
  /** Every read permission the sync can use, so the UI can name the missing ones. */
  all: string[];
  grantedCount: number;
  totalCount: number;
  backgroundRead: boolean;
}

/**
 * No native Capacitor shell on the web build, so there is no Health Connect to report on.
 * Callers must treat null as "no permission info available", not "nothing granted".
 */
export const checkNativeHealthPermissions = async (): Promise<HealthPermissionState | null> =>
  null;
