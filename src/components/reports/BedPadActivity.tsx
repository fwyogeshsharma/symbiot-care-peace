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

    let totalDuration = 0;
    let totalPressure = 0;
    let pressureCount = 0;
    let occupiedCount = 0;
    let nightOccupied = 0;
    let dayOccupied = 0;
    let nightDuration = 0;
    let dayDuration = 0;

    const dailyData: { [key: string]: { occupied: number; avgPressure: number; total: number; duration: number } } = {};
    const hourlyData: { [key: number]: { occupied: number; total: number; duration: number } } = {};

    bedPadData.forEach((entry) => {
      let parsedValue: { duration?: number; pressure?: number; occupancy?: boolean } = {
        duration: 0,
        pressure: 0,
        occupancy: false
      };

      if (typeof entry.value === 'string') {
        try {
          parsedValue = JSON.parse(entry.value);
        } catch (e) {
          console.warn('Failed to parse value:', entry.value, e);
        }
      } else if (typeof entry.value === 'object' && entry.value !== null) {
        parsedValue = entry.value as { duration?: number; pressure?: number; occupancy?: boolean };
      }

      const recordedAt = parseISO(entry.recorded_at);
      const hour = recordedAt.getHours();
      const date = format(recordedAt, 'yyyy-MM-dd');
      const isOccupied = parsedValue?.occupancy || false;
      const duration = parsedValue?.duration || 0;

      // Track daily sessions
      if (!dailyData[date]) {
        dailyData[date] = { occupied: 0, avgPressure: 0, total: 0, duration: 0 };
      }
      dailyData[date].total += 1;
      dailyData[date].duration += duration;
      if (isOccupied) dailyData[date].occupied += 1;
      if (parsedValue?.pressure) {
        dailyData[date].avgPressure += Number(parsedValue.pressure) || 0;
      }

      // Track hourly distribution
      if (!hourlyData[hour]) {
        hourlyData[hour] = { occupied: 0, total: 0, duration: 0 };
      }
      hourlyData[hour].total += 1;
      hourlyData[hour].duration += duration;
      if (isOccupied) hourlyData[hour].occupied += 1;

      // Accumulate stats
      totalDuration += duration;
      if (parsedValue?.pressure) {
        totalPressure += Number(parsedValue.pressure) || 0;
        pressureCount += 1;
      }
      if (isOccupied) {
        occupiedCount += 1;
        // Night vs Day (Night: 8 PM to 6 AM)
        if (hour >= 20 || hour < 6) {
          nightOccupied += 1;
          nightDuration += duration;
        } else {
          dayOccupied += 1;
          dayDuration += duration;
        }
      }
    });

    const avgPressure = pressureCount > 0 ? totalPressure / pressureCount : 0;
    const occupancyRate = bedPadData.length > 0 ? (occupiedCount / bedPadData.length) * 100 : 0;
    const avgDuration = bedPadData.length > 0 ? totalDuration / bedPadData.length : 0;

    return {
      totalReadings: bedPadData.length,
      occupiedCount,
      occupancyRate: occupancyRate.toFixed(1),
      avgPressure: avgPressure.toFixed(1),
      totalDuration: Math.round(totalDuration / 60), // Convert to hours
      avgDuration: Math.round(avgDuration),
      nightOccupied,
      dayOccupied,
      nightDuration: Math.round(nightDuration / 60),
      dayDuration: Math.round(dayDuration / 60),
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
      occupied: data.occupied,
      total: data.total,
      duration: Math.round(data.duration / 60), // Convert to hours
      occupancyRate: data.total > 0 ? ((data.occupied / data.total) * 100).toFixed(1) : 0,
      avgPressure: data.total > 0 ? (data.avgPressure / data.total).toFixed(1) : 0,
    }));
  };

  const prepareHourlyChartData = () => {
    if (!stats) return [];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return hours.map((hour) => {
      const data = stats.hourlyData[hour];
      return {
        hour: `${hour}:00`,
        occupied: data?.occupied || 0,
        total: data?.total || 0,
        duration: data ? Math.round(data.duration) : 0, // Keep in minutes
        occupancyRate: data && data.total > 0 ? ((data.occupied / data.total) * 100).toFixed(1) : 0,
        label: hour < 12 ? `${hour} AM` : `${hour - 12} PM`,
      };
    });
  };

  const prepareDayNightData = () => {
    if (!stats) return [];
    return [
      { name: 'Night (8PM-6AM)', value: stats.nightOccupied, fill: '#3b82f6' },
      { name: 'Day (6AM-8PM)', value: stats.dayOccupied, fill: '#fbbf24' },
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

  if (!stats || stats.totalReadings === 0) {
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
        {/* Daily Occupancy Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Bed Occupancy</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: 'Occupied Readings', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold mb-2">{data.date}</p>
                          <div className="space-y-1 text-sm">
                            <p>Occupied: <span className="font-bold">{data.occupied}</span> / {data.total}</p>
                            <p>Duration: <span className="font-bold">{data.duration}h</span></p>
                            <p>Occupancy Rate: <span className="font-bold">{data.occupancyRate}%</span></p>
                            <p>Avg Pressure: <span className="font-bold">{data.avgPressure}</span></p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="occupied" name="Occupied Readings" fill="#3b82f6" radius={[8, 8, 0, 0]} />
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
          <CardTitle>Hourly Bed Occupancy Pattern</CardTitle>
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
              <YAxis label={{ value: 'Occupied Count', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-card border rounded-lg p-3 shadow-lg">
                        <p className="font-semibold mb-2">{data.hour}</p>
                        <div className="space-y-1 text-sm">
                          <p>Occupied: <span className="font-bold">{data.occupied}</span> / {data.total}</p>
                          <p>Duration: <span className="font-bold">{data.duration} min</span></p>
                          <p>Rate: <span className="font-bold">{data.occupancyRate}%</span></p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="occupied"
                name="Occupied Readings"
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
          <CardTitle>Recent Bed Pad Readings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {bedPadData.slice(-10).reverse().map((entry, index) => {
              let parsedValue: { duration?: number; pressure?: number; occupancy?: boolean } = {
                duration: 0,
                pressure: 0,
                occupancy: false
              };

              if (typeof entry.value === 'string') {
                try {
                  parsedValue = JSON.parse(entry.value);
                } catch (e) {
                  console.warn('Failed to parse value:', entry.value, e);
                }
              } else if (typeof entry.value === 'object' && entry.value !== null) {
                parsedValue = entry.value as { duration?: number; pressure?: number; occupancy?: boolean };
              }

              const recordedAt = parseISO(entry.recorded_at);
              const hour = recordedAt.getHours();
              const isNight = hour >= 20 || hour < 6;
              const isOccupied = parsedValue?.occupancy || false;
              const pressure = Number(parsedValue?.pressure) || 0;
              const duration = Number(parsedValue?.duration) || 0;
              const durationHours = Math.floor(duration / 60);
              const durationMinutes = Math.round(duration % 60);

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
                        Duration: {durationHours}h {durationMinutes}m | Pressure: {pressure.toFixed(1)} | Occupancy: {isOccupied ? 'Occupied' : 'Empty'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={isOccupied ? 'default' : 'secondary'}>
                    Occupancy: {isOccupied ? 'Occupied' : 'Empty'}
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
