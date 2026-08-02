import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { format } from 'date-fns';
import { Moon, Sunrise, Sunset, Brain, Activity as ActivityIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';

interface SleepPatternsReportProps {
  selectedPerson: string;
  dateRange: { from: Date; to: Date };
}

export const SleepPatternsReport = ({ selectedPerson, dateRange }: SleepPatternsReportProps) => {
  const { t } = useTranslation();

  const { data: sleepData = [], isLoading } = useQuery({
    queryKey: ['sleep-patterns-report', selectedPerson, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('device_data')
        .select('*')
        .eq('data_type', 'sleep')
        .gte('recorded_at', dateRange.from.toISOString())
        .lte('recorded_at', dateRange.to.toISOString())
        .order('recorded_at', { ascending: true });

      if (selectedPerson !== 'all') {
        query = query.eq('elderly_person_id', selectedPerson);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching sleep patterns data:', error);
        throw error;
      }
      return data || [];
    },
  });

  const stageMinutes = (value: any, key: string): number => {
    const minutes = value?.stage_minutes?.[key];
    return typeof minutes === 'number' ? minutes : 0;
  };

  // awake_in_bed and out_of_bed are folded into "awake" — this report only distinguishes
  // asleep stages from everything else.
  const awakeMinutes = (value: any) =>
    stageMinutes(value, 'awake_minutes') +
    stageMinutes(value, 'awake_in_bed_minutes') +
    stageMinutes(value, 'out_of_bed_minutes');

  // Real per-night stage breakdown from Health Connect, not a synthetic split.
  const stagesData = sleepData
    .slice(0, 14) // Limit to last 14 days
    .map((item) => ({
      date: format(new Date(item.recorded_at), 'dMMM'),
      deep: Math.round(stageMinutes(item.value, 'deep_minutes')),
      // "sleeping" covers devices that report one undifferentiated asleep stage instead of
      // light/deep/REM; folded into light so it still counts toward total sleep time.
      light: Math.round(stageMinutes(item.value, 'light_minutes') + stageMinutes(item.value, 'sleeping_minutes')),
      rem: Math.round(stageMinutes(item.value, 'rem_minutes')),
      awake: Math.round(awakeMinutes(item.value)),
    }));

  // Calculate sleep stage averages
  const avgDeep = stagesData.length > 0
    ? Math.round(stagesData.reduce((sum, d) => sum + d.deep, 0) / stagesData.length)
    : 0;

  const avgLight = stagesData.length > 0
    ? Math.round(stagesData.reduce((sum, d) => sum + d.light, 0) / stagesData.length)
    : 0;

  const avgREM = stagesData.length > 0
    ? Math.round(stagesData.reduce((sum, d) => sum + d.rem, 0) / stagesData.length)
    : 0;

  const avgAwake = stagesData.length > 0
    ? Math.round(stagesData.reduce((sum, d) => sum + d.awake, 0) / stagesData.length)
    : 0;

  // Sleep cycle analysis
  const totalSleepMinutes = avgDeep + avgLight + avgREM;
  const sleepCycles = Math.round(totalSleepMinutes / 90); // Average sleep cycle is 90 minutes

  // Bedtime patterns from the session's real start timestamp.
  const bedtimeData = sleepData
    .slice(0, 7)
    .map(item => {
      const start = item.value?.start ? new Date(item.value.start) : new Date(item.recorded_at);
      const hour = start.getHours() + start.getMinutes() / 60;
      // Normalize to a 24h+ scale so a bedtime just after midnight averages alongside an
      // evening bedtime instead of looking like it happened first thing that day.
      const bedtime = hour < 12 ? hour + 24 : hour;

      return {
        date: format(start, 'dMMM'),
        bedtime,
      };
    });

  const avgBedtime = bedtimeData.length > 0
    ? bedtimeData.reduce((sum, d) => sum + d.bedtime, 0) / bedtimeData.length
    : 22;

  const formatBedtime = (hour: number) => {
    const h = hour >= 24 ? hour - 24 : hour;
    const displayHour = Math.floor(h);
    return `${displayHour}:00 ${displayHour >= 12 ? t('reports.sleepPatterns.pm') : t('reports.sleepPatterns.am')}`;
  };

  // Sleep stages distribution
  const stageDistribution = [
    { name: t('reports.content.deepSleep'), value: avgDeep, color: '#6366f1', percentage: Math.round((avgDeep / totalSleepMinutes) * 100) },
    { name: t('reports.content.lightSleep'), value: avgLight, color: '#60a5fa', percentage: Math.round((avgLight / totalSleepMinutes) * 100) },
    { name: t('reports.content.remSleep'), value: avgREM, color: '#a78bfa', percentage: Math.round((avgREM / totalSleepMinutes) * 100) },
    { name: t('reports.content.awake'), value: avgAwake, color: '#f59e0b', percentage: Math.round((avgAwake / (totalSleepMinutes + avgAwake)) * 100) },
  ];

  if (isLoading) {
    return <div className="text-center py-8">{t('common.loading', { defaultValue: 'Loading...' })}</div>;
  }

  if (sleepData.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Moon className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-lg font-medium mb-2">{t('reports.sleepPatterns.noData')}</p>
          <p className="text-sm text-muted-foreground mb-4">
            {t('reports.sleepPatterns.noDataDesc')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('reports.sleepPatterns.noDataTip')}
          </p>
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
            <CardTitle className="text-sm font-medium">{t('reports.content.deepSleep')}</CardTitle>
            <Moon className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDeep} {t('reports.sleepPatterns.min')}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stageDistribution[0].percentage}{t('reports.sleepPatterns.percentOfSleep')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.content.remSleep')}</CardTitle>
            <Brain className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgREM} {t('reports.sleepPatterns.min')}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stageDistribution[2].percentage}{t('reports.sleepPatterns.percentOfSleep')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.sleepPatterns.sleepCycles')}</CardTitle>
            <ActivityIcon className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sleepCycles}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('reports.sleepPatterns.minEach')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.sleepPatterns.avgBedtime')}</CardTitle>
            <Sunset className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBedtime(avgBedtime)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('reports.sleepPatterns.typicalSleepTime')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sleep Stages Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.sleepPatterns.stagesDistribution')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stageDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" label={{ value: t('reports.sleepPatterns.minutes'), position: 'insideBottom', offset: -5 }} />
                  <YAxis type="category" dataKey="name" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" name={t('reports.sleepPatterns.durationMin')}>
                    {stageDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium mb-3">{t('reports.sleepPatterns.averagePerNight')}</h4>
              {stageDistribution.map((stage, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                      <span>{stage.name}</span>
                    </div>
                    <span className="font-medium">{stage.value} {t('reports.sleepPatterns.min')} ({stage.percentage}%)</span>
                  </div>
                </div>
              ))}

              <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                <p className="flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>
                    {stageDistribution[0].percentage >= 15 && stageDistribution[0].percentage <= 25
                      ? t('reports.sleepPatterns.deepSleepOptimal')
                      : t('reports.sleepPatterns.deepSleepImprove')}
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>
                    {stageDistribution[2].percentage >= 20 && stageDistribution[2].percentage <= 25
                      ? t('reports.sleepPatterns.remSleepHealthy')
                      : t('reports.sleepPatterns.remSleepConsider')}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sleep Stages Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.sleepPatterns.stagesTrends')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={stagesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis label={{ value: t('reports.sleepPatterns.minutes'), angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="deep" stackId="1" stroke="#6366f1" fill="#6366f1" name={t('reports.content.deepSleep')} />
              <Area type="monotone" dataKey="light" stackId="1" stroke="#60a5fa" fill="#60a5fa" name={t('reports.content.lightSleep')} />
              <Area type="monotone" dataKey="rem" stackId="1" stroke="#a78bfa" fill="#a78bfa" name={t('reports.content.remSleep')} />
              <Area type="monotone" dataKey="awake" stackId="1" stroke="#f59e0b" fill="#f59e0b" name={t('reports.content.awake')} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Sleep Pattern Insights */}
      <Card className="border-info">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sunrise className="h-5 w-5" />
            {t('reports.sleepPatterns.insights')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge variant="default">{t('reports.sleepPatterns.cyclesLabel')}</Badge>
              <p className="text-sm">
                {t('reports.sleepPatterns.cyclesDesc', { count: sleepCycles })}
              </p>
            </div>

            <div className="flex items-start gap-3">
              <Badge variant="default">{t('reports.sleepPatterns.consistencyLabel')}</Badge>
              <p className="text-sm">
                {Math.abs(avgBedtime - 22) < 2
                  ? t('reports.sleepPatterns.consistencyGood')
                  : t('reports.sleepPatterns.consistencyImprove')}
              </p>
            </div>

            <div className="flex items-start gap-3">
              <Badge variant="default">{t('reports.sleepPatterns.qualityLabel')}</Badge>
              <p className="text-sm">
                {avgAwake <= 15
                  ? t('reports.sleepPatterns.qualityGood')
                  : t('reports.sleepPatterns.qualityImprove')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
