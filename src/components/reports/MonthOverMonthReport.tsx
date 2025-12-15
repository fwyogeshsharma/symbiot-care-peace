import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, isWithinInterval, differenceInDays } from 'date-fns';
import { TrendingUp, TrendingDown, Activity, Heart, Moon, Footprints, ArrowRight, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';

interface MonthOverMonthReportProps {
  selectedPerson: string;
  dateRange: { from: Date; to: Date };
}

export const MonthOverMonthReport = ({ selectedPerson, dateRange }: MonthOverMonthReportProps) => {
  const { t } = useTranslation();

  const { data: healthData = [], isLoading } = useQuery({
    queryKey: ['month-over-month-report', selectedPerson, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('device_data')
        .select('*')
        .in('data_type', [
          'heart_rate', 'oxygen_saturation', 'steps', 'sleep_quality',
          'blood_pressure', 'blood_sugar', 'glucose', 'activity_level'
        ])
        .gte('recorded_at', dateRange.from.toISOString())
        .lte('recorded_at', dateRange.to.toISOString())
        .order('recorded_at', { ascending: true });

      if (selectedPerson !== 'all') {
        query = query.eq('elderly_person_id', selectedPerson);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const extractValue = (value: any, field?: string) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && value !== null) {
      if (field && field in value) return Number(value[field]);
      if ('value' in value) return Number(value.value);
    }
    return Number(value) || 0;
  };

  // Get all months in the date range
  const months = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });

  // Calculate metrics for each month
  const monthlyData = months.map((monthStart) => {
    const monthEnd = endOfMonth(monthStart);

    const monthData = healthData.filter(d => {
      const recordDate = new Date(d.recorded_at);
      return isWithinInterval(recordDate, { start: monthStart, end: monthEnd });
    });

    const heartRateData = monthData.filter(d => d.data_type === 'heart_rate');
    const o2Data = monthData.filter(d => d.data_type === 'oxygen_saturation');
    const stepsData = monthData.filter(d => d.data_type === 'steps');
    const sleepData = monthData.filter(d => d.data_type === 'sleep_quality');
    const glucoseData = monthData.filter(d => d.data_type === 'blood_sugar' || d.data_type === 'glucose');

    return {
      month: format(monthStart, 'MMM yyyy'),
      monthStart,
      monthEnd,
      heartRate: heartRateData.length > 0
        ? Math.round(heartRateData.reduce((sum, d) => sum + extractValue(d.value), 0) / heartRateData.length)
        : 0,
      oxygenSat: o2Data.length > 0
        ? Math.round(o2Data.reduce((sum, d) => sum + extractValue(d.value), 0) / o2Data.length)
        : 0,
      steps: stepsData.length > 0
        ? Math.round(stepsData.reduce((sum, d) => sum + extractValue(d.value), 0) / stepsData.length)
        : 0,
      totalSteps: stepsData.reduce((sum, d) => sum + extractValue(d.value), 0),
      sleepQuality: sleepData.length > 0
        ? Math.round(sleepData.reduce((sum, d) => sum + extractValue(d.value, 'quality'), 0) / sleepData.length)
        : 0,
      sleepDuration: sleepData.length > 0
        ? (sleepData.reduce((sum, d) => sum + extractValue(d.value, 'duration'), 0) / sleepData.length).toFixed(1)
        : 0,
      glucose: glucoseData.length > 0
        ? Math.round(glucoseData.reduce((sum, d) => sum + extractValue(d.value), 0) / glucoseData.length)
        : 0,
      dataPoints: monthData.length,
    };
  });

  // Calculate month-over-month changes
  const comparisons = monthlyData.slice(1).map((currentMonth, index) => {
    const previousMonth = monthlyData[index];

    return {
      currentMonth: currentMonth.month,
      previousMonth: previousMonth.month,
      heartRateChange: currentMonth.heartRate - previousMonth.heartRate,
      heartRatePercent: previousMonth.heartRate !== 0
        ? ((currentMonth.heartRate - previousMonth.heartRate) / previousMonth.heartRate * 100)
        : 0,
      oxygenChange: currentMonth.oxygenSat - previousMonth.oxygenSat,
      oxygenPercent: previousMonth.oxygenSat !== 0
        ? ((currentMonth.oxygenSat - previousMonth.oxygenSat) / previousMonth.oxygenSat * 100)
        : 0,
      stepsChange: currentMonth.steps - previousMonth.steps,
      stepsPercent: previousMonth.steps !== 0
        ? ((currentMonth.steps - previousMonth.steps) / previousMonth.steps * 100)
        : 0,
      sleepChange: currentMonth.sleepQuality - previousMonth.sleepQuality,
      sleepPercent: previousMonth.sleepQuality !== 0
        ? ((currentMonth.sleepQuality - previousMonth.sleepQuality) / previousMonth.sleepQuality * 100)
        : 0,
      glucoseChange: currentMonth.glucose - previousMonth.glucose,
      glucosePercent: previousMonth.glucose !== 0
        ? ((currentMonth.glucose - previousMonth.glucose) / previousMonth.glucose * 100)
        : 0,
    };
  });

  // Calculate average changes
  const avgChanges = {
    heartRate: comparisons.length > 0
      ? comparisons.reduce((sum, c) => sum + c.heartRatePercent, 0) / comparisons.length
      : 0,
    oxygen: comparisons.length > 0
      ? comparisons.reduce((sum, c) => sum + c.oxygenPercent, 0) / comparisons.length
      : 0,
    steps: comparisons.length > 0
      ? comparisons.reduce((sum, c) => sum + c.stepsPercent, 0) / comparisons.length
      : 0,
    sleep: comparisons.length > 0
      ? comparisons.reduce((sum, c) => sum + c.sleepPercent, 0) / comparisons.length
      : 0,
    glucose: comparisons.length > 0
      ? comparisons.reduce((sum, c) => sum + c.glucosePercent, 0) / comparisons.length
      : 0,
  };

  const getTrendIcon = (value: number) => {
    if (value > 3) return <TrendingUp className="h-4 w-4 text-success" />;
    if (value < -3) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <ArrowRight className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 3) return 'text-success';
    if (value < -3) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const getBadgeVariant = (value: number) => {
    if (value > 3) return 'default';
    if (value < -3) return 'destructive';
    return 'secondary';
  };

  if (isLoading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  if (healthData.length === 0 || monthlyData.length < 2) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="flex flex-col items-center gap-4">
            <Calendar className="w-16 h-16 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Insufficient Data</h3>
              <p className="text-muted-foreground">
                At least 2 months of data is required for month-over-month comparison.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Extend your date range to include multiple months.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Overview */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Long-term Health Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Comparing {monthlyData.length} months of health data to identify long-term patterns
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Heart Rate</span>
                {getTrendIcon(avgChanges.heartRate)}
              </div>
              <Badge variant={getBadgeVariant(avgChanges.heartRate)}>
                {avgChanges.heartRate > 0 ? '+' : ''}{avgChanges.heartRate.toFixed(1)}%
              </Badge>
            </div>

            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Oxygen</span>
                {getTrendIcon(avgChanges.oxygen)}
              </div>
              <Badge variant={getBadgeVariant(avgChanges.oxygen)}>
                {avgChanges.oxygen > 0 ? '+' : ''}{avgChanges.oxygen.toFixed(1)}%
              </Badge>
            </div>

            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Activity</span>
                {getTrendIcon(avgChanges.steps)}
              </div>
              <Badge variant={getBadgeVariant(avgChanges.steps)}>
                {avgChanges.steps > 0 ? '+' : ''}{avgChanges.steps.toFixed(1)}%
              </Badge>
            </div>

            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Sleep</span>
                {getTrendIcon(avgChanges.sleep)}
              </div>
              <Badge variant={getBadgeVariant(avgChanges.sleep)}>
                {avgChanges.sleep > 0 ? '+' : ''}{avgChanges.sleep.toFixed(1)}%
              </Badge>
            </div>

            {avgChanges.glucose !== 0 && (
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Blood Sugar</span>
                  {getTrendIcon(avgChanges.glucose)}
                </div>
                <Badge variant={getBadgeVariant(avgChanges.glucose)}>
                  {avgChanges.glucose > 0 ? '+' : ''}{avgChanges.glucose.toFixed(1)}%
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Vitals Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Vital Signs Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="heartRate" stroke="#ef4444" name="Heart Rate (BPM)" strokeWidth={3} />
              <Line yAxisId="right" type="monotone" dataKey="oxygenSat" stroke="#3b82f6" name="Oxygen Sat (%)" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Activity & Sleep Patterns</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" label={{ value: 'Avg Daily Steps', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" label={{ value: 'Sleep Quality (%)', angle: 90, position: 'insideRight' }} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="steps" fill="#10b981" name="Average Steps" />
              <Bar yAxisId="right" dataKey="sleepQuality" fill="#8b5cf6" name="Sleep Quality (%)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Statistics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Summary Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Month</th>
                  <th className="text-center p-2">Heart Rate</th>
                  <th className="text-center p-2">Oxygen</th>
                  <th className="text-center p-2">Avg Steps</th>
                  <th className="text-center p-2">Sleep</th>
                  {monthlyData.some(m => m.glucose > 0) && (
                    <th className="text-center p-2">Glucose</th>
                  )}
                  <th className="text-center p-2">Readings</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((month, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{month.month}</td>
                    <td className="text-center p-2">{month.heartRate > 0 ? `${month.heartRate} BPM` : '-'}</td>
                    <td className="text-center p-2">{month.oxygenSat > 0 ? `${month.oxygenSat}%` : '-'}</td>
                    <td className="text-center p-2">{month.steps > 0 ? month.steps.toLocaleString() : '-'}</td>
                    <td className="text-center p-2">{month.sleepQuality > 0 ? `${month.sleepQuality}%` : '-'}</td>
                    {monthlyData.some(m => m.glucose > 0) && (
                      <td className="text-center p-2">{month.glucose > 0 ? `${month.glucose} mg/dL` : '-'}</td>
                    )}
                    <td className="text-center p-2">{month.dataPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Month-by-Month Changes */}
      <Card>
        <CardHeader>
          <CardTitle>Month-by-Month Changes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {comparisons.map((comp, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <span className="font-medium text-lg">{comp.previousMonth}</span>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium text-lg">{comp.currentMonth}</span>
                </div>

                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium">Heart Rate</span>
                      </div>
                      {getTrendIcon(comp.heartRatePercent)}
                    </div>
                    <div className={`text-xl font-bold ${getTrendColor(comp.heartRatePercent)}`}>
                      {comp.heartRateChange > 0 ? '+' : ''}{comp.heartRateChange} BPM
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {comp.heartRatePercent > 0 ? '+' : ''}{comp.heartRatePercent.toFixed(1)}%
                    </p>
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Oxygen</span>
                      </div>
                      {getTrendIcon(comp.oxygenPercent)}
                    </div>
                    <div className={`text-xl font-bold ${getTrendColor(comp.oxygenPercent)}`}>
                      {comp.oxygenChange > 0 ? '+' : ''}{comp.oxygenChange}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {comp.oxygenPercent > 0 ? '+' : ''}{comp.oxygenPercent.toFixed(1)}%
                    </p>
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Footprints className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Activity</span>
                      </div>
                      {getTrendIcon(comp.stepsPercent)}
                    </div>
                    <div className={`text-xl font-bold ${getTrendColor(comp.stepsPercent)}`}>
                      {comp.stepsChange > 0 ? '+' : ''}{comp.stepsChange}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {comp.stepsPercent > 0 ? '+' : ''}{comp.stepsPercent.toFixed(1)}% steps
                    </p>
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-medium">Sleep</span>
                      </div>
                      {getTrendIcon(comp.sleepPercent)}
                    </div>
                    <div className={`text-xl font-bold ${getTrendColor(comp.sleepPercent)}`}>
                      {comp.sleepChange > 0 ? '+' : ''}{comp.sleepChange}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {comp.sleepPercent > 0 ? '+' : ''}{comp.sleepPercent.toFixed(1)}% quality
                    </p>
                  </div>

                  {comp.glucoseChange !== 0 && (
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-orange-500" />
                          <span className="text-sm font-medium">Glucose</span>
                        </div>
                        {getTrendIcon(comp.glucosePercent)}
                      </div>
                      <div className={`text-xl font-bold ${getTrendColor(comp.glucosePercent)}`}>
                        {comp.glucoseChange > 0 ? '+' : ''}{comp.glucoseChange} mg/dL
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {comp.glucosePercent > 0 ? '+' : ''}{comp.glucosePercent.toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Long-term Insights */}
      <Card className="border-info">
        <CardHeader>
          <CardTitle>Long-term Insights & Patterns</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm">
            {avgChanges.heartRate > 5 && (
              <li className="text-warning">Heart rate showing upward trend over time - consult healthcare provider</li>
            )}
            {avgChanges.heartRate < -5 && (
              <li className="text-success">Heart rate improving consistently - cardiovascular health is trending positively</li>
            )}
            {avgChanges.steps > 15 && (
              <li className="text-success">Activity levels increasing month-over-month - excellent long-term progress</li>
            )}
            {avgChanges.steps < -15 && (
              <li className="text-destructive">Significant decline in activity - intervention may be needed</li>
            )}
            {avgChanges.sleep > 10 && (
              <li className="text-success">Sleep quality consistently improving - maintain current practices</li>
            )}
            {avgChanges.sleep < -10 && (
              <li className="text-warning">Sleep quality declining over time - investigate potential causes</li>
            )}
            <li>Month-over-month analysis reveals long-term trends that may not be visible in daily or weekly data</li>
            <li>Consistent patterns over multiple months suggest sustained lifestyle changes or health conditions</li>
            <li>Use these insights to guide discussions with healthcare providers about long-term care planning</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
