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

  // Calculate timing statistics
  const takenOnTime = medicationLogs.filter(log => {
    if (log.status !== 'taken' || !log.taken_at) return false;
    const scheduledTime = new Date(log.scheduled_time);
    const takenTime = new Date(log.taken_at);
    const diffMinutes = Math.abs(differenceInMinutes(takenTime, scheduledTime));
    return diffMinutes <= 30; // Within 30 minutes
  }).length;

  const takenLate = medicationLogs.filter(log => {
    if (log.status !== 'taken' || !log.taken_at) return false;
    const scheduledTime = new Date(log.scheduled_time);
    const takenTime = new Date(log.taken_at);
    const diffMinutes = differenceInMinutes(takenTime, scheduledTime);
    return diffMinutes > 30;
  }).length;

  const takenEarly = medicationLogs.filter(log => {
    if (log.status !== 'taken' || !log.taken_at) return false;
    const scheduledTime = new Date(log.scheduled_time);
    const takenTime = new Date(log.taken_at);
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
    .filter(log => log.status === 'taken' && log.taken_at)
    .map(log => {
      const scheduledTime = new Date(log.scheduled_time);
      const takenTime = new Date(log.taken_at);
      const delayMinutes = differenceInMinutes(takenTime, scheduledTime);
      return {
        date: format(scheduledTime, 'dMMM'),
        hour: scheduledTime.getHours(),
        delay: delayMinutes,
        medicationName: log.medications?.name || 'Unknown',
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

  if (isLoading) {
    return <div className="text-center py-8">{t('common.loading', { defaultValue: 'Loading...' })}</div>;
  }

  if (medicationLogs.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">{t('common.noData', { defaultValue: 'No data available' })}</p>
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
            <CardTitle className="text-sm font-medium">On-Time Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onTimeRate}%</div>
            <p className="text-xs text-muted-foreground">
              Within 30 min window
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Delay</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgDelay > 0 ? `+${avgDelay}` : avgDelay} min
            </div>
            <p className="text-xs text-muted-foreground">
              {avgDelay <= 0 ? 'Early/On time' : 'Behind schedule'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taken Late</CardTitle>
            <AlertCircle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{takenLate}</div>
            <p className="text-xs text-muted-foreground">
              &gt;30 min after schedule
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Schedule Consistency</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{consistencyScore}%</div>
            <p className="text-xs text-muted-foreground">
              {consistencyScore >= 80 ? 'Good' : 'Needs improvement'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time of Day Compliance */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance by Time of Day</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={timeOfDayArray}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timeSlot" angle={-20} textAnchor="end" height={100} />
              <YAxis label={{ value: 'Doses', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="taken" fill="#10b981" name="Taken" />
              <Bar dataKey="missed" fill="#ef4444" name="Missed" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Timing Delays Trend */}
      {dailyDelays.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Average Daily Timing Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyDelays}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="avgDelay" stroke="#3b82f6" strokeWidth={2} name="Avg Delay (min)" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="maxDelay" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Max Delay (min)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Timing Distribution */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Timing Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg bg-success/10">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span className="font-medium">On Time</span>
                </div>
                <Badge variant="default">{takenOnTime} doses</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-warning/10">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-warning" />
                  <span className="font-medium">Taken Late</span>
                </div>
                <Badge variant="warning">{takenLate} doses</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-info/10">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-info" />
                  <span className="font-medium">Taken Early</span>
                </div>
                <Badge variant="secondary">{takenEarly} doses</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-destructive/10">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <span className="font-medium">Missed</span>
                </div>
                <Badge variant="destructive">{missed} doses</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timing Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                <p>
                  {onTimeRate >= 80
                    ? 'Excellent schedule adherence! Medications are consistently taken within the recommended time window.'
                    : onTimeRate >= 60
                    ? 'Good timing consistency, but there is room for improvement in schedule adherence.'
                    : 'Schedule adherence needs attention. Consider setting medication reminders.'}
                </p>
              </div>

              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                <p>
                  {avgDelay > 60
                    ? `Average delay of ${avgDelay} minutes suggests systematic timing issues. Review daily routine alignment with medication schedule.`
                    : avgDelay > 30
                    ? 'Minor delays detected. Medication reminders may help maintain schedule.'
                    : avgDelay >= 0
                    ? 'Medications are taken on time or slightly delayed, which is acceptable.'
                    : 'Medications are often taken early. Ensure this is safe and recommended by healthcare provider.'}
                </p>
              </div>

              {timeOfDayArray.some((slot: any) => {
                const total = slot.taken + slot.missed;
                return total > 0 && (slot.missed / total) > 0.3;
              }) && (
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-warning mt-1.5" />
                  <p>
                    Certain times of day show higher miss rates. Review and adjust medication schedule if needed.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
