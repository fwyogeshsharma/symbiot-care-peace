import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, Clock, AlertTriangle, Pill } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format, formatDistanceToNow } from 'date-fns';
import { de, es, fr, frCA, enUS, Locale } from 'date-fns/locale';

const getDateLocale = (language: string): Locale => {
  const localeMap: Record<string, Locale> = {
    'en': enUS,
    'de': de,
    'es': es,
    'fr': fr,
    'fr-CA': frCA,
  };
  return localeMap[language] || enUS;
};

interface AdherenceLog {
  id: string;
  schedule_id: string;
  scheduled_time: string;
  timestamp: string;
  status: string;
  dispenser_confirmed: boolean;
  caregiver_alerted: boolean;
  notes: string | null;
  medication_schedules: {
    medication_name: string;
    dosage_mg: number | null;
    dosage_unit: string | null;
  };
}

interface MedicationAdherenceLogProps {
  elderlyPersonId: string;
  limit?: number;
}

export function MedicationAdherenceLog({ elderlyPersonId, limit = 20 }: MedicationAdherenceLogProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['medication-adherence-logs', elderlyPersonId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medication_adherence_logs')
        .select(`
          *,
          medication_schedules(medication_name, dosage_mg, dosage_unit)
        `)
        .eq('elderly_person_id', elderlyPersonId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as AdherenceLog[];
    },
    enabled: !!elderlyPersonId,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'taken':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'missed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'late':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'taken':
        return 'bg-success/10 text-success border-success/20';
      case 'missed':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'pending':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'late':
        return 'bg-warning/10 text-warning border-warning/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            {t('medication.adherence.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            {t('medication.adherence.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            {t('medication.adherence.noLogs')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill className="h-5 w-5" />
          {t('medication.adherence.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card/50"
            >
              {getStatusIcon(log.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">
                    {log.medication_schedules?.medication_name}
                  </span>
                  {log.medication_schedules?.dosage_mg && (
                    <span className="text-sm text-muted-foreground">
                      ({log.medication_schedules.dosage_mg} {log.medication_schedules.dosage_unit || 'mg'})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className={getStatusColor(log.status)}>
                    {t(`medication.adherence.status.${log.status}`, { defaultValue: log.status })}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {t('medication.adherence.scheduledFor')} {log.scheduled_time}
                  </span>
                  {log.dispenser_confirmed && (
                    <Badge variant="secondary" className="text-xs">
                      {t('medication.adherence.dispenserConfirmed')}
                    </Badge>
                  )}
                  {log.caregiver_alerted && (
                    <Badge variant="destructive" className="text-xs">
                      {t('medication.adherence.caregiverAlerted')}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true, locale: dateLocale })}
                  {' · '}
                  {format(new Date(log.timestamp), 'MMM d, HH:mm', { locale: dateLocale })}
                </p>
                {log.notes && (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    {log.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
