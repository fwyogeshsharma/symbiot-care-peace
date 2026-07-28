import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HeartPulse, Loader2, ShieldCheck } from 'lucide-react';
import {
  checkNativeHealthPermissions,
  requestNativeHealthPermissions,
  type HealthPermissionState,
} from '@/lib/capacitor/backgroundSync';

/**
 * Shows how much of the Health Connect catalogue the app is actually allowed to read.
 *
 * Health Connect grants permissions one metric at a time, and a declined type is skipped
 * silently on read — so a missing metric looks exactly like a device that never recorded
 * it. Naming the blocked ones is the only way to tell those apart from the app.
 */

/** "android.permission.health.READ_SLEEP" -> "Sleep". */
const permissionLabel = (permission: string): string =>
  permission
    .replace(/^android\.permission\.health\.READ_/, '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());

/** Beyond this the list stops being scannable and becomes a wall of text. */
const MAX_LISTED_MISSING = 8;

export const HealthPermissionsPanel = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [state, setState] = useState<HealthPermissionState | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const refresh = useCallback(async () => {
    setState(await checkNativeHealthPermissions());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const request = async () => {
    setIsBusy(true);
    try {
      const next = await requestNativeHealthPermissions();
      if (!next) {
        toast.error(
          t('devices.sync.permissions.failed', 'Could not open the Health Connect permission screen')
        );
        return;
      }
      setState(next);

      // A newly allowed metric only appears once something re-reads it, so drop the cached
      // dashboard queries rather than leaving the user looking at a stale "no data".
      queryClient.invalidateQueries({ queryKey: ['all-health-metrics'] });

      toast.success(
        t('devices.sync.permissions.granted', {
          granted: next.grantedCount,
          total: next.totalCount,
          defaultValue: '{{granted}} of {{total}} metrics allowed',
        })
      );
    } finally {
      setIsBusy(false);
    }
  };

  // Null means the native plugin is unavailable (web, or a build without it) — there is
  // nothing meaningful to show or request there.
  if (!state) return null;

  const missing = state.all.filter((permission) => !state.granted.includes(permission));
  const complete = missing.length === 0;

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium flex items-center gap-2">
            {complete ? (
              <ShieldCheck className="h-4 w-4 text-success" />
            ) : (
              <HeartPulse className="h-4 w-4" />
            )}
            {t('devices.sync.permissions.title', 'Health Connect metrics')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('devices.sync.permissions.summary', {
              granted: state.grantedCount,
              total: state.totalCount,
              defaultValue: '{{granted}} of {{total}} metrics allowed',
            })}
          </p>
        </div>
        <Badge variant={complete ? 'secondary' : 'outline'} className="shrink-0">
          {state.grantedCount}/{state.totalCount}
        </Badge>
      </div>

      {!complete && (
        <>
          <p className="text-xs text-muted-foreground">
            {t('devices.sync.permissions.blocked', 'Not allowed yet:')}{' '}
            <span className="text-foreground">
              {missing.slice(0, MAX_LISTED_MISSING).map(permissionLabel).join(', ')}
              {missing.length > MAX_LISTED_MISSING &&
                t('devices.sync.permissions.andMore', {
                  count: missing.length - MAX_LISTED_MISSING,
                  defaultValue: ' and {{count}} more',
                })}
            </span>
          </p>
          <Button size="sm" className="w-full h-8" disabled={isBusy} onClick={request}>
            {isBusy ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <HeartPulse className="mr-2 h-3.5 w-3.5" />
            )}
            {t('devices.sync.permissions.allowAll', 'Allow all metrics')}
          </Button>
        </>
      )}

      {complete && !state.backgroundRead && (
        <p className="text-[11px] text-muted-foreground">
          {t(
            'devices.sync.background.needsBackgroundPermission',
            'Allow Health Connect to read data in the background, or syncing will only work while the app is open.'
          )}
        </p>
      )}
    </div>
  );
};
