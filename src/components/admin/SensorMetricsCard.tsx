import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Radio, TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subMinutes, subHours, subDays, eachMinuteOfInterval, eachHourOfInterval, startOfDay, endOfDay, startOfMinute } from 'date-fns';
import { useEffect, useState } from 'react';

export function SensorMetricsCard() {
  const queryClient = useQueryClient();
  const [liveEventCount, setLiveEventCount] = useState(0);
  const [isLive, setIsLive] = useState(false);

  // Subscribe to real-time sensor data
  useEffect(() => {
    const channel = supabase
      .channel('admin-sensor-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'device_data',
        },
        (payload) => {
          // Increment live counter
          setLiveEventCount(prev => prev + 1);
          setIsLive(true);

          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['sensor-event-metrics'] });

          // Reset live indicator after 2 seconds
          setTimeout(() => setIsLive(false), 2000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Reset live counter every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveEventCount(0);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const { data: sensorMetrics, isLoading } = useQuery({
    queryKey: ['sensor-event-metrics'],
    queryFn: async () => {
      // Get active sensor types
      const { data: deviceTypes, error: typesError } = await supabase
        .from('device_types')
        .select('id, name, category');

      if (typesError) throw typesError;

      // Get devices to count active sensor types
      const { data: devices, error: devicesError } = await supabase
        .from('devices')
        .select('device_type, status')
        .eq('status', 'active');

      if (devicesError) throw devicesError;

      // Count unique active sensor types
      const activeSensorTypes = new Set(devices?.map(d => d.device_type)).size;

      // Get device data (sensor events) count
      const { count: totalEvents, error: eventsError } = await supabase
        .from('device_data')
        .select('id', { count: 'exact', head: true });

      if (eventsError) throw eventsError;

      // Get events from last 24 hours for live chart (by hour)
      const twentyFourHoursAgo = subHours(new Date(), 23);
      const { data: hourlyEvents, error: hourlyError } = await supabase
        .from('device_data')
        .select('recorded_at')
        .gte('recorded_at', twentyFourHoursAgo.toISOString())
        .order('recorded_at', { ascending: true });

      if (hourlyError) throw hourlyError;

      // Group events by hour for last 24 hours
      const last24Hours = eachHourOfInterval({
        start: twentyFourHoursAgo,
        end: new Date(),
      });

      const hourlyEventsData = last24Hours.map(hour => {
        const hourStart = new Date(hour);
        const hourEnd = new Date(hour);
        hourEnd.setHours(hourEnd.getHours() + 1);

        const hourEvents = hourlyEvents?.filter(e => {
          const eventDate = new Date(e.recorded_at);
          return eventDate >= hourStart && eventDate < hourEnd;
        }).length || 0;

        return {
          time: format(hour, 'HH:mm'),
          events: hourEvents,
        };
      });

      // Get events from last 60 minutes for granular live view
      const sixtyMinutesAgo = subMinutes(new Date(), 59);
      const { data: minuteEvents, error: minuteError } = await supabase
        .from('device_data')
        .select('recorded_at')
        .gte('recorded_at', sixtyMinutesAgo.toISOString())
        .order('recorded_at', { ascending: true });

      if (minuteError) throw minuteError;

      // Group events by minute for last 60 minutes
      const last60Minutes = eachMinuteOfInterval({
        start: sixtyMinutesAgo,
        end: new Date(),
      });

      const minuteEventsData = last60Minutes.map(minute => {
        const minuteStart = startOfMinute(minute);
        const minuteEnd = new Date(minuteStart);
        minuteEnd.setMinutes(minuteEnd.getMinutes() + 1);

        const minEvents = minuteEvents?.filter(e => {
          const eventDate = new Date(e.recorded_at);
          return eventDate >= minuteStart && eventDate < minuteEnd;
        }).length || 0;

        return {
          time: format(minute, 'HH:mm'),
          events: minEvents,
        };
      });

      // Calculate today's events
      const todayStart = startOfDay(new Date());
      const { count: todayEvents, error: todayError } = await supabase
        .from('device_data')
        .select('id', { count: 'exact', head: true })
        .gte('recorded_at', todayStart.toISOString());

      // Calculate this hour's events
      const thisHourStart = new Date();
      thisHourStart.setMinutes(0, 0, 0);
      const thisHourEvents = hourlyEvents?.filter(e =>
        new Date(e.recorded_at) >= thisHourStart
      ).length || 0;

      // Calculate events trend (compare last 12 hours vs previous 12 hours)
      const twelveHoursAgo = subHours(new Date(), 12);
      const twentyFourHoursAgoDate = subHours(new Date(), 24);

      const recentEvents = hourlyEvents?.filter(e =>
        new Date(e.recorded_at) >= twelveHoursAgo
      ).length || 0;

      const previousEvents = hourlyEvents?.filter(e => {
        const date = new Date(e.recorded_at);
        return date >= twentyFourHoursAgoDate && date < twelveHoursAgo;
      }).length || 0;

      const eventsTrend = previousEvents > 0
        ? ((recentEvents - previousEvents) / previousEvents) * 100
        : recentEvents > 0 ? 100 : 0;

      // Events per minute (last hour average)
      const lastHourTotal = minuteEventsData.reduce((sum, d) => sum + d.events, 0);
      const eventsPerMinute = (lastHourTotal / 60).toFixed(1);

      return {
        activeSensorTypes,
        totalSensorTypes: deviceTypes?.length || 0,
        totalEvents: totalEvents || 0,
        todayEvents: todayEvents || 0,
        thisHourEvents,
        hourlyEventsData,
        minuteEventsData,
        eventsTrend,
        eventsPerMinute,
        lastUpdated: new Date().toISOString(),
      };
    },
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Sensor Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Radio className={`h-5 w-5 ${isLive ? 'text-green-500 animate-pulse' : 'text-teal-500'}`} />
            Sensor Events
            {isLive && (
              <span className="flex items-center gap-1 text-xs text-green-500 font-normal">
                <Zap className="h-3 w-3" />
                LIVE
              </span>
            )}
          </span>
          <div className="flex items-center gap-1 text-sm">
            {sensorMetrics?.eventsTrend && sensorMetrics.eventsTrend > 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : sensorMetrics?.eventsTrend && sensorMetrics.eventsTrend < 0 ? (
              <TrendingDown className="h-4 w-4 text-red-600" />
            ) : (
              <Minus className="h-4 w-4 text-muted-foreground" />
            )}
            <span className={sensorMetrics?.eventsTrend && sensorMetrics.eventsTrend > 0 ? 'text-green-600' : sensorMetrics?.eventsTrend && sensorMetrics.eventsTrend < 0 ? 'text-red-600' : 'text-muted-foreground'}>
              {sensorMetrics?.eventsTrend ? `${sensorMetrics.eventsTrend > 0 ? '+' : ''}${sensorMetrics.eventsTrend.toFixed(1)}%` : '0%'}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main Metrics */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <div className="text-xl font-bold text-foreground">
                {sensorMetrics?.activeSensorTypes}
              </div>
              <div className="text-xs text-muted-foreground">
                Sensor Types
              </div>
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">
                {sensorMetrics?.totalEvents.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                Total Events
              </div>
            </div>
            <div>
              <div className="text-xl font-bold text-teal-600">
                {sensorMetrics?.todayEvents.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                Today
              </div>
            </div>
            <div>
              <div className={`text-xl font-bold ${isLive ? 'text-green-500' : 'text-foreground'}`}>
                {sensorMetrics?.thisHourEvents.toLocaleString()}
                {liveEventCount > 0 && (
                  <span className="text-xs text-green-500 ml-1">+{liveEventCount}</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                This Hour
              </div>
            </div>
          </div>

          {/* Live Chart - Last 60 minutes */}
          <div className="h-36 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sensorMetrics?.minuteEventsData}>
                <defs>
                  <linearGradient id="liveEventsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="time"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={9}
                  tickLine={false}
                  interval={9}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={9}
                  tickLine={false}
                  width={30}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value.toLocaleString()} events`, 'Sensor Data']}
                />
                <Area
                  type="monotone"
                  dataKey="events"
                  stroke="hsl(160, 60%, 45%)"
                  strokeWidth={2}
                  fill="url(#liveEventsGradient)"
                  isAnimationActive={true}
                  animationDuration={300}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Live sensor data (last 60 min)</span>
            <span className="flex items-center gap-2">
              <span>{sensorMetrics?.eventsPerMinute}/min avg</span>
              <span className="text-muted-foreground/50">|</span>
              <span>Updated: {sensorMetrics?.lastUpdated ? format(new Date(sensorMetrics.lastUpdated), 'HH:mm:ss') : '--'}</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
