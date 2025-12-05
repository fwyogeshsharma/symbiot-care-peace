import { useEffect, useState, useCallback } from 'react';
import {
  addAppStateListener,
  addResumeListener,
  addPauseListener,
  getAppState,
  getAppInfo,
  AppInfo,
} from '@/lib/capacitor/app';

export interface UseAppStateReturn {
  isActive: boolean;
  appInfo: AppInfo | null;
  onResume: (callback: () => void) => () => void;
  onPause: (callback: () => void) => () => void;
}

export function useAppState(): UseAppStateReturn {
  const [isActive, setIsActive] = useState(true);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    // Get initial state
    getAppState().then(state => {
      if (state) setIsActive(state.isActive);
    });

    // Get app info
    getAppInfo().then(setAppInfo);

    // Listen for state changes
    const cleanup = addAppStateListener((state) => {
      setIsActive(state.isActive);
    });

    return cleanup;
  }, []);

  const onResume = useCallback((callback: () => void): (() => void) => {
    return addResumeListener(callback);
  }, []);

  const onPause = useCallback((callback: () => void): (() => void) => {
    return addPauseListener(callback);
  }, []);

  return {
    isActive,
    appInfo,
    onResume,
    onPause,
  };
}
