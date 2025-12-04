import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogIn, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns';

export function PlatformMetricsCard() {
  const { data: sessionData, isLoading } = useQuery({
    queryKey: ['platform-session-metrics'],
    queryFn: async () => {
      // Get session logs from database
      const sevenDaysAgo = subDays(new Date(), 6);
      const fourteenDaysAgo = subDays(new Date(), 13);

      // Get sessions for last 7 days
      const { data: recentSessions, error: recentError } = await (supabase
        .from('session_logs') as any)
        .select('id, user_id, login_at, logout_at, session_duration_minutes')
        .gte('login_at', sevenDaysAgo.toISOString())
        .order('login_at', { ascending: true });

      if (recentError) {
        console.error('Error fetching session logs:', recentError);
        // Return empty data if table doesn't exist yet
        return {
          totalSessions: 0,
          avgSessionLength: 0,
          dailySessionsData: [],
          sessionTrend: 0,
          activeUsersToday: 0,
        };
      }

      // Get sessions for previous 7 days (for trend calculation)
      const { data: previousSessions } = await (supabase
        .from('session_logs') as any)
        .select('id')
        .gte('login_at', fourteenDaysAgo.toISOString())
        .lt('login_at', sevenDaysAgo.toISOString());

      // Group sessions by day
      const last7Days = eachDayOfInterval({
        start: sevenDaysAgo,
        end: new Date(),
      });

      const dailySessionsData = last7Days.map(day => {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);
        const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

        const daySessions = recentSessions?.filter(s => {
          const loginDate = new Date(s.login_at);
          return loginDate >= dayStart && loginDate <= dayEnd;
        }) || [];

        // Calculate average duration for completed sessions
        const completedSessions = daySessions.filter(s => s.session_duration_minutes !== null);
        const avgDuration = completedSessions.length > 0
          ? Math.round(completedSessions.reduce((sum, s) => sum + (s.session_duration_minutes || 0), 0) / completedSessions.length)
          : 0;

        return {
          date: format(day, 'EEE'),
          fullDate: format(day, 'MMM dd'),
          sessions: daySessions.length,
          avgDuration,
          isToday,
        };
      });

      // Calculate totals
      const totalSessions = recentSessions?.length || 0;
      const previousTotalSessions = previousSessions?.length || 0;

      // Calculate average session length (only from completed sessions)
      const completedSessions = recentSessions?.filter(s => s.session_duration_minutes !== null) || [];
      const avgSessionLength = completedSessions.length > 0
        ? Math.round(completedSessions.reduce((sum, s) => sum + (s.session_duration_minutes || 0), 0) / completedSessions.length)
        : 0;

      // Calculate trend
      const sessionTrend = previousTotalSessions > 0
        ? ((totalSessions - previousTotalSessions) / previousTotalSessions) * 100
        : totalSessions > 0 ? 100 : 0;

      // Count unique active users today
      const todayStart = startOfDay(new Date());
      const todaySessions = recentSessions?.filter(s => new Date(s.login_at) >= todayStart) || [];
      const activeUsersToday = new Set(todaySessions.map(s => s.user_id)).size;

      // Today's sessions count
      const todaySessionsCount = todaySessions.length;

      return {
        totalSessions,
        avgSessionLength,
        dailySessionsData,
        sessionTrend,
        activeUsersToday,
        todaySessionsCount,
      };
    },
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" />
            Session Metrics
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
            <LogIn className="h-5 w-5 text-indigo-500" />
            Session Metrics
          </span>
          <div className="flex items-center gap-1 text-sm">
            {sessionData?.sessionTrend && sessionData.sessionTrend > 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : sessionData?.sessionTrend && sessionData.sessionTrend < 0 ? (
              <TrendingDown className="h-4 w-4 text-red-600" />
            ) : (
              <Minus className="h-4 w-4 text-muted-foreground" />
            )}
            <span className={sessionData?.sessionTrend && sessionData.sessionTrend > 0 ? 'text-green-600' : sessionData?.sessionTrend && sessionData.sessionTrend < 0 ? 'text-red-600' : 'text-muted-foreground'}>
              {sessionData?.sessionTrend ? `${sessionData.sessionTrend > 0 ? '+' : ''}${sessionData.sessionTrend.toFixed(1)}%` : '0%'}
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
                {sessionData?.totalSessions.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                Sessions (7d)
              </div>
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">
                {sessionData?.avgSessionLength}m
              </div>
              <div className="text-xs text-muted-foreground">
                Avg Length
              </div>
            </div>
            <div>
              <div className="text-xl font-bold text-green-600">
                {sessionData?.todaySessionsCount || 0}
              </div>
              <div className="text-xs text-muted-foreground">
                Today Sessions
              </div>
            </div>
            <div>
              <div className="text-xl font-bold text-indigo-600">
                {sessionData?.activeUsersToday}
              </div>
              <div className="text-xs text-muted-foreground">
                Active Users
              </div>
            </div>
          </div>

          {/* Chart - Daily Sessions */}
          <div className="h-36 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sessionData?.dailySessionsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
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
                  formatter={(value: number, name: string) => [
                    `${value} sessions`,
                    'Login Sessions'
                  ]}
                  labelFormatter={(label, payload) => {
                    const item = payload?.[0]?.payload;
                    return item?.fullDate || label;
                  }}
                />
                <Bar
                  dataKey="sessions"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="text-xs text-center text-muted-foreground">
            Login sessions over the past 7 days (updates in real-time for today)
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
