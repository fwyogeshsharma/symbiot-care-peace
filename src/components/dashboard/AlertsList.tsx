import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { de, es, fr, frCA, enUS, Locale } from 'date-fns/locale';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();
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

  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('alerts')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate and refetch alerts
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      // Invalidate person health status to update their indicator (🔴→🟢)
      queryClient.invalidateQueries({ queryKey: ['person-health-status'] });
      toast({
        title: t('alerts.toasts.alertAcknowledgedTitle'),
        description: t('alerts.toasts.alertAcknowledgedDesc'),
      });
    },
    onError: () => {
      toast({
        title: t('alerts.toasts.error'),
        description: t('alerts.toasts.failedToAcknowledge'),
        variant: "destructive",
      });
    }
  });

  const handleAcknowledge = (alertId: string) => {
    acknowledgeMutation.mutate(alertId);
  };

  // Separate alerts by urgency
  const criticalAlerts = filteredAlerts.filter(a => a.severity === 'critical');
  const highPriorityAlerts = filteredAlerts.filter(a => a.severity === 'high');
  const otherAlerts = filteredAlerts.filter(a => !['critical', 'high'].includes(a.severity));

  return (
    <div className="space-y-3">
      {/* URGENT ATTENTION Section - Toned down to avoid competing with critical alerts strip */}
      {(criticalAlerts.length > 0 || highPriorityAlerts.length > 0) && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">
              Urgent Attention
            </h3>
            <Badge variant="secondary" className="text-xs">
              {criticalAlerts.length + highPriorityAlerts.length}
            </Badge>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {[...criticalAlerts, ...highPriorityAlerts].map((alert) => (
              <div
                key={alert.id}
                className="border rounded p-3 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
                    <h4 className="font-medium text-sm truncate">{t(`alerts.messages.${alert.alert_type}.title`, { defaultValue: alert.title })}</h4>
                  </div>
                  <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                    {t(`alerts.${alert.severity}`, { defaultValue: alert.severity })}
                  </Badge>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground truncate">
                    {alert.elderly_persons?.full_name || t('alerts.timeline.unknown')}
                  </p>

                  {alert.status === 'active' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => handleAcknowledge(alert.id)}
                      disabled={acknowledgeMutation.isPending}
                    >
                      {acknowledgeMutation.isPending ? 'Saving...' : 'Mark Handled'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ROUTINE MONITORING Section */}
      {otherAlerts.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Routine Monitoring
            </h3>
            <Badge variant="outline" className="text-xs">
              {otherAlerts.length}
            </Badge>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {otherAlerts.map((alert) => (
              <div
                key={alert.id}
                className="border rounded p-3 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <AlertTriangle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <h4 className="font-medium text-sm truncate">{t(`alerts.messages.${alert.alert_type}.title`, { defaultValue: alert.title })}</h4>
                  </div>
                  <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                    {t(`alerts.${alert.severity}`, { defaultValue: alert.severity })}
                  </Badge>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground truncate">
                    {alert.elderly_persons?.full_name || t('alerts.timeline.unknown')}
                  </p>

                  {alert.status === 'active' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => handleAcknowledge(alert.id)}
                      disabled={acknowledgeMutation.isPending}
                    >
                      {acknowledgeMutation.isPending ? 'Saving...' : 'Mark Handled'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* All Clear State - Compact */}
      {filteredAlerts.length === 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-success">All Clear</p>
              <p className="text-xs text-muted-foreground">No active alerts</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AlertsList;