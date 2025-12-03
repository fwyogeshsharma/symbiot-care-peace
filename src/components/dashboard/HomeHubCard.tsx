import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { de, es, fr, frCA, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

// Map language codes to date-fns locales
const getDateLocale = (language: string) => {
  const localeMap: Record<string, Locale> = {
    'en': enUS,
    'de': de,
    'es': es,
    'fr': fr,
    'fr-CA': frCA,
  };
  return localeMap[language] || enUS;
};

interface HomeHubCardProps {
  selectedPersonId: string | null;
}

const HomeHubCard = ({ selectedPersonId }: HomeHubCardProps) => {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);

  // Translate data type names
  const formatDataType = (dataType: string) => {
    const translated = t(`dataTypes.${dataType}`, { defaultValue: '' });
    if (translated) return translated;
    // Fallback to formatted string
    return dataType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Translate data values (status values, booleans)
  const formatDataValue = (value: any) => {
    if (typeof value === 'object' && value !== null) {
      if (value.value !== undefined) {
        // Check if it's a status value
        const strValue = String(value.value).toLowerCase();
        const statusTranslation = t(`dataValues.${strValue}`, { defaultValue: '' });
        if (statusTranslation) return statusTranslation;
        return String(value.value);
      }
      return JSON.stringify(value);
    }
    if (typeof value === 'boolean') {
      return value ? t('common.yes') : t('common.no');
    }
    // Check if string value is a known status
    const strValue = String(value).toLowerCase();
    const statusTranslation = t(`dataValues.${strValue}`, { defaultValue: '' });
    if (statusTranslation) return statusTranslation;
    return String(value);
  };

  // Translate units
  const formatUnit = (unit: string) => {
    const translated = t(`units.${unit}`, { defaultValue: '' });
    return translated || unit;
  };

  const { data: hubData, isLoading } = useQuery({
    queryKey: ['home-hub-data', selectedPersonId],
    queryFn: async () => {
      if (!selectedPersonId) return [];

      const { data, error } = await supabase
        .from('device_data')
        .select(`
          *,
          devices!inner(device_name, device_type, device_types!inner(category))
        `)
        .eq('elderly_person_id', selectedPersonId)
        .eq('devices.device_type', 'smart_home')
        .order('recorded_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedPersonId,
  });

  const { data: hubDevices } = useQuery({
    queryKey: ['home-hub-devices', selectedPersonId],
    queryFn: async () => {
      if (!selectedPersonId) return [];

      const { data, error } = await supabase
        .from('devices')
        .select(`
          *,
          device_types(*)
        `)
        .eq('elderly_person_id', selectedPersonId)
        .eq('device_type', 'smart_home')
        .eq('status', 'active');

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedPersonId,
  });

  const getConnectionStatus = () => {
    if (!hubData || hubData.length === 0) {
      return { status: 'offline', label: t('homeHub.offline'), color: 'text-muted-foreground', icon: WifiOff };
    }

    const latestDataTime = new Date(hubData[0].recorded_at).getTime();
    const now = new Date().getTime();
    const minutesSinceLastData = (now - latestDataTime) / 1000 / 60;

    if (minutesSinceLastData < 15) {
      return { status: 'online', label: t('homeHub.online'), color: 'text-success', icon: Wifi };
    } else if (minutesSinceLastData < 60) {
      return { status: 'idle', label: t('homeHub.idle'), color: 'text-warning', icon: Wifi };
    } else {
      return { status: 'offline', label: t('homeHub.offline'), color: 'text-muted-foreground', icon: WifiOff };
    }
  };


  if (!selectedPersonId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            {t('homeHub.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            {t('homeHub.selectPerson')}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            {t('homeHub.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const connectionStatus = getConnectionStatus();
  const hasData = hubData && hubData.length > 0;
  const hasDevices = hubDevices && hubDevices.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            {t('homeHub.title')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <connectionStatus.icon className={cn("w-4 h-4", connectionStatus.color)} />
            <Badge variant={connectionStatus.status === 'online' ? 'default' : 'secondary'}>
              {connectionStatus.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasDevices ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              {t('homeHub.noDeviceRegistered')}
            </p>
          </div>
        ) : !hasData ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              {t('homeHub.noDataAvailable')}
            </p>
          </div>
        ) : (
          <>
            {/* Device Info */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">{t('homeHub.deviceInformation')}</h4>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('homeHub.deviceName')}:</span>
                  <span className="font-medium">{hubDevices[0]?.device_name || t('homeHub.unknown')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('homeHub.deviceId')}:</span>
                  <span className="font-mono text-xs">{hubDevices[0]?.device_id || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('homeHub.lastUpdated')}:</span>
                  <span className="font-medium">
                    {formatDistanceToNow(new Date(hubData[0].recorded_at), { addSuffix: true, locale: dateLocale })}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h4 className="font-semibold mb-3">{t('homeHub.recentActivity')}</h4>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {hubData.slice(0, 8).map((item: any, index: number) => (
                  <div
                    key={item.id}
                    className={cn(
                      "border rounded-lg p-3 transition-all duration-200",
                      "hover:bg-muted/50",
                      index === 0 && "border-primary/50 bg-primary/5"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm mb-1">
                          {formatDataType(item.data_type)}
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">
                          {formatDistanceToNow(new Date(item.recorded_at), { addSuffix: true, locale: dateLocale })}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{t('homeHub.value')}:</span>
                          <span className="text-sm font-mono font-semibold">
                            {formatDataValue(item.value)}
                          </span>
                          {item.unit && (
                            <span className="text-xs text-muted-foreground">{formatUnit(item.unit)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default HomeHubCard;
