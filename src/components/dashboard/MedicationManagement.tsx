import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Pill, Settings, CheckCircle2, XCircle, Clock, AlertTriangle, FileText } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isBefore, startOfDay, parseISO, isSameDay, addDays } from 'date-fns';
import { de, es, fr, frCA, enUS, hi, Locale } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Map language codes to date-fns locales
const getDateLocale = (language: string): Locale => {
  const localeMap: Record<string, Locale> = {
    'en': enUS,
    'de': de,
    'es': es,
    'fr': fr,
    'fr-CA': frCA,
    'hi': hi,
  };
  return localeMap[language] || enUS;
};

// Generate localized weekday names (short format)
const getLocalizedWeekdays = (locale: Locale): string[] => {
  const weekdays: string[] = [];
  // Start from Sunday (0) to Saturday (6)
  for (let i = 0; i < 7; i++) {
    // Create a date that falls on the correct day of week
    // Jan 4, 2024 is a Thursday, so we calculate offset
    const date = new Date(2024, 0, 7 + i); // Jan 7, 2024 is Sunday
    weekdays.push(format(date, 'EEE', { locale }));
  }
  return weekdays;
};

interface MedicationSchedule {
  id: string;
  medication_name: string;
  dosage_mg: number | null;
  dosage_unit: string | null;
  frequency: string;
  times: string[];
  start_date: string;
  end_date: string | null;
  instructions: string | null;
  is_active: boolean;
}

interface AdherenceLog {
  id: string;
  schedule_id: string;
  scheduled_time: string;
  timestamp: string;
  status: string; // taken | missed | pending | late
}

interface MedicationManagementProps {
  selectedPersonId: string | null;
}

interface DayMedicationInfo {
  medications: {
    name: string;
    dosage: string;
    times: string[];
    statuses: { time: string; status: string }[];
  }[];
  allTaken: boolean;
  anyMissed: boolean;
  hasMedications: boolean;
}

export const MedicationManagement = ({ selectedPersonId }: MedicationManagementProps) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dateLocale = getDateLocale(i18n.language);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch medication schedules
  const { data: schedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ['medication-schedules', selectedPersonId],
    queryFn: async () => {
      if (!selectedPersonId) return [];

      const { data, error } = await supabase
        .from('medication_schedules')
        .select('*')
        .eq('elderly_person_id', selectedPersonId)
        .eq('is_active', true);

      if (error) throw error;
      return data as MedicationSchedule[];
    },
    enabled: !!selectedPersonId,
    refetchInterval: 30000,
  });

  // Fetch adherence logs for the current month
  const { data: adherenceLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['medication-adherence-logs', selectedPersonId, format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      if (!selectedPersonId) return [];

      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      const { data, error } = await supabase
        .from('medication_adherence_logs')
        .select('*')
        .eq('elderly_person_id', selectedPersonId)
        .gte('timestamp', monthStart.toISOString())
        .lte('timestamp', monthEnd.toISOString());

      if (error) throw error;
      return data as AdherenceLog[];
    },
    enabled: !!selectedPersonId,
    refetchInterval: 30000,
  });

  const isLoading = schedulesLoading || logsLoading;

  // Calculate days in the current month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [currentMonth]);

  // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = useMemo(() => {
    return startOfMonth(currentMonth).getDay();
  }, [currentMonth]);

  // Get localized weekday names
  const weekDays = useMemo(() => getLocalizedWeekdays(dateLocale), [dateLocale]);

  // Calculate the next upcoming dose
  const nextDose = useMemo(() => {
    if (!schedules || schedules.length === 0) return null;

    const now = new Date();
    const today = startOfDay(now);
    let nextDoseInfo: {
      medication: MedicationSchedule;
      time: string;
      dateTime: Date;
    } | null = null;

    // Check today and the next 7 days for the next dose
    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
      const checkDate = addDays(today, dayOffset);

      for (const schedule of schedules) {
        const startDate = parseISO(schedule.start_date);
        const endDate = schedule.end_date ? parseISO(schedule.end_date) : null;

        // Check if schedule is active on this date
        if (isBefore(checkDate, startOfDay(startDate))) continue;
        if (endDate && isBefore(startOfDay(endDate), checkDate)) continue;

        // For weekly frequency, check if it's the right day of week
        if (schedule.frequency === 'weekly') {
          if (checkDate.getDay() !== startDate.getDay()) continue;
        }

        // Check each scheduled time
        for (const time of schedule.times) {
          const [hours, minutes] = time.split(':').map(Number);
          const doseDateTime = new Date(checkDate);
          doseDateTime.setHours(hours, minutes, 0, 0);

          // Skip if this time has already passed
          if (doseDateTime <= now) continue;

          // Check if this is earlier than current next dose
          if (!nextDoseInfo || doseDateTime < nextDoseInfo.dateTime) {
            nextDoseInfo = {
              medication: schedule,
              time,
              dateTime: doseDateTime,
            };
          }
        }
      }

      // If we found a dose for today or this day, we can stop
      if (nextDoseInfo && dayOffset === 0) break;
    }

    return nextDoseInfo;
  }, [schedules]);

  // Build medication info for each day
  const getMedicationInfoForDay = (date: Date): DayMedicationInfo => {
    if (!schedules || schedules.length === 0) {
      return { medications: [], allTaken: false, anyMissed: false, hasMedications: false };
    }

    const dayStart = startOfDay(date);
    const today = startOfDay(new Date());

    // Filter schedules active on this date
    const activeMedications = schedules.filter(schedule => {
      const startDate = parseISO(schedule.start_date);
      const endDate = schedule.end_date ? parseISO(schedule.end_date) : null;

      // Check if this date is within the schedule range
      if (isBefore(dayStart, startOfDay(startDate))) return false;
      if (endDate && isBefore(startOfDay(endDate), dayStart)) return false;

      // For weekly frequency, check if it's the right day of week
      if (schedule.frequency === 'weekly') {
        return dayStart.getDay() === startDate.getDay();
      }

      return true;
    });

    if (activeMedications.length === 0) {
      return { medications: [], allTaken: false, anyMissed: false, hasMedications: false };
    }

    // Get adherence logs for this specific date
    const dayLogs = adherenceLogs?.filter(log => {
      const logDate = parseISO(log.timestamp);
      return isSameDay(logDate, date);
    }) || [];

    const medications = activeMedications.map(schedule => {
      const dosage = schedule.dosage_mg
        ? `${schedule.dosage_mg} ${schedule.dosage_unit || 'mg'}`
        : '';

      // Match logs to scheduled times
      const statuses = schedule.times.map(time => {
        const matchingLog = dayLogs.find(log =>
          log.schedule_id === schedule.id && log.scheduled_time === time
        );

        // If date is in the future, status is pending
        if (isBefore(today, dayStart)) {
          return { time, status: 'pending' };
        }

        // If no log found and date is past/today, check if it should be marked
        if (!matchingLog) {
          // If today and time hasn't passed yet, pending
          if (isSameDay(dayStart, today)) {
            const [hours, minutes] = time.split(':').map(Number);
            const scheduledTime = new Date(date);
            scheduledTime.setHours(hours, minutes, 0, 0);
            if (scheduledTime > new Date()) {
              return { time, status: 'pending' };
            }
          }
          // Past time with no log = potentially missed
          return { time, status: 'unknown' };
        }

        return { time, status: matchingLog.status };
      });

      return {
        name: schedule.medication_name,
        dosage,
        times: schedule.times,
        statuses,
      };
    });

    // Determine overall status for the day
    const allStatuses = medications.flatMap(m => m.statuses.map(s => s.status));
    const anyMissed = allStatuses.some(s => s === 'missed');
    const allTaken = allStatuses.length > 0 &&
      allStatuses.every(s => s === 'taken') &&
      !isBefore(today, dayStart);

    return {
      medications,
      allTaken,
      anyMissed,
      hasMedications: medications.length > 0,
    };
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'taken':
        return <CheckCircle2 className="h-3 w-3 text-green-600" />;
      case 'missed':
        return <XCircle className="h-3 w-3 text-red-600" />;
      case 'late':
        return <AlertTriangle className="h-3 w-3 text-yellow-600" />;
      case 'pending':
        return <Clock className="h-3 w-3 text-blue-500" />;
      default:
        return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'taken':
        return t('medication.taken');
      case 'missed':
        return t('medication.missed');
      case 'late':
        return t('medication.adherence.status.late');
      case 'pending':
        return t('medication.adherence.status.pending');
      default:
        return '-';
    }
  };

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
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Pill className="h-5 w-5 text-primary shrink-0" />
            {t('medication.title')}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/medication-config')}
            title={t('medication.config.title')}
            className="w-fit"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Next Dose Section */}
        {nextDose && (
          <div className="bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">{t('medication.nextDose')}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-base">{nextDose.medication.medication_name}</p>
                  {nextDose.medication.dosage_mg && (
                    <p className="text-sm text-muted-foreground">
                      {nextDose.medication.dosage_mg} {nextDose.medication.dosage_unit || 'mg'}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">{nextDose.time}</p>
                  <p className="text-xs text-muted-foreground">
                    {isToday(nextDose.dateTime)
                      ? t('medication.calendar.today', 'Today')
                      : format(nextDose.dateTime, 'EEE, MMM d', { locale: dateLocale })}
                  </p>
                </div>
              </div>
              {nextDose.medication.instructions && (
                <div className="flex items-start gap-2 pt-2 border-t border-border/50">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground italic">
                    {nextDose.medication.instructions}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No next dose message */}
        {schedules && schedules.length > 0 && !nextDose && (
          <div className="bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-border/50">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">
                {t('medication.calendar.noUpcomingDoses', 'No upcoming doses scheduled')}
              </span>
            </div>
          </div>
        )}

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
          </span>
          <Button variant="ghost" size="sm" onClick={() => navigateMonth('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar Legend */}
        <div className="flex items-center justify-center gap-4 mb-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>{t('medication.calendar.allTaken', 'All Taken')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>{t('medication.calendar.missed', 'Missed')}</span>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekDays.map((day, index) => (
            <div key={index} className="text-center text-xs text-muted-foreground font-medium py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before the first of month */}
          {Array.from({ length: firstDayOfWeek }).map((_, index) => (
            <div key={`empty-${index}`} className="h-8" />
          ))}

          {/* Calendar days */}
          {calendarDays.map(day => {
            const medicationInfo = getMedicationInfoForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isDayToday = isToday(day);

            // Determine background color based on medication status
            let bgColorClass = '';
            if (medicationInfo.hasMedications) {
              if (medicationInfo.anyMissed) {
                bgColorClass = 'bg-red-500/20 hover:bg-red-500/30';
              } else if (medicationInfo.allTaken) {
                bgColorClass = 'bg-green-500/20 hover:bg-green-500/30';
              }
            }

            return (
              <HoverCard key={day.toISOString()} openDelay={200} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <button
                    className={cn(
                      'h-8 w-full rounded-md text-sm font-medium transition-colors',
                      'flex items-center justify-center',
                      isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50',
                      isDayToday && 'ring-2 ring-primary ring-offset-1',
                      bgColorClass || 'hover:bg-accent',
                      medicationInfo.hasMedications && 'cursor-pointer'
                    )}
                  >
                    {format(day, 'd')}
                  </button>
                </HoverCardTrigger>

                {medicationInfo.hasMedications && (
                  <HoverCardContent
                    className="w-72 p-3"
                    side="top"
                    align="center"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">
                          {format(day, 'EEEE, MMM d', { locale: dateLocale })}
                        </span>
                        {medicationInfo.allTaken && (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            {t('medication.calendar.allTaken', 'All Taken')}
                          </span>
                        )}
                        {medicationInfo.anyMissed && (
                          <span className="flex items-center gap-1 text-xs text-red-600">
                            <XCircle className="h-3 w-3" />
                            {t('medication.calendar.someMissed', 'Some Missed')}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {medicationInfo.medications.map((med, idx) => (
                          <div
                            key={idx}
                            className="bg-card/50 rounded-md p-2 border border-border/50"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">{med.name}</span>
                              {med.dosage && (
                                <span className="text-xs text-muted-foreground">{med.dosage}</span>
                              )}
                            </div>
                            <div className="space-y-1">
                              {med.statuses.map((s, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="flex items-center justify-between text-xs"
                                >
                                  <span className="text-muted-foreground">
                                    {t('medication.calendar.scheduledAt', 'Scheduled at')} {s.time}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    {getStatusIcon(s.status)}
                                    <span className={cn(
                                      s.status === 'taken' && 'text-green-600',
                                      s.status === 'missed' && 'text-red-600',
                                      s.status === 'late' && 'text-yellow-600',
                                      s.status === 'pending' && 'text-blue-500'
                                    )}>
                                      {getStatusText(s.status)}
                                    </span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </HoverCardContent>
                )}
              </HoverCard>
            );
          })}
        </div>

        {/* No medications message */}
        {(!schedules || schedules.length === 0) && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            {t('medication.config.noSchedules')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
