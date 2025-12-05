import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, AlertCircle, MapPin, Battery, BatteryLow, BatteryFull, Wifi, WifiOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { de, es, fr, frCA, enUS, Locale } from 'date-fns/locale';
import { formatCoordinates } from '@/lib/gpsUtils';
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

interface SmartPhoneCardProps {
  selectedPersonId: string | null;
}

const SmartPhoneCard = ({ selectedPersonId }: SmartPhoneCardProps) => {
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

  const { data: phoneData, isLoading } = useQuery({
    queryKey: ['smart-phone-data', selectedPersonId],
    queryFn: async () => {
      if (!selectedPersonId) return [];

      const { data, error } = await supabase
        .from('device_data')
        .select(`
          *,
          devices!inner(device_name, device_type, device_types!inner(category))
        `)
        .eq('elderly_person_id', selectedPersonId)
        .eq('devices.device_type', 'smart_phone')
        .order('recorded_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedPersonId,
  });

  const { data: phoneDevices } = useQuery({
    queryKey: ['smart-phone-devices', selectedPersonId],
    queryFn: async () => {
      if (!selectedPersonId) return [];

      const { data, error } = await supabase
        .from('devices')
        .select(`
          *,
          device_types(*)
        `)
        .eq('elderly_person_id', selectedPersonId)
        .eq('device_type', 'smart_phone')
        .eq('status', 'active');

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedPersonId,
  });

  const getConnectionStatus = () => {
    if (!phoneData || phoneData.length === 0) {
      return { status: 'offline', label: t('smartPhone.offline'), color: 'text-muted-foreground', icon: WifiOff };
    }

    const latestDataTime = new Date(phoneData[0].recorded_at).getTime();
    const now = new Date().getTime();
    const minutesSinceLastData = (now - latestDataTime) / 1000 / 60;

    if (minutesSinceLastData < 5) {
      return { status: 'online', label: t('smartPhone.online'), color: 'text-success', icon: Wifi };
    } else if (minutesSinceLastData < 30) {
      return { status: 'idle', label: t('smartPhone.idle'), color: 'text-warning', icon: Wifi };
    } else {
      return { status: 'offline', label: t('smartPhone.offline'), color: 'text-muted-foreground', icon: WifiOff };
    }
  };

  const getLatestGPS = () => {
    return phoneData?.find(d => d.data_type === 'gps');
  };

  const getLatestBattery = () => {
    return phoneData?.find(d => d.data_type === 'battery_level');
  };

  const getBatteryIcon = (level: number | null) => {
    if (level === null) return Battery;
    if (level <= 20) return BatteryLow;
    return BatteryFull;
  };

  const getBatteryColor = (level: number | null) => {
    if (level === null) return 'text-muted-foreground';
    if (level <= 20) return 'text-destructive';
    if (level <= 50) return 'text-warning';
    return 'text-success';
  };


  if (!selectedPersonId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            {t('smartPhone.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            {t('smartPhone.selectPerson')}
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
            <Smartphone className="w-5 h-5" />
            {t('smartPhone.title')}
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
  const hasData = phoneData && phoneData.length > 0;
  const hasDevices = phoneDevices && phoneDevices.length > 0;
  const latestGPS = getLatestGPS();
  const latestBattery = getLatestBattery();

  const batteryLevel: number | null = latestBattery
    ? (typeof latestBattery.value === 'object' && latestBattery.value !== null 
        ? Number((latestBattery.value as Record<string, unknown>).value) || null
        : typeof latestBattery.value === 'number' ? latestBattery.value : null)
    : null;

  const BatteryIcon = getBatteryIcon(batteryLevel);
  const batteryColor = getBatteryColor(batteryLevel);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            {t('smartPhone.title')}
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
              {t('smartPhone.noDeviceRegistered')}
            </p>
          </div>
        ) : !hasData ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              {t('smartPhone.noDataAvailable')}
            </p>
          </div>
        ) : (
          <>
            {/* Device Info & Status */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">{t('smartPhone.deviceInformation')}</h4>
                {batteryLevel !== null && (
                  <div className="flex items-center gap-2">
                    <BatteryIcon className={cn("w-5 h-5", batteryColor)} />
                    <span className={cn("text-sm font-semibold", batteryColor)}>
                      {Math.round(batteryLevel)}%
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('smartPhone.deviceName')}:</span>
                  <span className="font-medium">{phoneDevices[0]?.device_name || t('smartPhone.unknown')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('smartPhone.deviceId')}:</span>
                  <span className="font-mono text-xs">{phoneDevices[0]?.device_id || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('smartPhone.lastUpdated')}:</span>
                  <span className="font-medium">
                    {formatDistanceToNow(new Date(phoneData[0].recorded_at), { addSuffix: true, locale: dateLocale })}
                  </span>
                </div>
              </div>
            </div>

            {/* GPS Location */}
            {latestGPS && (
              <div className="border rounded-lg p-4 bg-primary/5 border-primary/20">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold mb-2">{t('smartPhone.lastKnownLocation')}</h4>
                    {typeof latestGPS.value === 'object' && latestGPS.value !== null && (latestGPS.value as Record<string, unknown>).latitude && (latestGPS.value as Record<string, unknown>).longitude ? (
                      <>
                        <p className="text-sm font-mono mb-1">
                          {formatCoordinates((latestGPS.value as Record<string, number>).latitude, (latestGPS.value as Record<string, number>).longitude)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(latestGPS.recorded_at), { addSuffix: true, locale: dateLocale })}
                        </p>
                        {(latestGPS.value as Record<string, unknown>).accuracy && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('smartPhone.accuracy')}: ±{Math.round((latestGPS.value as Record<string, number>).accuracy)}m
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t('smartPhone.invalidGpsData')}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div>
              <h4 className="font-semibold mb-3">{t('smartPhone.recentActivity')}</h4>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {phoneData.slice(0, 10).map((item: any, index: number) => {
                  // Skip GPS data in list as it's shown above
                  if (item.data_type === 'gps') return null;

                  return (
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
                            <span className="text-xs text-muted-foreground">{t('smartPhone.value')}:</span>
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
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SmartPhoneCard;
