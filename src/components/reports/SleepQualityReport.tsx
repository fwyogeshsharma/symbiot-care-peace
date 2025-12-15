import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { Moon, Clock, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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

  const chartData = sleepData.map(item => ({
    date: format(new Date(item.recorded_at), 'MMM dd'),
    quality: extractValue(item.value, 'quality'),
    duration: extractValue(item.value, 'duration'),
  }));

  const avgQuality = sleepData.length > 0
    ? Math.round(sleepData.reduce((sum, item) => sum + extractValue(item.value, 'quality'), 0) / sleepData.length)
    : 0;

  const avgDuration = sleepData.length > 0
    ? (sleepData.reduce((sum, item) => sum + extractValue(item.value, 'duration'), 0) / sleepData.length).toFixed(1)
    : 0;

  const goodNights = sleepData.filter(item => extractValue(item.value, 'quality') >= 80).length;

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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Sleep Quality</CardTitle>
            <Moon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgQuality}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDuration}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Good Nights</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{goodNights}</div>
            <p className="text-xs text-muted-foreground">Quality ≥ 80%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sleep Quality Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" label={{ value: 'Quality (%)', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" label={{ value: 'Hours', angle: 90, position: 'insideRight' }} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="quality" fill="#8b5cf6" name="Quality (%)" />
              <Bar yAxisId="right" dataKey="duration" fill="#3b82f6" name="Duration (h)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
