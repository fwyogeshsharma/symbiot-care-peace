import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format, startOfWeek, endOfWeek, eachWeekOfInterval, isWithinInterval } from 'date-fns';
import { TrendingUp, TrendingDown, Activity, Heart, Moon, Footprints, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';

interface WeekOverWeekReportProps {
  selectedPerson: string;
  dateRange: { from: Date; to: Date };
}

export const WeekOverWeekReport = ({ selectedPerson, dateRange }: WeekOverWeekReportProps) => {
  const { t } = useTranslation();

  const { data: healthData = [], isLoading } = useQuery({
    queryKey: ['week-over-week-report', selectedPerson, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('device_data')
        .select('*')
        .in('data_type', [
          'heart_rate', 'oxygen_saturation', 'steps', 'sleep_quality',
          'blood_pressure', 'blood_sugar', 'glucose'
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

  // Get all weeks in the date range
  const weeks = eachWeekOfInterval({ start: dateRange.from, end: dateRange.to }, { weekStartsOn: 1 });

  // Calculate metrics for each week
  const weeklyData = weeks.map((weekStart) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

    const weekData = healthData.filter(d => {
      const recordDate = new Date(d.recorded_at);
      return isWithinInterval(recordDate, { start: weekStart, end: weekEnd });
    });

    const heartRateData = weekData.filter(d => d.data_type === 'heart_rate');
    const o2Data = weekData.filter(d => d.data_type === 'oxygen_saturation');
    const stepsData = weekData.filter(d => d.data_type === 'steps');
    const sleepData = weekData.filter(d => d.data_type === 'sleep_quality');

    return {
      week: format(weekStart, 'MMM dd'),
      weekStart,
      weekEnd,
      heartRate: heartRateData.length > 0
        ? Math.round(heartRateData.reduce((sum, d) => sum + extractValue(d.value), 0) / heartRateData.length)
        : 0,
      oxygenSat: o2Data.length > 0
        ? Math.round(o2Data.reduce((sum, d) => sum + extractValue(d.value), 0) / o2Data.length)
        : 0,
      steps: stepsData.length > 0
        ? Math.round(stepsData.reduce((sum, d) => sum + extractValue(d.value), 0) / stepsData.length)
        : 0,
      sleepQuality: sleepData.length > 0
        ? Math.round(sleepData.reduce((sum, d) => sum + extractValue(d.value, 'quality'), 0) / sleepData.length)
        : 0,
    };
  });

  // Calculate week-over-week changes
  const comparisons = weeklyData.slice(1).map((currentWeek, index) => {
    const previousWeek = weeklyData[index];

    return {
      currentWeek: currentWeek.week,
      previousWeek: previousWeek.week,
      heartRateChange: currentWeek.heartRate - previousWeek.heartRate,
      heartRatePercent: previousWeek.heartRate !== 0
        ? ((currentWeek.heartRate - previousWeek.heartRate) / previousWeek.heartRate * 100)
        : 0,
      oxygenChange: currentWeek.oxygenSat - previousWeek.oxygenSat,
      oxygenPercent: previousWeek.oxygenSat !== 0
        ? ((currentWeek.oxygenSat - previousWeek.oxygenSat) / previousWeek.oxygenSat * 100)
        : 0,
      stepsChange: currentWeek.steps - previousWeek.steps,
      stepsPercent: previousWeek.steps !== 0
        ? ((currentWeek.steps - previousWeek.steps) / previousWeek.steps * 100)
        : 0,
      sleepChange: currentWeek.sleepQuality - previousWeek.sleepQuality,
      sleepPercent: previousWeek.sleepQuality !== 0
        ? ((currentWeek.sleepQuality - previousWeek.sleepQuality) / previousWeek.sleepQuality * 100)
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
  };

  const getTrendIcon = (value: number) => {
    if (value > 2) return <TrendingUp className="h-4 w-4 text-success" />;
    if (value < -2) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <ArrowRight className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 2) return 'text-success';
    if (value < -2) return 'text-destructive';
    return 'text-muted-foreground';
  };

  if (isLoading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  if (healthData.length === 0 || weeklyData.length < 2) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="flex flex-col items-center gap-4">
            <Activity className="w-16 h-16 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Insufficient Data</h3>
              <p className="text-muted-foreground">
                At least 2 weeks of data is required for week-over-week comparison.
              </p>
            </div>
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
            <CardTitle className="text-sm font-medium">Heart Rate Trend</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getTrendIcon(avgChanges.heartRate)}
              <span className={`text-2xl font-bold ${getTrendColor(avgChanges.heartRate)}`}>
                {avgChanges.heartRate > 0 ? '+' : ''}{avgChanges.heartRate.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Average weekly change</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Oxygen Trend</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getTrendIcon(avgChanges.oxygen)}
              <span className={`text-2xl font-bold ${getTrendColor(avgChanges.oxygen)}`}>
                {avgChanges.oxygen > 0 ? '+' : ''}{avgChanges.oxygen.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Average weekly change</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Activity Trend</CardTitle>
            <Footprints className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getTrendIcon(avgChanges.steps)}
              <span className={`text-2xl font-bold ${getTrendColor(avgChanges.steps)}`}>
                {avgChanges.steps > 0 ? '+' : ''}{avgChanges.steps.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Average weekly change</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sleep Trend</CardTitle>
            <Moon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getTrendIcon(avgChanges.sleep)}
              <span className={`text-2xl font-bold ${getTrendColor(avgChanges.sleep)}`}>
                {avgChanges.sleep > 0 ? '+' : ''}{avgChanges.sleep.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Average weekly change</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Metrics Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Metrics Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" angle={-45} textAnchor="end" height={80} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="heartRate" stroke="#ef4444" name="Heart Rate (BPM)" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="oxygenSat" stroke="#3b82f6" name="Oxygen Sat (%)" strokeWidth={2} />
              <Line yAxisId="left" type="monotone" dataKey="sleepQuality" stroke="#8b5cf6" name="Sleep Quality (%)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Steps Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Activity Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis label={{ value: 'Average Daily Steps', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="steps" fill="#10b981" name="Steps" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Week-by-Week Changes */}
      <Card>
        <CardHeader>
          <CardTitle>Week-by-Week Changes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {comparisons.map((comp, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-medium">{comp.previousWeek}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{comp.currentWeek}</span>
                </div>

                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span className="text-sm">Heart Rate</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(comp.heartRatePercent)}
                      <span className={`text-sm font-bold ${getTrendColor(comp.heartRatePercent)}`}>
                        {comp.heartRateChange > 0 ? '+' : ''}{comp.heartRateChange}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Oxygen</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(comp.oxygenPercent)}
                      <span className={`text-sm font-bold ${getTrendColor(comp.oxygenPercent)}`}>
                        {comp.oxygenChange > 0 ? '+' : ''}{comp.oxygenChange}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      <Footprints className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Steps</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(comp.stepsPercent)}
                      <span className={`text-sm font-bold ${getTrendColor(comp.stepsPercent)}`}>
                        {comp.stepsChange > 0 ? '+' : ''}{comp.stepsChange}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">Sleep</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(comp.sleepPercent)}
                      <span className={`text-sm font-bold ${getTrendColor(comp.sleepPercent)}`}>
                        {comp.sleepChange > 0 ? '+' : ''}{comp.sleepChange}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card className="border-info">
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm">
            {avgChanges.heartRate > 5 && (
              <li className="text-warning">Heart rate showing upward trend - monitor stress levels and activity</li>
            )}
            {avgChanges.heartRate < -5 && (
              <li className="text-success">Heart rate improving - cardiovascular health trending positively</li>
            )}
            {avgChanges.steps > 10 && (
              <li className="text-success">Activity levels increasing - excellent progress in physical activity</li>
            )}
            {avgChanges.steps < -10 && (
              <li className="text-warning">Activity levels declining - consider ways to increase daily movement</li>
            )}
            {avgChanges.sleep > 5 && (
              <li className="text-success">Sleep quality improving - maintain current sleep hygiene practices</li>
            )}
            {avgChanges.sleep < -5 && (
              <li className="text-warning">Sleep quality declining - review sleep environment and routine</li>
            )}
            <li>Week-over-week analysis helps identify short-term trends and patterns</li>
            <li>Consistent monitoring enables early intervention when metrics decline</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
