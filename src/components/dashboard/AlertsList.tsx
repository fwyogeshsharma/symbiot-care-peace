import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { de, es, fr, frCA, enUS, Locale } from 'date-fns/locale';

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

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  elderly_person_id: string;
  elderly_persons?: { full_name: string };
}

interface AlertsListProps {
  alerts: Alert[];
  selectedPersonId?: string | null;
}

const AlertsList = ({ alerts, selectedPersonId }: AlertsListProps) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const dateLocale = getDateLocale(i18n.language);
  
  // Filter alerts based on selected person
  const filteredAlerts = selectedPersonId 
    ? alerts.filter(alert => alert.elderly_person_id === selectedPersonId)
    : alerts;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-destructive';
      case 'high':
        return 'bg-warning';
      case 'medium':
        return 'bg-accent';
      case 'low':
        return 'bg-muted';
      default:
        return 'bg-muted';
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    const { error } = await supabase
      .from('alerts')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', alertId);

    if (error) {
      toast({
        title: t('alerts.toasts.error'),
        description: t('alerts.toasts.failedToAcknowledge'),
        variant: "destructive",
      });
    } else {
      toast({
        title: t('alerts.toasts.alertAcknowledgedTitle'),
        description: t('alerts.toasts.alertAcknowledgedDesc'),
      });
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          {t('alerts.list.activeAlerts')} {selectedPersonId && t('alerts.list.filtered')}
        </h3>
        <Badge variant="outline" className="animate-pulse-soft">
          {filteredAlerts.length} {t('alerts.list.active')}
        </Badge>
      </div>

      {filteredAlerts.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
          <p className="text-muted-foreground">{t('alerts.allClear')}</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  <h4 className="font-semibold">{t(`alerts.messages.${alert.alert_type}.title`, { defaultValue: alert.title })}</h4>
                </div>
                <Badge className={`${getSeverityColor(alert.severity)} capitalize text-xs`}>
                  {t(`alerts.${alert.severity}`, { defaultValue: alert.severity })}
                </Badge>
              </div>

              {alert.description && (
                <p className="text-sm text-muted-foreground mb-2">{t(`alerts.messages.${alert.alert_type}.description`, { defaultValue: alert.description })}</p>
              )}

              <div className="flex items-center justify-between mt-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {alert.elderly_persons?.full_name || t('alerts.timeline.unknown')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(alert.created_at), 'MMM d, yyyy HH:mm:ss', { locale: dateLocale })}
                  </p>
                </div>

                {alert.status === 'active' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAcknowledge(alert.id)}
                  >
                    {t('alerts.actions.acknowledge')}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default AlertsList;