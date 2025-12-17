import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format } from 'date-fns';
import { Moon, Clock, TrendingUp, AlertCircle, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Progress } from '@/components/ui/progress';

interface SleepQualityReportProps {
  selectedPerson: string;
  dateRange: { from: Date; to: Date };
}

export const SleepQualityReport = ({ selectedPerson, dateRange }: SleepQualityReportProps) => {
  const { t } = useTranslation();

  const { data: sleepData = [], isLoading } = useQuery({
    queryKey: ['sleep-quality-report', selectedPerson, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('device_data')
        .select('*')
        .eq('data_type', 'sleep_quality')
        .gte('recorded_at', dateRange.from.toISOString())
        .lte('recorded_at', dateRange.to.toISOString())
        .order('recorded_at', { ascending: true});

      if (selectedPerson !== 'all') {
        query = query.eq('elderly_person_id', selectedPerson);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const extractValue = (value: any, field: string = 'value') => {
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && value !== null) {
      return Number(value[field] || value.value || 0);
    }
    return Number(value) || 0;
  };

  // Group by day and aggregate
  const chartData = sleepData.reduce((acc: any[], item) => {
    const date = format(new Date(item.recorded_at), 'dMMM');
    const existing = acc.find(d => d.date === date);

    if (existing) {
      existing.qualityValues.push(extractValue(item.value, 'quality'));
      existing.durationValues.push(extractValue(item.value, 'duration'));
      existing.disturbances = (existing.disturbances || 0) + extractValue(item.value, 'disturbances');
    } else {
      acc.push({
        date,
        qualityValues: [extractValue(item.value, 'quality')],
        durationValues: [extractValue(item.value, 'duration')],
        disturbances: extractValue(item.value, 'disturbances'),
      });
    }
    return acc;
  }, []).map(item => ({
    date: item.date,
    quality: Math.round(item.qualityValues.reduce((a: number, b: number) => a + b, 0) / item.qualityValues.length),
    duration: parseFloat((item.durationValues.reduce((a: number, b: number) => a + b, 0) / item.durationValues.length).toFixed(1)),
    disturbances: Math.round(item.disturbances / item.qualityValues.length),
  }));

  const avgQuality = sleepData.length > 0
    ? Math.round(sleepData.reduce((sum, item) => sum + extractValue(item.value, 'quality'), 0) / sleepData.length)
    : 0;

  const avgDuration = sleepData.length > 0
    ? (sleepData.reduce((sum, item) => sum + extractValue(item.value, 'duration'), 0) / sleepData.length).toFixed(1)
    : 0;

  const avgDisturbances = sleepData.length > 0
    ? Math.round(sleepData.reduce((sum, item) => sum + extractValue(item.value, 'disturbances'), 0) / sleepData.length)
    : 0;

  const goodNights = sleepData.filter(item => extractValue(item.value, 'quality') >= 80).length;
  const poorNights = sleepData.filter(item => extractValue(item.value, 'quality') < 60).length;

  const sleepEfficiency = avgDuration && Number(avgDuration) > 0
    ? Math.round((Number(avgDuration) / 8) * 100)
    : 0;

  if (isLoading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  if (sleepData.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">{t('common.noData')}</p>
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
            <CardTitle className="text-sm font-medium">Avg Sleep Quality</CardTitle>
            <Moon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgQuality}%</div>
            <Progress value={avgQuality} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {avgQuality >= 80 ? 'Excellent' : avgQuality >= 60 ? 'Good' : 'Needs Improvement'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDuration}h</div>
            <Progress value={sleepEfficiency} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {Number(avgDuration) >= 7 ? 'Target met' : 'Below recommended'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sleep Efficiency</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sleepEfficiency}%</div>
            <p className="text-xs text-muted-foreground mt-2">
              Of 8h target
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Disturbances</CardTitle>
            <AlertCircle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDisturbances}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Per night
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quality and Duration Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sleep Quality Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-success" />
                  Good Nights (≥80%)
                </span>
                <span className="text-lg font-bold text-success">{goodNights}</span>
              </div>
              <Progress value={(goodNights / sleepData.length) * 100} className="h-2" />

              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  Poor Nights (&lt;60%)
                </span>
                <span className="text-lg font-bold text-warning">{poorNights}</span>
              </div>
              <Progress value={(poorNights / sleepData.length) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sleep Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span>
                  {Number(avgDuration) >= 7 && Number(avgDuration) <= 9
                    ? 'Sleep duration is within recommended range (7-9 hours)'
                    : Number(avgDuration) < 7
                    ? 'Consider increasing sleep duration for better health'
                    : 'Sleep duration exceeds typical recommendations'}
                </span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span>
                  {avgDisturbances <= 2
                    ? 'Sleep disturbances are minimal'
                    : 'Frequent sleep disturbances may affect quality'}
                </span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span>
                  {avgQuality >= 80
                    ? 'Excellent sleep quality maintained'
                    : 'Focus on improving sleep hygiene'}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sleep Quality Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorQuality" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} label={{ value: 'Quality (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Area type="monotone" dataKey="quality" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorQuality)" name="Sleep Quality (%)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Duration and Disturbances Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sleep Duration & Disturbances</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" label={{ value: 'Disturbances', angle: 90, position: 'insideRight' }} />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="duration" stroke="#3b82f6" strokeWidth={2} name="Duration (h)" dot={{ r: 4 }} />
              <Line yAxisId="right" type="monotone" dataKey="disturbances" stroke="#f59e0b" strokeWidth={2} name="Disturbances" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
