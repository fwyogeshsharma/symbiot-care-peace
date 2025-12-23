import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, User, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { de, es, fr, frCA, enUS, Locale } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { PanicSosCharts } from './PanicSosCharts';
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

interface PanicSosEventsProps {
  selectedPersonId?: string | null;
}

const PanicSosEvents = ({ selectedPersonId }: PanicSosEventsProps) => {
  const [showCharts, setShowCharts] = useState(false);
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);

  // Function to translate device name based on device type
  const getTranslatedDeviceName = (deviceName: string | undefined) => {
    if (!deviceName) return '';
    // Create a normalized key from device name (lowercase, replace spaces with underscores)
    const normalizedKey = deviceName.toLowerCase().replace(/\s+/g, '_');
    // Try to find a translation, fallback to original name
    const translated = t(`devices.names.${normalizedKey}`, { defaultValue: '' });
    return translated || deviceName;
  };

  // Function to translate status
  const getTranslatedStatus = (status: string | undefined) => {
    if (!status) return t('panicSos.status.alert');
    const translatedStatus = t(`panicSos.status.${status.toLowerCase()}`, { defaultValue: '' });
    return translatedStatus || status;
  };

  const { data: panicEvents, isLoading } = useQuery({
    queryKey: ['panic-sos-events', selectedPersonId],
    queryFn: async () => {
      // Get events from the last 1 week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      let query = supabase
        .from('device_data')
        .select(`
          id,
          recorded_at,
          value,
          data_type,
          device_id,
          devices!inner(
            device_name,
            device_type,
            elderly_person_id,
            elderly_persons(full_name)
          )
        `)
        .eq('devices.device_type', 'emergency_button')
        .gte('recorded_at', oneWeekAgo.toISOString())
        .order('recorded_at', { ascending: false });

      if (selectedPersonId) {
        query = query.eq('elderly_person_id', selectedPersonId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const getSeverityColor = (value: any) => {
    const val = value as any;
    if (val?.status === 'critical') return 'border-destructive text-destructive';
    if (val?.status === 'emergency') return 'border-warning text-warning';
    return 'border-primary text-primary';
  };

  const getEventDescription = (value: any) => {
    const val = value as any;
    if (val?.message) return val.message;
    if (val?.type === 'fall_detected') return t('panicSos.descriptions.fallDetected');
    if (val?.button_pressed) return t('panicSos.descriptions.sosPressed');
    return t('panicSos.descriptions.emergency');
  };

  if (isLoading) {
    return (
      <Card className="p-4 overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h3 className="text-sm font-semibold flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <span className="truncate">{t('panicSos.title')}</span>
          </h3>
        </div>
        <div className="py-4 text-muted-foreground text-sm">
          {t('panicSos.loading')}
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-4 overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h3 className="text-sm font-semibold flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <span className="truncate">{t('panicSos.title')}</span>
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            {panicEvents && panicEvents.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCharts(true)}
                  className="gap-1 h-7 text-xs"
                >
                  <TrendingUp className="h-3 w-3" />
                  <span className="hidden sm:inline">{t('panicSos.viewCharts')}</span>
                </Button>
                <Badge variant="outline" className="text-xs whitespace-nowrap">
                  {panicEvents.length}
                </Badge>
              </>
            )}
          </div>
        </div>

      {!panicEvents || panicEvents.length === 0 ? (
        <div className="flex items-center gap-3 py-4">
          <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-muted-foreground text-sm">
              {t('panicSos.noEvents')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('panicSos.noEventsHint')}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
          {panicEvents.map((event) => {
            const device = event.devices as any;
            const elderlyPerson = device?.elderly_persons as any;
            const eventValue = event.value as any;

            return (
              <div
                key={event.id}
                className="border rounded-lg p-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-2 flex-1">
                    <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {getEventDescription(eventValue)}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span className="truncate">
                          {elderlyPerson?.full_name || t('panicSos.unknown')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${getSeverityColor(eventValue)} text-xs shrink-0`}
                  >
                    {getTranslatedStatus(eventValue?.status)}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>
                    {formatDistanceToNow(new Date(event.recorded_at), {
                      addSuffix: true,
                      locale: dateLocale,
                    })}
                  </span>
                </div>

                {device?.device_name && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {t('panicSos.device')}: {getTranslatedDeviceName(device.device_name)}
                  </p>
                )}
              </div>
            );
          })}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground hover:text-foreground"
            onClick={() => setShowCharts(true)}
          >
            {t('panicSos.showMore')}
          </Button>
        </div>
      )}
      </Card>

      <PanicSosCharts 
        open={showCharts}
        onOpenChange={setShowCharts}
        selectedPersonId={selectedPersonId}
      />
    </>
  );
};

export default PanicSosEvents;
