import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Clock, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Moon, Info } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';

interface ToiletHealthInsightsProps {
  selectedPerson: string;
  dateRange: {
    from: Date | string;
    to: Date | string;
  };
}

// Helper function to safely parse device data values
const parseDeviceValue = (value: any): { duration?: number } => {
  if (typeof value === 'number') {
    return { duration: value };
  }

  if (typeof value === 'string') {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      return { duration: numValue };
    }

    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'number') {
        return { duration: parsed };
      }
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    } catch (e) {
      return { duration: 0 };
    }
  }

  if (typeof value === 'object' && value !== null) {
    return value as { duration?: number };
  }

  return { duration: 0 };
};

export const ToiletHealthInsights = ({ selectedPerson, dateRange }: ToiletHealthInsightsProps) => {
  const { data: toiletData = [], isLoading } = useQuery({
    queryKey: ['toilet-health-insights', selectedPerson, dateRange],
    queryFn: async () => {
      if (!selectedPerson) return [];

      // Convert date range to ISO strings if needed
      const fromDate = typeof dateRange.from === 'string' ? dateRange.from : dateRange.from.toISOString();
      const toDate = typeof dateRange.to === 'string' ? dateRange.to : dateRange.to.toISOString();

      // Match the exact query structure from ToiletSeatActivity component
      let query = supabase
        .from('device_data')
        .select(`
          *,
          devices!inner(device_type)
        `)
        .eq('devices.device_type', 'toilet_seat')
        .gte('recorded_at', fromDate)
        .lte('recorded_at', toDate)
        .order('recorded_at', { ascending: true });

      if (selectedPerson !== 'all') {
        query = query.eq('elderly_person_id', selectedPerson);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching toilet data:', error);
        throw error;
      }
      console.log('Toilet health insights - Query params:', {
        selectedPerson,
        fromDate,
        toDate,
        resultCount: data?.length
      });
      return data || [];
    },
    enabled: !!selectedPerson,
  });

  const analyzeData = () => {
    if (!toiletData || toiletData.length === 0) {
      console.log('No toilet data to analyze');
      return null;
    }

    console.log('Analyzing', toiletData.length, 'toilet records');

    let totalUsage = 0;
    let totalDuration = 0;
    let nightUsage = 0;
    let longSessions = 0;
    const dailyData: { [key: string]: { count: number; duration: number } } = {};

    toiletData.forEach((entry) => {
      const parsedValue = parseDeviceValue(entry.value);
      const recordedAt = parseISO(entry.recorded_at);
      const hour = recordedAt.getHours();
      const date = format(recordedAt, 'yyyy-MM-dd');
      const duration = Math.round(parsedValue?.duration || 0);

      if (!dailyData[date]) {
        dailyData[date] = { count: 0, duration: 0 };
      }
      dailyData[date].count += 1;
      dailyData[date].duration += duration;

      totalUsage += 1;
      totalDuration += duration;

      if (hour >= 22 || hour < 6) {
        nightUsage += 1;
      }

      if (duration > 10) {
        longSessions += 1;
      }
    });

    const avgDuration = totalUsage > 0 ? totalDuration / totalUsage : 0;

    // Handle date range calculation for both Date and string types
    const toDate = typeof dateRange.to === 'string' ? parseISO(dateRange.to) : dateRange.to;
    const fromDate = typeof dateRange.from === 'string' ? parseISO(dateRange.from) : dateRange.from;
    const days = Math.max(differenceInDays(toDate, fromDate), 1);

    const avgPerDay = totalUsage / days;
    const nightPercentage = totalUsage > 0 ? (nightUsage / totalUsage) * 100 : 0;

    // Prepare trend data
    const trendData = Object.entries(dailyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date: format(parseISO(date), 'MMM dd'),
        avgDuration: data.count > 0 ? parseFloat((data.duration / data.count).toFixed(1)) : 0,
        count: data.count,
      }));

    // Health insights
    const insights: Array<{ type: 'good' | 'warning' | 'alert'; message: string }> = [];

    // Frequency analysis
    if (avgPerDay >= 4 && avgPerDay <= 8) {
      insights.push({ type: 'good', message: 'Normal frequency pattern (4-8 visits/day)' });
    } else if (avgPerDay < 4) {
      insights.push({ type: 'warning', message: 'Low frequency - May indicate dehydration or constipation' });
    } else {
      insights.push({ type: 'alert', message: 'High frequency - Consult healthcare provider' });
    }

    // Duration analysis
    if (avgDuration >= 2 && avgDuration <= 8) {
      insights.push({ type: 'good', message: 'Healthy visit duration' });
    } else if (avgDuration > 8) {
      insights.push({ type: 'warning', message: 'Extended duration - May indicate digestive issues' });
    } else if (avgDuration > 0) {
      insights.push({ type: 'good', message: 'Quick visit duration' });
    }

    // Night visits analysis
    if (nightPercentage > 30) {
      insights.push({ type: 'alert', message: `High night activity (${nightPercentage.toFixed(0)}%) - May affect sleep quality` });
    } else if (nightUsage > 0) {
      insights.push({ type: 'good', message: `Low night activity (${nightPercentage.toFixed(0)}%)` });
    }

    // Long sessions analysis
    if (longSessions > 0) {
      insights.push({ type: 'warning', message: `${longSessions} extended sessions detected` });
    }

    console.log('Generated insights:', insights);

    return {
      totalUsage,
      avgDuration: avgDuration.toFixed(1),
      avgPerDay: avgPerDay.toFixed(1),
      nightUsage,
      nightPercentage: nightPercentage.toFixed(0),
      longSessions,
      trendData,
      insights,
    };
  };

  const stats = analyzeData();

  console.log('ToiletHealthInsights - selectedPerson:', selectedPerson);
  console.log('ToiletHealthInsights - toiletData length:', toiletData?.length);
  console.log('ToiletHealthInsights - stats:', stats);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Toilet Health Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalUsage === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Toilet Health Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Info className="mx-auto h-12 w-12 mb-2 opacity-50" />
            <p>No toilet activity data available for the last 30 days</p>
            <p className="text-xs mt-2">
              {toiletData?.length === 0
                ? 'No records found. Please check if toilet seat sensor is properly configured.'
                : 'Data found but could not be analyzed.'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Toilet Health Insights (30 Days)</span>
          <Badge variant="outline" className="text-xs font-normal">
            {stats.totalUsage} visits tracked
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Average Per Day */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Daily Avg</span>
              {parseFloat(stats.avgPerDay) >= 4 && parseFloat(stats.avgPerDay) <= 8 ? (
                <CheckCircle className="h-3 w-3 text-green-600" />
              ) : (
                <AlertTriangle className="h-3 w-3 text-orange-500" />
              )}
            </div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.avgPerDay}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">visits/day</p>
          </div>

          {/* Average Duration */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Avg Duration</span>
              <Clock className="h-3 w-3 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.avgDuration}</p>
            <p className="text-xs text-purple-600 dark:text-purple-400">minutes</p>
          </div>

          {/* Night Activity */}
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">Night Visits</span>
              <Moon className="h-3 w-3 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">{stats.nightUsage}</p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400">{stats.nightPercentage}% of total</p>
          </div>

          {/* Long Sessions */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Extended</span>
              {stats.longSessions > 0 ? (
                <TrendingUp className="h-3 w-3 text-orange-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-green-600" />
              )}
            </div>
            <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{stats.longSessions}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">&gt;10 min sessions</p>
          </div>
        </div>

        {/* Health Insights */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Info className="h-4 w-4" />
            Health Analysis
          </h4>
          <div className="space-y-2">
            {stats.insights.map((insight, index) => (
              <div
                key={index}
                className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                  insight.type === 'good'
                    ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800'
                    : insight.type === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800'
                    : 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800'
                }`}
              >
                {insight.type === 'good' ? (
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                )}
                <span className={
                  insight.type === 'good'
                    ? 'text-green-700 dark:text-green-300'
                    : insight.type === 'warning'
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-red-700 dark:text-red-300'
                }>
                  {insight.message}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Duration Trend Chart */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Duration Trend (30 Days)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
                label={{ value: 'Minutes', angle: -90, position: 'insideLeft', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <ReferenceLine y={8} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Max Normal', fontSize: 10, fill: '#f59e0b' }} />
              <Line
                type="monotone"
                dataKey="avgDuration"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 3, fill: '#6366f1' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
