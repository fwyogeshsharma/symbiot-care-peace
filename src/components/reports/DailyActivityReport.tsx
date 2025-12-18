import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { Footprints, Activity as ActivityIcon, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DailyActivityReportProps {
  selectedPerson: string;
  dateRange: { from: Date; to: Date };
}

export const DailyActivityReport = ({ selectedPerson, dateRange }: DailyActivityReportProps) => {
  const { t } = useTranslation();

  const { data: activityData = [], isLoading } = useQuery({
    queryKey: ['activity-report', selectedPerson, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('device_data')
        .select('*')
        .in('data_type', ['steps', 'activity'])
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

  // Process data by day
  const dailyData = activityData.reduce((acc: any[], item) => {
    const date = format(new Date(item.recorded_at), 'MMM dd');
    const existingEntry = acc.find(entry => entry.date === date);

    let value = item.value;
    if (typeof value === 'object' && value !== null) {
      if ('count' in value) value = value.count;
      else if ('steps' in value) value = value.steps;
      else if ('value' in value) value = value.value;
    }

    if (item.data_type === 'steps') {
      if (existingEntry) {
        existingEntry.steps = (existingEntry.steps || 0) + Number(value);
      } else {
        acc.push({ date, steps: Number(value), activity: 0 });
      }
    } else if (item.data_type === 'activity') {
      if (existingEntry) {
        existingEntry.activity += 1;
      } else {
        acc.push({ date, steps: 0, activity: 1 });
      }
    }

    return acc;
  }, []);

  // Calculate statistics
  const totalSteps = dailyData.reduce((sum, day) => sum + (day.steps || 0), 0);
  const avgStepsPerDay = dailyData.length > 0 ? Math.round(totalSteps / dailyData.length) : 0;
  const mostActiveDay = dailyData.reduce((max, day) =>
    (day.steps > (max?.steps || 0)) ? day : max, dailyData[0]
  );

  if (isLoading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  if (activityData.length === 0) {
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.content.totalSteps')}</CardTitle>
            <Footprints className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSteps.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.content.avgDailySteps')}</CardTitle>
            <ActivityIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgStepsPerDay.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {t('reports.content.targetSteps')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.content.mostActiveDay')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mostActiveDay?.date || t('reports.content.notAvailable')}</div>
            <p className="text-xs text-muted-foreground">
              {mostActiveDay?.steps.toLocaleString() || 0} {t('reports.content.steps')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.content.dailyStepCount')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="steps" fill="#10b981" name={t('reports.content.totalSteps')} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Activity Level Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.content.activityLevelAnalysis')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dailyData.map((day, index) => {
              const level = day.steps >= 8000 ? t('reports.content.good') : day.steps >= 4000 ? t('reports.content.fair') : t('reports.content.low');
              const levelKey = day.steps >= 8000 ? 'good' : day.steps >= 4000 ? 'fair' : 'low';
              const color = levelKey === 'good' ? 'text-success' : levelKey === 'fair' ? 'text-warning' : 'text-destructive';
              return (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm">{day.date}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">{day.steps.toLocaleString()} {t('reports.content.steps')}</span>
                    <span className={`text-sm font-semibold ${color}`}>{level}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
