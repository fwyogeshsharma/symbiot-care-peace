import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, getHours, differenceInMinutes } from 'date-fns';
import { MapPin, Clock, TrendingUp, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MovementPatternsReportProps {
  selectedPerson: string;
  dateRange: { from: Date; to: Date };
}

export const MovementPatternsReport = ({ selectedPerson, dateRange }: MovementPatternsReportProps) => {
  const { t } = useTranslation();

  // Fetch location/movement data
  const { data: locationData = [], isLoading } = useQuery({
    queryKey: ['movement-patterns', selectedPerson, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('device_data')
        .select('*')
        .in('data_type', ['location', 'motion', 'position', 'room', 'movement'])
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

  // Helper to extract location from value
  const extractLocation = (value: any): string | null => {
    if (typeof value === 'object' && value !== null) {
      return value?.location || value?.room || null;
    }
    return typeof value === 'string' ? value : null;
  };

  // Process location transitions
  const locationTransitions = locationData.reduce((acc: any, item, index) => {
    if (index === 0) return acc;

    const prevLocation = locationData[index - 1];
    const currentLoc = extractLocation(item.value);
    const prevLoc = extractLocation(prevLocation.value);

    if (currentLoc !== prevLoc && currentLoc && prevLoc) {
      const transition = `${prevLoc} → ${currentLoc}`;
      acc[transition] = (acc[transition] || 0) + 1;
    }

    return acc;
  }, {});

  const transitionData = Object.entries(locationTransitions).map(([transition, count]) => ({
    transition,
    count,
  })).sort((a: any, b: any) => b.count - a.count).slice(0, 10);

  // Time of day activity distribution
  const hourlyActivity = locationData.reduce((acc: any, item) => {
    const hour = getHours(new Date(item.recorded_at));
    const timeSlot = hour < 6 ? 'Night (12am-6am)' :
                     hour < 12 ? 'Morning (6am-12pm)' :
                     hour < 18 ? 'Afternoon (12pm-6pm)' :
                     'Evening (6pm-12am)';
    acc[timeSlot] = (acc[timeSlot] || 0) + 1;
    return acc;
  }, {});

  const timeDistribution = Object.entries(hourlyActivity).map(([timeSlot, count]) => ({
    timeSlot,
    count,
  }));

  // Location dwell time analysis
  const dwellTimeByLocation = locationData.reduce((acc: any, item, index) => {
    if (index === 0) return acc;

    const currentLoc = extractLocation(item.value);
    const prevItem = locationData[index - 1];
    const prevLoc = extractLocation(prevItem.value);

    if (currentLoc === prevLoc && currentLoc) {
      const duration = differenceInMinutes(new Date(item.recorded_at), new Date(prevItem.recorded_at));
      acc[currentLoc] = (acc[currentLoc] || 0) + duration;
    }

    return acc;
  }, {});

  const dwellTimeData = Object.entries(dwellTimeByLocation).map(([location, minutes]) => ({
    location,
    minutes: Math.round(minutes as number),
    hours: Math.round((minutes as number) / 60 * 10) / 10,
  })).sort((a, b) => b.minutes - a.minutes);

  // Movement frequency by hour of day
  const hourlyMovement = Array.from({ length: 24 }, (_, hour) => {
    const movements = locationData.filter(item =>
      getHours(new Date(item.recorded_at)) === hour
    ).length;
    return {
      hour: `${hour}:00`,
      movements,
    };
  });

  // Calculate statistics
  const totalMovements = locationData.length;
  const totalLocations = new Set(locationData.map(item => {
    return extractLocation(item.value);
  }).filter(Boolean)).size;

  const mostVisitedLocation = dwellTimeData[0];
  const totalTransitions = (Object.values(locationTransitions) as number[]).reduce((sum, count) => sum + count, 0);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (isLoading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  if (locationData.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">
            {t('reports.movementPatterns.noData', { defaultValue: 'No movement data available for the selected period.' })}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {t('reports.movementPatterns.noDataDesc', { defaultValue: 'Ensure location tracking devices are properly configured.' })}
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
            <CardTitle className="text-sm font-medium">
              {t('reports.movementPatterns.totalMovements', { defaultValue: 'Total Movements' })}
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMovements.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {t('reports.movementPatterns.recordedEvents', { defaultValue: 'Recorded events' })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('reports.movementPatterns.locationsVisited', { defaultValue: 'Locations Visited' })}
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLocations}</div>
            <p className="text-xs text-muted-foreground">
              {t('reports.movementPatterns.uniqueLocations', { defaultValue: 'Unique locations' })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('reports.movementPatterns.roomTransitions', { defaultValue: 'Room Transitions' })}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransitions}</div>
            <p className="text-xs text-muted-foreground">
              {t('reports.movementPatterns.locationChanges', { defaultValue: 'Location changes' })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('reports.movementPatterns.mostVisited', { defaultValue: 'Most Visited' })}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{mostVisitedLocation?.location || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              {mostVisitedLocation?.hours || 0} {t('reports.content.hours', { defaultValue: 'hours' })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Movement Frequency by Hour */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('reports.movementPatterns.hourlyMovement', { defaultValue: 'Movement Frequency by Hour' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hourlyMovement} margin={{ top: 20, right: 30, left: 60, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis width={80} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="movements"
                stroke="#10b981"
                name={t('reports.movementPatterns.movements', { defaultValue: 'Movements' })}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Time of Day Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>
              {t('reports.movementPatterns.timeDistribution', { defaultValue: 'Activity by Time of Day' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={timeDistribution}
                  cx="50%"
                  cy="45%"
                  labelLine={false}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="timeSlot"
                >
                  {timeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  verticalAlign="bottom"
                  height={50}
                  wrapperStyle={{ paddingTop: '20px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Dwell Time by Location */}
        <Card>
          <CardHeader>
            <CardTitle>
              {t('reports.movementPatterns.dwellTime', { defaultValue: 'Time Spent by Location' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dwellTimeData.slice(0, 6)} layout="vertical" margin={{ top: 20, right: 30, left: 120, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="location" width={100} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="hours"
                  fill="#3b82f6"
                  name={t('reports.content.hours', { defaultValue: 'Hours' })}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Location Transitions */}
      {transitionData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {t('reports.movementPatterns.topTransitions', { defaultValue: 'Top Location Transitions' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transitionData.map((item: any, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {index + 1}
                    </div>
                    <span className="font-medium">{item.transition}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">{item.count}</div>
                    <div className="text-xs text-muted-foreground">
                      {t('reports.movementPatterns.transitions', { defaultValue: 'transitions' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Dwell Time Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('reports.movementPatterns.detailedDwellTime', { defaultValue: 'Detailed Dwell Time Analysis' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {dwellTimeData.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{item.location}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">{item.minutes} min</span>
                  <span className="font-semibold">{item.hours}h</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
