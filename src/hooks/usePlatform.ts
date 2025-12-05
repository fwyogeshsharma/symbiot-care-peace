import { useMemo } from 'react';
import {
  isNative,
  isAndroid,
  isIOS,
  isWeb,
  getPlatform,
  canUseNativeFeatures,
} from '@/lib/capacitor/platform';

export interface UsePlatformReturn {
  isNative: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isWeb: boolean;
  platform: string;
  canUseNativeFeatures: boolean;
}

export function usePlatform(): UsePlatformReturn {
  return useMemo(() => ({
    isNative: isNative(),
    isAndroid: isAndroid(),
    isIOS: isIOS(),
    isWeb: isWeb(),
    platform: getPlatform(),
    canUseNativeFeatures: canUseNativeFeatures(),
  }), []);
}
