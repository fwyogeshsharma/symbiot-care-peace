import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Pill, Clock, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { de, es, fr, frCA, enUS, Locale } from 'date-fns/locale';
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
import { extractBooleanValue } from '@/lib/valueExtractor';

interface MedicationManagementProps {
  selectedPersonId: string | null;
}

export const MedicationManagement = ({ selectedPersonId }: MedicationManagementProps) => {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const { data: medicationData, isLoading } = useQuery({
    queryKey: ['medication-data', selectedPersonId],
    queryFn: async () => {
      if (!selectedPersonId) return null;

      const { data, error } = await supabase
        .from('device_data')
        .select('*, devices!inner(*, device_types(category))')
        .in('devices.device_type', ['medication_dispenser', 'medication'])
        .eq('elderly_person_id', selectedPersonId)
        .order('recorded_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!selectedPersonId,
    refetchInterval: 10000,
  });

  if (!selectedPersonId) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            {t('medication.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('medication.selectPerson')}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            {t('medication.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Helper to check if medication was taken
  const isMedicationTaken = (value: any): boolean => {
    const boolValue = extractBooleanValue(value, 'medication_taken');
    if (boolValue !== null) return boolValue;
    // Handle string values like "Yes"/"No"
    if (typeof value === 'string') {
      return value.toLowerCase() === 'yes' || value.toLowerCase() === 'true';
    }
    return false;
  };

  // Helper to extract next dose time
  const extractNextDoseTime = (value: any): string | null => {
    if (!value && value !== 0) return null;

    let rawValue = value;
    // Handle object with value property
    if (typeof value === 'object' && value.value !== undefined) {
      rawValue = value.value;
    }

    // Handle numeric hour values (e.g., 23 -> "23:00")
    if (typeof rawValue === 'number') {
      const hour = rawValue;
      if (hour >= 0 && hour <= 23) {
        return `${hour.toString().padStart(2, '0')}:00`;
      }
      return String(rawValue);
    }

    return String(rawValue);
  };

  // Process medication data
  const medicationTakenData = medicationData?.filter(d => d.data_type === 'medication_taken') || [];
  const nextDoseData = medicationData?.find(d => d.data_type === 'next_dose_time');

  // Calculate compliance rate (last 7 days)
  const last7Days = medicationTakenData.slice(0, 21); // Assuming 3 doses per day
  const takenCount = last7Days.filter(d => isMedicationTaken(d.value)).length;
  const complianceRate = last7Days.length > 0 ? Math.round((takenCount / last7Days.length) * 100) : 0;

  // Get today's doses
  const todayDoses = medicationTakenData.filter(d => isToday(parseISO(d.recorded_at)));

  // Get latest status
  const latestDose = medicationTakenData[0];
  const nextDoseTime = extractNextDoseTime(nextDoseData?.value);

  // Get recent doses (last 5)
  const recentDoses = medicationTakenData.slice(0, 5);

  const getComplianceColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600 dark:text-green-400';
    if (rate >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-primary" />
          {t('medication.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Compliance Overview */}
        <div className="bg-card/50 backdrop-blur-sm rounded-lg p-4 border border-primary/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-base font-semibold">{t('medication.compliance')}</span>
            </div>
            <span className={`text-xl font-bold ${getComplianceColor(complianceRate)}`}>
              {complianceRate}%
            </span>
          </div>
          <div className="w-full bg-secondary/20 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                complianceRate >= 90
                  ? 'bg-green-600'
                  : complianceRate >= 70
                  ? 'bg-yellow-600'
                  : 'bg-red-600'
              }`}
              style={{ width: `${complianceRate}%` }}
            />
          </div>
        </div>

        {/* Current Status */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-primary/10">
            <div className="flex items-center gap-2 mb-1">
              {latestDose && isMedicationTaken(latestDose.value) ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              )}
              <span className="text-xs text-muted-foreground">{t('medication.latestDose')}</span>
            </div>
            <p className="text-sm font-semibold">
              {latestDose && isMedicationTaken(latestDose.value) ? t('medication.taken') : t('medication.missed')}
            </p>
            {latestDose && (
              <p className="text-xs text-muted-foreground mt-1">
                {format(parseISO(latestDose.recorded_at), 'HH:mm', { locale: dateLocale })}
              </p>
            )}
          </div>

          <div className="bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-primary/10">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">{t('medication.nextDose')}</span>
            </div>
            <p className="text-sm font-semibold">
              {nextDoseTime ? (
                // Check if it's already formatted time (e.g., "5:30 AM") or ISO timestamp
                nextDoseTime.includes(':') && !nextDoseTime.includes('T')
                  ? nextDoseTime
                  : (() => {
                      try {
                        return format(parseISO(nextDoseTime), 'HH:mm', { locale: dateLocale });
                      } catch {
                        return nextDoseTime;
                      }
                    })()
              ) : t('medication.notScheduled')}
            </p>
            {nextDoseTime && nextDoseTime.includes('T') && (
              <p className="text-xs text-muted-foreground mt-1">
                {(() => {
                  try {
                    return format(parseISO(nextDoseTime), 'MMM d', { locale: dateLocale });
                  } catch {
                    return '';
                  }
                })()}
              </p>
            )}
          </div>
        </div>

        {/* Today's Summary */}
        <div className="bg-card/50 backdrop-blur-sm rounded-lg p-4 border border-primary/10">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Pill className="h-4 w-4 text-primary" />
            {t('medication.todaysDoses')}
          </h4>
          {todayDoses.length > 0 ? (
            <div className="flex items-center gap-2">
              {todayDoses.map((dose, idx) => (
                <div
                  key={idx}
                  className={`flex-1 h-2 rounded-full ${
                    isMedicationTaken(dose.value)
                      ? 'bg-green-600'
                      : 'bg-orange-600'
                  }`}
                  title={`${format(parseISO(dose.recorded_at), 'HH:mm', { locale: dateLocale })} - ${isMedicationTaken(dose.value) ? t('medication.taken') : t('medication.missed')}`}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('medication.noDosesToday')}</p>
          )}
        </div>

        {/* Recent History */}
        <div className="bg-card/50 backdrop-blur-sm rounded-lg p-4 border border-primary/10">
          <h4 className="text-sm font-medium mb-3">{t('medication.recentActivity')}</h4>
          <div className="space-y-2">
            {recentDoses.length > 0 ? (
              recentDoses.map((dose, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    {isMedicationTaken(dose.value) ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                    )}
                    <span className={isMedicationTaken(dose.value) ? 'text-foreground' : 'text-muted-foreground'}>
                      {isMedicationTaken(dose.value) ? t('medication.taken') : t('medication.missed')}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(dose.recorded_at), 'MMM d, HH:mm', { locale: dateLocale })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{t('medication.noRecentActivity')}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
