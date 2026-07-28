import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { listHealthDataOrigins, type HealthDataOrigin } from '@/lib/capacitor/healthConnect';
import { listBackgroundHealthSources } from '@/lib/capacitor/backgroundSync';

/**
 * Binds a device to the Health Connect app that publishes its readings.
 *
 * Health Connect pools every app's data into one store and offers no per-unit identifier —
 * Metadata.dataOrigin names the writing app and nothing else. Without this mapping the sync
 * has no way to tell one paired device's readings from another's, and stores all of them
 * under whichever device is syncing. So the user picks the source once per device.
 */

/** Package names are what Health Connect reports; these are what people call the apps. */
const KNOWN_SOURCES: Record<string, string> = {
  'com.google.android.apps.fitness': 'Google Fit',
  'com.google.android.apps.healthdata': 'Health Connect',
  'com.sec.android.app.shealth': 'Samsung Health',
  'com.huami.watch.hmwatchmanager': 'Zepp',
  'com.huami.midong': 'Zepp Life',
  'com.xiaomi.wearable': 'Mi Fitness',
  'com.huawei.health': 'Huawei Health',
  'com.heytap.health': 'OPPO/OnePlus Health',
  'com.fitbit.FitbitMobile': 'Fitbit',
  'com.garmin.android.apps.connectmobile': 'Garmin Connect',
  'com.withings.wiscale2': 'Withings Health Mate',
  'com.polar.polarflow': 'Polar Flow',
  'com.ouraring.oura': 'Oura',
  'com.whoop.android': 'WHOOP',
  'com.mc.amazfit1': 'Notify for Amazfit',
};

export const sourceLabel = (packageName: string): string =>
  KNOWN_SOURCES[packageName] ?? packageName;

/** Sentinel for "no source": Radix Select treats an empty string value as a clear. */
const UNMAPPED = '__unmapped__';

interface HealthSourcePickerProps {
  deviceId: string;
  deviceName: string;
  /** Currently mapped package name, or null when the device is unmapped. */
  value: string | null;
  /** Sources already claimed by the person's other devices, so they can be marked taken. */
  takenBy: Record<string, string>;
  personId?: string | null;
  disabled?: boolean;
}

export const HealthSourcePicker = ({
  deviceId,
  deviceName,
  value,
  takenBy,
  personId,
  disabled,
}: HealthSourcePickerProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['health-connect-sources'],
    // Discovery scans a 30-day window across every record type, so it is far too costly
    // to redo on each remount — the set of installed health apps barely changes.
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<HealthDataOrigin[]> => {
      // The native scan covers all 30 record types the worker syncs; the web plugin sees
      // only 14, so a device publishing solely sleep or distance would be missing from it.
      const native = await listBackgroundHealthSources();
      return native ?? (await listHealthDataOrigins());
    },
  });

  const save = async (next: string) => {
    const health_source = next === UNMAPPED ? null : next;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('devices')
        .update({ health_source })
        .eq('id', deviceId);

      if (error) {
        // 23505: the partial unique index on (elderly_person_id, health_source). Two
        // devices sharing a source is exactly the double-counting being fixed, so this is
        // a real conflict to surface, not a failure to retry.
        if (error.code === '23505') {
          toast.error(
            t('devices.sync.healthSource.alreadyTaken', {
              source: sourceLabel(next),
              defaultValue: '{{source}} is already assigned to another device. Clear it there first.',
            })
          );
          return;
        }
        throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['devices', personId] });
      toast.success(
        health_source
          ? t('devices.sync.healthSource.saved', {
              device: deviceName,
              source: sourceLabel(health_source),
              defaultValue: '{{device}} now syncs from {{source}}',
            })
          : t('devices.sync.healthSource.cleared', {
              device: deviceName,
              defaultValue: '{{device}} no longer syncs from Health Connect',
            })
      );
    } catch (error: any) {
      console.error('Failed to save health source:', error);
      toast.error(error.message || 'Could not save the Health Connect source');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <p className="text-xs text-muted-foreground shrink-0">
          {t('devices.sync.healthSource.label', 'Health Connect source')}
        </p>
        {(isLoading || isSaving) && (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        )}
      </div>

      <Select
        value={value ?? UNMAPPED}
        disabled={disabled || isLoading || isSaving}
        onValueChange={save}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder={t('devices.sync.healthSource.none', 'Not set')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNMAPPED}>
            {t('devices.sync.healthSource.none', 'Not set')}
          </SelectItem>
          {sources.map((source) => {
            // Its own current value is never "taken" — that would disable the live setting.
            const owner = takenBy[source.packageName];
            const taken = !!owner && source.packageName !== value;
            return (
              <SelectItem key={source.packageName} value={source.packageName} disabled={taken}>
                <span className="flex items-center gap-2">
                  <span>{sourceLabel(source.packageName)}</span>
                  <span className="text-muted-foreground text-[10px]">
                    {taken
                      ? t('devices.sync.healthSource.takenBy', {
                          device: owner,
                          defaultValue: 'used by {{device}}',
                        })
                      : t('devices.sync.healthSource.recordCount', {
                          count: source.recordCount,
                          defaultValue: '{{count}} readings',
                        })}
                  </span>
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {!value && !isLoading && (
        <p className="text-[11px] text-warning">
          {t(
            'devices.sync.healthSource.unmappedWarning',
            'Pick the app that publishes this device to sync it from Health Connect.'
          )}
        </p>
      )}

      {sources.length === 0 && !isLoading && (
        <p className="text-[11px] text-muted-foreground">
          {t(
            'devices.sync.healthSource.noSources',
            'No app has written health data yet. Open the watch app and let it sync to Health Connect first.'
          )}
        </p>
      )}
    </div>
  );
};
