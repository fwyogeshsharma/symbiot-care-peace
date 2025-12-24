import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts';
import { format, differenceInMinutes, parseISO } from 'date-fns';
import { Clock, AlertCircle, CheckCircle2, Target, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';

interface MedicationTimingAnalysisReportProps {
  selectedPerson: string;
  dateRange: { from: Date; to: Date };
}

export const MedicationTimingAnalysisReport = ({ selectedPerson, dateRange }: MedicationTimingAnalysisReportProps) => {
  const { t } = useTranslation();

  const { data: medicationLogs = [], isLoading } = useQuery({
    queryKey: ['medication-timing-report', selectedPerson, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('medication_adherence_logs')
        .select('*, medications(*)')
        .gte('scheduled_time', dateRange.from.toISOString())
        .lte('scheduled_time', dateRange.to.toISOString())
        .order('scheduled_time', { ascending: true });

      if (selectedPerson !== 'all') {
        query = query.eq('elderly_person_id', selectedPerson);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate timing statistics - use 'timestamp' field instead of 'taken_at'
  const takenOnTime = medicationLogs.filter(log => {
    if (log.status !== 'taken' || !log.timestamp) return false;
    const scheduledTime = new Date(log.scheduled_time);
    const takenTime = new Date(log.timestamp);
    const diffMinutes = Math.abs(differenceInMinutes(takenTime, scheduledTime));
    return diffMinutes <= 30; // Within 30 minutes
  }).length;

  const takenLate = medicationLogs.filter(log => {
    if (log.status !== 'taken' || !log.timestamp) return false;
    const scheduledTime = new Date(log.scheduled_time);
    const takenTime = new Date(log.timestamp);
    const diffMinutes = differenceInMinutes(takenTime, scheduledTime);
    return diffMinutes > 30;
  }).length;

  const takenEarly = medicationLogs.filter(log => {
    if (log.status !== 'taken' || !log.timestamp) return false;
    const scheduledTime = new Date(log.scheduled_time);
    const takenTime = new Date(log.timestamp);
    const diffMinutes = differenceInMinutes(takenTime, scheduledTime);
    return diffMinutes < -30;
  }).length;

  const missed = medicationLogs.filter(log => log.status === 'missed').length;
  const total = medicationLogs.length;

  const onTimeRate = total > 0 ? Math.round((takenOnTime / total) * 100) : 0;

  // Group by time of day
  const timeOfDayData = medicationLogs.reduce((acc: any, log) => {
    const hour = new Date(log.scheduled_time).getHours();
    let timeSlot;
    if (hour >= 6 && hour < 9) timeSlot = 'Morning (6-9am)';
    else if (hour >= 9 && hour < 12) timeSlot = 'Late Morning (9-12pm)';
    else if (hour >= 12 && hour < 15) timeSlot = 'Afternoon (12-3pm)';
    else if (hour >= 15 && hour < 18) timeSlot = 'Late Afternoon (3-6pm)';
    else if (hour >= 18 && hour < 21) timeSlot = 'Evening (6-9pm)';
    else timeSlot = 'Night (9pm-6am)';

    if (!acc[timeSlot]) {
      acc[timeSlot] = { timeSlot, taken: 0, missed: 0 };
    }

    if (log.status === 'taken') acc[timeSlot].taken++;
    else if (log.status === 'missed') acc[timeSlot].missed++;

    return acc;
  }, {});

  const timeOfDayArray = Object.values(timeOfDayData);

  // Calculate average delay for taken medications
  const delaysData = medicationLogs
    .filter(log => log.status === 'taken' && log.timestamp)
    .map(log => {
      const scheduledTime = new Date(log.scheduled_time);
      const takenTime = new Date(log.timestamp);
      const delayMinutes = differenceInMinutes(takenTime, scheduledTime);
      return {
        date: format(scheduledTime, 'dMMM'),
        hour: scheduledTime.getHours(),
        delay: delayMinutes,
        medicationName: 'Medication',
      };
    });

  // Group delays by day
  const dailyDelays = delaysData.reduce((acc: any[], item) => {
    const existing = acc.find(d => d.date === item.date);
    if (existing) {
      existing.delays.push(item.delay);
    } else {
      acc.push({ date: item.date, delays: [item.delay] });
    }
    return acc;
  }, []).map(day => ({
    date: day.date,
    avgDelay: Math.round(day.delays.reduce((sum: number, d: number) => sum + d, 0) / day.delays.length),
    maxDelay: Math.max(...day.delays),
    minDelay: Math.min(...day.delays),
  }));

  const avgDelay = delaysData.length > 0
    ? Math.round(delaysData.reduce((sum, d) => sum + d.delay, 0) / delaysData.length)
    : 0;

  // Consistency score (percentage of medications taken within schedule window)
  const consistencyScore = onTimeRate;

  // Get detailed late medication records
  const lateMedications = medicationLogs
    .filter(log => {
      if (log.status !== 'taken' || !log.timestamp) return false;
      const scheduledTime = new Date(log.scheduled_time);
      const takenTime = new Date(log.timestamp);
      const diffMinutes = differenceInMinutes(takenTime, scheduledTime);
      return diffMinutes > 30;
    })
    .map(log => ({
      medicationName: log.medications?.name || 'Unknown Medication',
      scheduledTime: new Date(log.scheduled_time),
      takenTime: new Date(log.timestamp),
      delayMinutes: differenceInMinutes(new Date(log.timestamp), new Date(log.scheduled_time)),
    }))
    .sort((a, b) => b.delayMinutes - a.delayMinutes); // Sort by delay, longest first

  // Analyze late medication patterns
  const lateMedicationsByName = lateMedications.reduce((acc: any, med) => {
    const name = med.medicationName;
    if (!acc[name]) {
      acc[name] = { name, count: 0, totalDelay: 0 };
    }
    acc[name].count++;
    acc[name].totalDelay += med.delayMinutes;
    return acc;
  }, {});

  const lateMedicationPatterns = Object.values(lateMedicationsByName)
    .map((item: any) => ({
      name: item.name,
      count: item.count,
      avgDelay: Math.round(item.totalDelay / item.count),
    }))
    .sort((a: any, b: any) => b.count - a.count);

  if (isLoading) {
    return <div className="text-center py-8">{t('common.loading', { defaultValue: 'Loading...' })}</div>;
  }

  if (medicationLogs.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-lg font-medium mb-2">No Medication Timing Data Available</p>
          <p className="text-sm text-muted-foreground mb-4">
            No medication adherence logs found for the selected date range.
          </p>
          <div className="text-left max-w-md mx-auto bg-muted/30 rounded-lg p-4">
            <p className="text-xs font-medium mb-2">Troubleshooting:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Try expanding the date range (e.g., last 30 days)</li>
              <li>• Ensure medication logs have been recorded in this period</li>
              <li>• Check if the selected person has medication schedules</li>
              <li>• Verify medication adherence data exists in the system</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.content.onTime')}</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onTimeRate}%</div>
            <p className="text-xs text-muted-foreground">
              {t('reports.medicationTiming.within30Min')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.medicationTiming.avgDelayLabel')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgDelay > 0 ? `+${avgDelay}` : avgDelay} min
            </div>
            <p className="text-xs text-muted-foreground">
              {avgDelay <= 0 ? t('reports.medicationTiming.earlyOnTime') : t('reports.medicationTiming.behindSchedule')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.medicationTiming.takenLateLabel')}</CardTitle>
            <AlertCircle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{takenLate}</div>
            <p className="text-xs text-muted-foreground">
              {t('reports.medicationTiming.moreThan30Min')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.content.scheduleCompliance')}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{consistencyScore}%</div>
            <p className="text-xs text-muted-foreground">
              {consistencyScore >= 80 ? t('reports.medicationTiming.goodCompliance') : t('reports.medicationTiming.needsImprovement')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time of Day Compliance */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.medicationTiming.complianceByTimeOfDay')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={timeOfDayArray}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timeSlot" angle={-20} textAnchor="end" height={100} />
              <YAxis label={{ value: t('reports.medicationTiming.doses'), angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="taken" fill="#10b981" name={t('reports.medicationTiming.taken')} />
              <Bar dataKey="missed" fill="#ef4444" name={t('reports.medicationTiming.missedLabel')} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Timing Delays Trend */}
      {dailyDelays.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.medicationTiming.avgDailyTimingVariance')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyDelays}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: t('reports.medicationTiming.minutes'), angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="avgDelay" stroke="#3b82f6" strokeWidth={2} name={t('reports.medicationTiming.avgDelayMin')} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="maxDelay" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name={t('reports.medicationTiming.maxDelayMin')} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Timing Distribution */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.medicationTiming.timingDistribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg bg-success/10">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span className="font-medium">{t('reports.medicationTiming.onTimeLabel')}</span>
                </div>
                <Badge variant="default">{takenOnTime} {t('reports.medicationTiming.doses')}</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-warning/10">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-warning" />
                  <span className="font-medium">{t('reports.medicationTiming.takenLateLabel2')}</span>
                </div>
                <Badge variant="secondary" className="bg-amber-100 text-amber-800">{takenLate} {t('reports.medicationTiming.doses')}</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-info/10">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-info" />
                  <span className="font-medium">{t('reports.medicationTiming.takenEarlyLabel')}</span>
                </div>
                <Badge variant="secondary">{takenEarly} {t('reports.medicationTiming.doses')}</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-destructive/10">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <span className="font-medium">{t('reports.medicationTiming.missedLabel')}</span>
                </div>
                <Badge variant="destructive">{missed} {t('reports.medicationTiming.doses')}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('reports.medicationTiming.timingInsights')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                <p>
                  {onTimeRate >= 80
                    ? t('reports.medicationTiming.excellentAdherence')
                    : onTimeRate >= 60
                    ? t('reports.medicationTiming.goodConsistency')
                    : t('reports.medicationTiming.needsAttention')}
                </p>
              </div>

              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                <p>
                  {avgDelay > 60
                    ? `${avgDelay} ${t('reports.medicationTiming.minutes')} ${t('reports.medicationTiming.systematicIssues')}`
                    : avgDelay > 30
                    ? t('reports.medicationTiming.minorDelays')
                    : avgDelay >= 0
                    ? t('reports.medicationTiming.acceptable')
                    : t('reports.medicationTiming.takenEarly')}
                </p>
              </div>

              {timeOfDayArray.some((slot: any) => {
                const total = slot.taken + slot.missed;
                return total > 0 && (slot.missed / total) > 0.3;
              }) && (
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-warning mt-1.5" />
                  <p>
                    {t('reports.medicationTiming.higherMissRates')}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Late Medication Details */}
      {lateMedications.length > 0 && (
        <Card className="border-warning">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              {t('reports.medicationTiming.lateMedicationAnalysis')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t('reports.medicationTiming.lateMedicationDesc')}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Late Medication Patterns */}
              {lateMedicationPatterns.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">{t('reports.medicationTiming.medicationsFrequentlyLate')}</h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    {lateMedicationPatterns.slice(0, 4).map((pattern: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-warning/5">
                        <div>
                          <p className="font-medium">{pattern.name}</p>
                          <p className="text-xs text-muted-foreground">{t('reports.medicationTiming.avgDelay')}: {pattern.avgDelay} {t('reports.medicationTiming.minutes')}</p>
                        </div>
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                          {pattern.count} {t('reports.medicationTiming.timesLate')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Late Medication Records Table */}
              <div>
                <h4 className="font-medium mb-3">{t('reports.medicationTiming.recentLateMedications')}</h4>
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 grid grid-cols-12 gap-4 p-3 text-sm font-medium">
                    <div className="col-span-3">{t('reports.medicationTiming.medication')}</div>
                    <div className="col-span-3">{t('reports.medicationTiming.scheduledTime')}</div>
                    <div className="col-span-3">{t('reports.medicationTiming.takenTime')}</div>
                    <div className="col-span-3">{t('reports.medicationTiming.delay')}</div>
                  </div>
                  <div className="divide-y">
                    {lateMedications.slice(0, 10).map((med, index) => (
                      <div
                        key={index}
                        className={`grid grid-cols-12 gap-4 p-3 text-sm ${
                          index % 2 === 0 ? 'bg-muted/30' : 'bg-background'
                        }`}
                      >
                        <div className="col-span-3 font-medium">{med.medicationName}</div>
                        <div className="col-span-3 text-muted-foreground">
                          {format(med.scheduledTime, 'MMM dd, h:mm a')}
                        </div>
                        <div className="col-span-3 text-muted-foreground">
                          {format(med.takenTime, 'MMM dd, h:mm a')}
                        </div>
                        <div className="col-span-3">
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                            +{med.delayMinutes} min
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {lateMedications.length > 10 && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    {t('reports.medicationTiming.showing')} 10 {t('reports.medicationTiming.of')} {lateMedications.length} {t('reports.medicationTiming.lateMedicationRecords')}
                  </p>
                )}
              </div>

              {/* Recommendations */}
              <div className="bg-info/10 border border-info/30 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4 text-info" />
                  {t('reports.medicationTiming.recommendationsToImprove')}
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-info mt-1.5" />
                    <span>
                      <strong>{t('reports.medicationTiming.setUpReminders')}</strong> {t('reports.medicationTiming.setUpRemindersDesc')}
                    </span>
                  </li>
                  {lateMedicationPatterns.length > 0 && (
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-info mt-1.5" />
                      <span>
                        <strong>{t('reports.medicationTiming.focusOnFrequent')}</strong> {lateMedicationPatterns[0].name} {t('reports.medicationTiming.focusOnFrequentDesc')}
                      </span>
                    </li>
                  )}
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-info mt-1.5" />
                    <span>
                      <strong>{t('reports.medicationTiming.pillOrganizer')}</strong> {t('reports.medicationTiming.pillOrganizerDesc')}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-info mt-1.5" />
                    <span>
                      <strong>{t('reports.medicationTiming.linkToRoutine')}</strong> {t('reports.medicationTiming.linkToRoutineDesc')}
                    </span>
                  </li>
                  {avgDelay > 60 && (
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-warning mt-1.5" />
                      <span>
                        <strong>{t('reports.medicationTiming.consultProvider')}</strong> {t('reports.medicationTiming.consultProviderDesc', { delay: avgDelay })}
                      </span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
