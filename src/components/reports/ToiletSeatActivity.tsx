import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Clock, Home, Moon, Sun, TrendingUp, AlertCircle } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';

interface ToiletSeatActivityProps {
  selectedPerson: string;
  dateRange: {
    from: Date;
    to: Date;
  };
}

export const ToiletSeatActivity = ({ selectedPerson, dateRange }: ToiletSeatActivityProps) => {
  const { t } = useTranslation();

  const { data: toiletData = [], isLoading } = useQuery({
    queryKey: ['toilet-seat-activity', selectedPerson, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('device_data')
        .select(`
          *,
          devices!inner(device_type)
        `)
        .eq('devices.device_type', 'toilet_seat')
        .gte('recorded_at', dateRange.from.toISOString())
        .lte('recorded_at', dateRange.to.toISOString())
        .order('recorded_at', { ascending: true });

      if (selectedPerson !== 'all') {
        query = query.eq('elderly_person_id', selectedPerson);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching toilet seat data:', error);
        throw error;
      }
      console.log('Toilet seat data fetched:', data?.length, 'records');
      return data || [];
    },
  });

  // Calculate summary statistics
  const calculateStats = () => {
    if (!toiletData.length) return null;

    let totalUsage = 0;
    let totalDuration = 0;
    let nightUsage = 0;
    let dayUsage = 0;
    let longSessions = 0;

    const dailyData: { [key: string]: { count: number; duration: number } } = {};
    const hourlyData: { [key: number]: number } = {};
    const durationBuckets = { short: 0, normal: 0, long: 0 };

    toiletData.forEach((entry) => {
      let parsedValue: { duration?: number } = { duration: 0 };

      if (typeof entry.value === 'number') {
        // If value is a direct number, treat it as duration in minutes
        parsedValue = { duration: entry.value };
      } else if (typeof entry.value === 'string') {
        try {
          const parsed = JSON.parse(entry.value);
          if (typeof parsed === 'number') {
            parsedValue = { duration: parsed };
          } else {
            parsedValue = parsed;
          }
        } catch (e) {
          console.warn('Failed to parse value:', entry.value, e);
        }
      } else if (typeof entry.value === 'object' && entry.value !== null) {
        parsedValue = entry.value as { duration?: number };
      }

      const recordedAt = parseISO(entry.recorded_at);
      const hour = recordedAt.getHours();
      const date = format(recordedAt, 'yyyy-MM-dd');
      const duration = Math.round(parsedValue?.duration || 0);

      // Track daily usage
      if (!dailyData[date]) {
        dailyData[date] = { count: 0, duration: 0 };
      }
      dailyData[date].count += 1;
      dailyData[date].duration += duration;

      // Track hourly distribution
      hourlyData[hour] = (hourlyData[hour] || 0) + 1;

      // Accumulate stats
      totalUsage += 1;
      totalDuration += duration;

      // Night vs Day (Night: 10 PM to 6 AM)
      if (hour >= 22 || hour < 6) {
        nightUsage += 1;
      } else {
        dayUsage += 1;
      }

      // Duration categorization (in minutes)
      if (duration < 3) {
        durationBuckets.short += 1;
      } else if (duration <= 10) {
        durationBuckets.normal += 1;
      } else {
        durationBuckets.long += 1;
        longSessions += 1;
      }
    });

    const avgDuration = totalUsage > 0 ? totalDuration / totalUsage : 0;
    const days = Math.max(differenceInDays(dateRange.to, dateRange.from), 1);
    const avgPerDay = totalUsage / days;

    return {
      totalUsage,
      avgDuration: avgDuration.toFixed(1),
      nightUsage,
      dayUsage,
      longSessions,
      avgPerDay: avgPerDay.toFixed(1),
      dailyData,
      hourlyData,
      durationBuckets,
    };
  };

  const stats = calculateStats();

  // Prepare chart data
  const prepareDailyChartData = () => {
    if (!stats) return [];
    return Object.entries(stats.dailyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date: format(parseISO(date), 'MMM dd'),
        count: data.count,
        duration: Math.round(data.duration),
      }));
  };

  const prepareHourlyChartData = () => {
    if (!stats) return [];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return hours.map((hour) => ({
      hour: `${hour}:00`,
      count: stats.hourlyData[hour] || 0,
      isNight: hour >= 22 || hour < 6,
    }));
  };

  const prepareDayNightData = () => {
    if (!stats) return [];
    return [
      { name: 'Night (10PM-6AM)', value: stats.nightUsage, fill: '#3b82f6' },
      { name: 'Day (6AM-10PM)', value: stats.dayUsage, fill: '#fbbf24' },
    ];
  };

  const prepareAvgDurationTrendData = () => {
    if (!stats) return [];
    return Object.entries(stats.dailyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date: format(parseISO(date), 'MMM dd'),
        avgDuration: data.count > 0 ? (data.duration / data.count).toFixed(1) : 0,
        count: data.count,
      }));
  };

  const dailyChartData = prepareDailyChartData();
  const hourlyChartData = prepareHourlyChartData();
  const dayNightData = prepareDayNightData();
  const avgDurationTrendData = prepareAvgDurationTrendData();

  const getFrequencyStatus = (avgPerDay: number) => {
    if (avgPerDay >= 4 && avgPerDay <= 8) return { variant: 'default' as const, label: 'Normal' };
    if (avgPerDay < 4) return { variant: 'secondary' as const, label: 'Low' };
    return { variant: 'destructive' as const, label: 'High' };
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats || stats.totalUsage === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Home className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              No toilet seat data available for the selected period
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const frequencyStatus = getFrequencyStatus(parseFloat(stats.avgPerDay));

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsage}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {stats.avgPerDay} per day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgDuration} min</div>
            <p className="text-xs text-muted-foreground">
              Per visit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Usage Pattern</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold">
                <Badge variant={frequencyStatus.variant}>{frequencyStatus.label}</Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Based on frequency
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Night Visits</CardTitle>
            <Moon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.nightUsage}</div>
            <p className="text-xs text-muted-foreground">
              {stats.longSessions > 0 && (
                <span className="flex items-center text-orange-500">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {stats.longSessions} extended sessions
                </span>
              )}
              {stats.longSessions === 0 && 'No extended sessions'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Daily Usage Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Toilet Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Usage Count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Day vs Night Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Day vs Night Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dayNightData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dayNightData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Second Row Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Hourly Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Hourly Usage Pattern</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="hour"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={2}
                />
                <YAxis label={{ value: 'Usage Count', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Usage Count" radius={[8, 8, 0, 0]}>
                  {hourlyChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isNight ? '#3b82f6' : '#fbbf24'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Average Duration Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Average Duration Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={avgDurationTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis
                  yAxisId="left"
                  label={{ value: 'Avg Duration (min)', angle: -90, position: 'insideLeft' }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  label={{ value: 'Count', angle: 90, position: 'insideRight' }}
                />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="avgDuration"
                  name="Avg Duration (min)"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                  activeDot={{ r: 7 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="count"
                  name="Visit Count"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Details */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Toilet Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {toiletData.slice(-15).reverse().map((entry, index) => {
              let parsedValue: { duration?: number } = { duration: 0 };

              if (typeof entry.value === 'number') {
                // If value is a direct number, treat it as duration in minutes
                parsedValue = { duration: entry.value };
              } else if (typeof entry.value === 'string') {
                try {
                  const parsed = JSON.parse(entry.value);
                  if (typeof parsed === 'number') {
                    parsedValue = { duration: parsed };
                  } else {
                    parsedValue = parsed;
                  }
                } catch (e) {
                  console.warn('Failed to parse value:', entry.value, e);
                }
              } else if (typeof entry.value === 'object' && entry.value !== null) {
                parsedValue = entry.value as { duration?: number };
              }

              const recordedAt = parseISO(entry.recorded_at);
              const hour = recordedAt.getHours();
              const isNight = hour >= 22 || hour < 6;
              const duration = Math.round(parsedValue?.duration || 0);
              const isLong = duration > 10;

              return (
                <div key={index} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex items-center space-x-3">
                    {isNight ? (
                      <Moon className="h-5 w-5 text-indigo-500" />
                    ) : (
                      <Sun className="h-5 w-5 text-amber-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {format(recordedAt, 'MMM dd, yyyy HH:mm')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Duration: {duration} min
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={isNight ? 'default' : 'secondary'}>
                      {isNight ? 'Night' : 'Day'}
                    </Badge>
                    {isLong && (
                      <Badge variant="destructive">Extended</Badge>
                    )}
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
