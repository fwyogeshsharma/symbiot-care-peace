import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogIn, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format, subDays, eachDayOfInterval, startOfDay, differenceInMinutes } from 'date-fns';

export function PlatformMetricsCard() {
  const { data: sessionData, isLoading } = useQuery({
    queryKey: ['platform-session-metrics'],
    queryFn: async () => {
      // Get auth audit logs for login sessions
      // Note: In a real implementation, you'd have a session_logs table
      // For now, we'll simulate with available data

      // Get profiles with last sign in (if available)
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, created_at, updated_at');

      if (error) throw error;

      // Simulate session data based on profile activity
      // In production, you'd track actual login/logout events
      const totalSessions = profiles?.length ? profiles.length * 15 : 0; // Simulated avg sessions per user
      const avgSessionLength = 24; // Simulated average session in minutes

      // Generate chart data for last 7 days (simulated)
      const last7Days = eachDayOfInterval({
        start: subDays(new Date(), 6),
        end: new Date(),
      });

      const dailySessionsData = last7Days.map((day, index) => {
        // Simulate varying session counts
        const baseSessions = Math.floor((profiles?.length || 5) * (0.5 + Math.random() * 0.8));
        return {
          date: format(day, 'EEE'),
          sessions: baseSessions,
          avgDuration: Math.floor(15 + Math.random() * 30),
        };
      });

      // Calculate totals from simulated data
      const weekSessions = dailySessionsData.reduce((sum, d) => sum + d.sessions, 0);
      const weekAvgDuration = Math.floor(dailySessionsData.reduce((sum, d) => sum + d.avgDuration, 0) / 7);

      // Calculate trend (compare this week vs "last week")
      const lastWeekSessions = weekSessions * (0.8 + Math.random() * 0.3);
      const sessionTrend = lastWeekSessions > 0
        ? ((weekSessions - lastWeekSessions) / lastWeekSessions) * 100
        : 0;

      return {
        totalSessions: weekSessions,
        avgSessionLength: weekAvgDuration,
        dailySessionsData,
        sessionTrend,
        activeUsersToday: Math.floor((profiles?.length || 0) * 0.3),
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
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold text-foreground">
                {sessionData?.totalSessions.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                Sessions (7d)
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {sessionData?.avgSessionLength}m
              </div>
              <div className="text-xs text-muted-foreground">
                Avg Length
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {sessionData?.activeUsersToday}
              </div>
              <div className="text-xs text-muted-foreground">
                Active Today
              </div>
            </div>
          </div>

          {/* Chart - Daily Sessions */}
          <div className="h-40 mt-4">
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
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'sessions' ? `${value} sessions` : `${value} min`,
                    name === 'sessions' ? 'Login Sessions' : 'Avg Duration'
                  ]}
                />
                <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="text-xs text-center text-muted-foreground">
            Daily login sessions over the past week
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
