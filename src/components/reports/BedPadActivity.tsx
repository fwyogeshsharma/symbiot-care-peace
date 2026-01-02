import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Bed, Moon, Sun } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface BedPadActivityProps {
  selectedPerson: string;
  dateRange: {
    from: Date;
    to: Date;
  };
}

export const BedPadActivity = ({ selectedPerson, dateRange }: BedPadActivityProps) => {
  const { t } = useTranslation();

  const { data: bedPadData = [], isLoading } = useQuery({
    queryKey: ['bed-pad-activity', selectedPerson, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('device_data')
        .select(`
          *,
          devices!inner(device_type)
        `)
        .eq('devices.device_type', 'bed_pad')
        .gte('recorded_at', dateRange.from.toISOString())
        .lte('recorded_at', dateRange.to.toISOString())
        .order('recorded_at', { ascending: true });

      if (selectedPerson !== 'all') {
        query = query.eq('elderly_person_id', selectedPerson);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching bed pad data:', error);
        throw error;
      }
      console.log('Bed pad data fetched:', data?.length, 'records');
      return data || [];
    },
  });

  // Calculate summary statistics
  const calculateStats = () => {
    if (!bedPadData.length) return null;

    let totalTimeInBed = 0;
    let sleepSessions = 0;
    let totalPressure = 0;
    let nightSessions = 0;
    let daySessions = 0;

    const dailyData: { [key: string]: { duration: number; sessions: number } } = {};
    const hourlyData: { [key: number]: number } = {};

    bedPadData.forEach((entry) => {
      let parsedValue: { duration?: number; pressure?: number } = { duration: 0, pressure: 0 };
      if (typeof entry.value === 'string') {
        try {
          parsedValue = JSON.parse(entry.value);
        } catch (e) {
          console.warn('Failed to parse value:', entry.value, e);
        }
      } else if (typeof entry.value === 'object' && entry.value !== null) {
        parsedValue = entry.value as { duration?: number; pressure?: number };
      }
      const recordedAt = parseISO(entry.recorded_at);
      const hour = recordedAt.getHours();
      const date = format(recordedAt, 'yyyy-MM-dd');

      // Track daily sessions
      if (!dailyData[date]) {
        dailyData[date] = { duration: 0, sessions: 0 };
      }
      dailyData[date].sessions += 1;
      dailyData[date].duration += parsedValue?.duration || 0;

      // Track hourly distribution
      hourlyData[hour] = (hourlyData[hour] || 0) + 1;

      // Accumulate stats
      totalTimeInBed += parsedValue?.duration || 0;
      sleepSessions += 1;
      totalPressure += parsedValue?.pressure || 0;

      // Night vs Day (Night: 8 PM to 6 AM)
      if (hour >= 20 || hour < 6) {
        nightSessions += 1;
      } else {
        daySessions += 1;
      }
    });

    const avgTimeInBed = sleepSessions > 0 ? totalTimeInBed / sleepSessions : 0;
    const avgPressure = sleepSessions > 0 ? totalPressure / sleepSessions : 0;

    return {
      totalTimeInBed: Math.round(totalTimeInBed / 60), // Convert to hours
      avgTimeInBed: Math.round(avgTimeInBed),
      sleepSessions,
      avgPressure: avgPressure.toFixed(1),
      nightSessions,
      daySessions,
      dailyData,
      hourlyData,
    };
  };

  const stats = calculateStats();

  // Prepare chart data
  const prepareDailyChartData = () => {
    if (!stats) return [];
    return Object.entries(stats.dailyData).map(([date, data]) => ({
      date: format(parseISO(date), 'MMM dd'),
      duration: Math.round(data.duration / 60), // Convert to hours
      sessions: data.sessions,
    }));
  };

  const prepareHourlyChartData = () => {
    if (!stats) return [];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return hours.map((hour) => ({
      hour: `${hour}:00`,
      count: stats.hourlyData[hour] || 0,
      label: hour < 12 ? `${hour} AM` : `${hour - 12} PM`,
    }));
  };

  const prepareDayNightData = () => {
    if (!stats) return [];
    return [
      { name: 'Night (8PM-6AM)', value: stats.nightSessions, fill: '#3b82f6' },
      { name: 'Day (6AM-8PM)', value: stats.daySessions, fill: '#fbbf24' },
    ];
  };

  const dailyChartData = prepareDailyChartData();
  const hourlyChartData = prepareHourlyChartData();
  const dayNightData = prepareDayNightData();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats || stats.sleepSessions === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Bed className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              No bed pad data available for the selected period
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Daily Usage Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Bed Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="duration" name="Hours in Bed" fill="#3b82f6" radius={[8, 8, 0, 0]} />
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

      {/* Hourly Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Hourly Bed Usage Pattern</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hourlyChartData}>
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
              <Line
                type="monotone"
                dataKey="count"
                name="Bed Usage"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Activity Details */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bed Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {bedPadData.slice(-10).reverse().map((entry, index) => {
              let parsedValue: { duration?: number; pressure?: number } = { duration: 0, pressure: 0 };
              if (typeof entry.value === 'string') {
                try {
                  parsedValue = JSON.parse(entry.value);
                } catch (e) {
                  console.warn('Failed to parse value:', entry.value, e);
                }
              } else if (typeof entry.value === 'object' && entry.value !== null) {
                parsedValue = entry.value as { duration?: number; pressure?: number };
              }
              const recordedAt = parseISO(entry.recorded_at);
              const hour = recordedAt.getHours();
              const isNight = hour >= 20 || hour < 6;
              const duration = parsedValue?.duration || 0;

              return (
                <div key={index} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex items-center space-x-3">
                    {isNight ? (
                      <Moon className="h-5 w-5 text-blue-500" />
                    ) : (
                      <Sun className="h-5 w-5 text-yellow-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {format(recordedAt, 'MMM dd, yyyy HH:mm')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Duration: {Math.floor(duration / 60)}h {duration % 60}m
                      </p>
                    </div>
                  </div>
                  <Badge variant={isNight ? 'default' : 'secondary'}>
                    {isNight ? 'Night' : 'Day'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
