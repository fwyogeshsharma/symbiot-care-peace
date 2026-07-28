import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Bluetooth,
  CheckCircle2,
  HeartPulse,
  HelpCircle,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePlatform } from '@/hooks/usePlatform';
import { useDeviceSync, type DeviceSyncStatus } from '@/hooks/useDeviceSync';
import { BackgroundSyncSettings } from './BackgroundSyncSettings';
import { HealthSourcePicker } from './HealthSourcePicker';
import { HealthPermissionsPanel } from './HealthPermissionsPanel';

const HEALTH_CONNECT_PLAY_STORE_URL = 'market://details?id=com.google.android.apps.healthdata';

interface DeviceSyncPanelProps {
  selectedPersonId?: string | null;
}

const statusIcon = (status: DeviceSyncStatus | undefined) => {
  switch (status) {
    case 'scanning':
    case 'connecting':
    case 'syncing':
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    case 'success':
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    case 'unsupported':
      return <HelpCircle className="h-4 w-4 text-warning" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Bluetooth className="h-4 w-4 text-muted-foreground" />;
  }
};

export const DeviceSyncPanel = ({ selectedPersonId }: DeviceSyncPanelProps) => {
  const { t } = useTranslation();
  const { isNative } = usePlatform();
  const {
    statusByDevice,
    healthConnectStatusByDevice,
    isSyncingAll,
    lastSyncedAt,
    syncOne,
    syncAll,
    syncOneViaHealthConnect,
  } = useDeviceSync(selectedPersonId);

  const { data: devices = [] } = useQuery({
    queryKey: ['devices', selectedPersonId],
    queryFn: async () => {
      if (!selectedPersonId) return [];

      const { data, error } = await supabase
        .from('devices')
        .select('id, device_name, elderly_person_id, ble_device_id, last_sync, health_source')
        .eq('elderly_person_id', selectedPersonId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedPersonId,
  });

  // Which device owns each Health Connect source, so the picker can mark the rest taken.
  // A source feeds exactly one device — sharing it is what duplicated the readings.
  const takenBy = Object.fromEntries(
    devices
      .filter((device) => device.health_source)
      .map((device) => [device.health_source as string, device.device_name])
  );

  const statusLabel = (status: DeviceSyncStatus | undefined) => {
    switch (status) {
      case 'scanning': return t('devices.sync.statusScanning');
      case 'connecting': return t('devices.sync.statusConnecting');
      case 'syncing': return t('devices.sync.statusSyncing');
      case 'success': return t('devices.sync.statusSuccess');
      case 'unsupported': return t('devices.sync.statusUnsupported');
      case 'failed': return t('devices.sync.statusFailed');
      default: return t('devices.sync.statusIdle');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bluetooth className="h-5 w-5" />
          {t('devices.sync.title')}
        </CardTitle>
        <CardDescription>{t('devices.sync.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isNative && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-muted-foreground">
            {t('devices.sync.webNotSupported')}
          </div>
        )}

        {lastSyncedAt && (
          <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            <span className="text-muted-foreground">
              {t('devices.sync.showingDataSince', {
                time: lastSyncedAt.toLocaleString(),
                defaultValue: 'Showing data synced at {{time}}',
              })}
            </span>
          </div>
        )}

        {devices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{t('devices.sync.noDevices')}</p>
        ) : (
          <>
            <HealthPermissionsPanel />

            <BackgroundSyncSettings devices={devices} />

            <Button
              className="w-full"
              disabled={!isNative || isSyncingAll}
              onClick={() => syncAll(devices)}
            >
              {isSyncingAll ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {t('devices.sync.syncAll')}
            </Button>

            <div className="space-y-2">
              {devices.map((device) => {
                const status = statusByDevice[device.id];
                const isBusy = status === 'scanning' || status === 'connecting' || status === 'syncing';
                const hcStatus = healthConnectStatusByDevice[device.id];
                const hcNotInstalled = hcStatus === 'NotInstalled';

                return (
                  <div
                    key={device.id}
                    className="rounded-lg border p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {statusIcon(status)}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{device.device_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {device.last_sync
                              ? t('devices.sync.lastSynced', { time: new Date(device.last_sync).toLocaleString() })
                              : statusLabel(status)}
                          </p>
                        </div>
                      </div>
                      <TooltipProvider>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!isNative || isBusy || isSyncingAll}
                                onClick={() => syncOne(device)}
                              >
                                {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('devices.sync.syncOne')}</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            {/* span wrapper: a disabled button fires no pointer events, so
                                Radix would never show the tooltip explaining why. */}
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={!isNative || isBusy || isSyncingAll || !device.health_source}
                                  onClick={() => syncOneViaHealthConnect(device)}
                                >
                                  {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartPulse className="h-4 w-4" />}
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {device.health_source
                                  ? t('devices.sync.healthConnect.tooltip')
                                  : t(
                                      'devices.sync.healthSource.unmappedWarning',
                                      'Pick the app that publishes this device to sync it from Health Connect.'
                                    )}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </div>

                    {isNative && !hcNotInstalled && (
                      <HealthSourcePicker
                        deviceId={device.id}
                        deviceName={device.device_name}
                        value={device.health_source}
                        takenBy={takenBy}
                        personId={selectedPersonId}
                        disabled={isBusy || isSyncingAll}
                      />
                    )}

                    {hcNotInstalled && (
                      <div className="flex items-center justify-between gap-2 rounded-md bg-warning/10 border border-warning/30 p-2 text-xs">
                        <span className="text-muted-foreground">{t('devices.sync.healthConnect.notInstalled')}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7"
                          onClick={() => window.open(HEALTH_CONNECT_PLAY_STORE_URL, '_system')}
                        >
                          {t('devices.sync.healthConnect.installAction')}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
