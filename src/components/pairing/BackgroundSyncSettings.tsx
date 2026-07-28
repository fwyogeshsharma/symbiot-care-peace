import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  MIN_BACKGROUND_INTERVAL_MINUTES,
  configureBackgroundSync,
  disableBackgroundSync,
  enableBackgroundSync,
  getBackgroundSyncStatus,
  isBackgroundSyncAvailable,
  runBackgroundSyncNow,
  type BackgroundSyncDevice,
  type BackgroundSyncStatus,
} from '@/lib/capacitor/backgroundSync';

interface BackgroundSyncSettingsProps {
  devices: BackgroundSyncDevice[];
}

export const BackgroundSyncSettings = ({ devices }: BackgroundSyncSettingsProps) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<BackgroundSyncStatus | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const available = isBackgroundSyncAvailable();

  const refreshStatus = useCallback(async () => {
    setStatus(await getBackgroundSyncStatus());
  }, []);

  useEffect(() => {
    if (available) refreshStatus();
  }, [available, refreshStatus]);

  // The worker syncs whatever device list it was last given, so push the current one
  // whenever it changes — otherwise a newly registered device is never synced.
  useEffect(() => {
    if (!available || devices.length === 0) return;
    configureBackgroundSync(devices);
  }, [available, devices]);

  // Supabase rotates the refresh token on every renew. If the worker keeps an old one it
  // eventually fails to refresh and background sync dies silently, so re-push on renewal.
  useEffect(() => {
    if (!available) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        configureBackgroundSync(devices);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [available, devices]);

  if (!available) return null;

  const toggle = async (next: boolean) => {
    setIsBusy(true);
    try {
      if (next) {
        const configured = await configureBackgroundSync(devices);
        if (!configured) {
          toast.error(t('devices.sync.background.configureFailed', 'Could not set up background sync'));
          return;
        }
        const applied = await enableBackgroundSync(MIN_BACKGROUND_INTERVAL_MINUTES);
        if (applied === null) {
          toast.error(t('devices.sync.background.enableFailed', 'Could not turn on background sync'));
          return;
        }
        toast.success(
          t('devices.sync.background.enabled', {
            minutes: applied,
            defaultValue: 'Background sync runs about every {{minutes}} minutes',
          })
        );
      } else {
        await disableBackgroundSync();
        toast.success(t('devices.sync.background.disabled', 'Background sync turned off'));
      }
      await refreshStatus();
    } finally {
      setIsBusy(false);
    }
  };

  const syncNow = async () => {
    setIsBusy(true);
    try {
      await runBackgroundSyncNow();
      toast.info(t('devices.sync.background.queued', 'Background sync queued'));
      // WorkManager dispatches on its own thread; give it a moment before re-reading.
      setTimeout(refreshStatus, 3000);
    } catch (error) {
      toast.error(t('devices.sync.background.enableFailed', 'Could not turn on background sync'));
    } finally {
      setIsBusy(false);
    }
  };

  const lastRun = status?.lastRunAt ? new Date(status.lastRunAt) : null;

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t('devices.sync.background.title', 'Background sync')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('devices.sync.background.description', {
              minutes: MIN_BACKGROUND_INTERVAL_MINUTES,
              defaultValue:
                'Keep syncing about every {{minutes}} minutes while the app is closed. Android does not allow a shorter interval.',
            })}
          </p>
        </div>
        <Switch
          checked={!!status?.enabled}
          disabled={isBusy || devices.length === 0}
          onCheckedChange={toggle}
          aria-label={t('devices.sync.background.title', 'Background sync')}
        />
      </div>

      {status?.enabled && !status.backgroundReadPermission && (
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
          <span className="text-muted-foreground">
            {t(
              'devices.sync.background.needsBackgroundPermission',
              'Allow Health Connect to read data in the background, or syncing will only work while the app is open.'
            )}
          </span>
        </div>
      )}

      {status?.enabled && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {lastRun
              ? t('devices.sync.background.lastRun', {
                  time: lastRun.toLocaleString(),
                  defaultValue: 'Last background sync {{time}}',
                })
              : t('devices.sync.background.notRunYet', 'Has not run yet')}
          </p>
          <Button size="sm" variant="ghost" className="h-7" disabled={isBusy} onClick={syncNow}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            {t('devices.sync.background.runNow', 'Run now')}
          </Button>
        </div>
      )}
    </div>
  );
};
