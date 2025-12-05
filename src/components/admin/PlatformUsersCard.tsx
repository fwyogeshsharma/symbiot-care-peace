import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';

export function PlatformUsersCard() {
  const { data: userData, isLoading } = useQuery({
    queryKey: ['platform-users-stats'],
    refetchInterval: 10000, // Auto-refresh every 10 seconds
    queryFn: async () => {
      // Get all profiles with their creation dates
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, created_at')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const totalUsers = profiles?.length || 0;

      // Calculate users added in last 30 days for trend
      const thirtyDaysAgo = subDays(new Date(), 30);
      const sixtyDaysAgo = subDays(new Date(), 60);

      const recentUsers = profiles?.filter(p => new Date(p.created_at) >= thirtyDaysAgo).length || 0;
      const previousPeriodUsers = profiles?.filter(p => {
        const date = new Date(p.created_at);
        return date >= sixtyDaysAgo && date < thirtyDaysAgo;
      }).length || 0;

      // Calculate trend percentage
      const trend = previousPeriodUsers > 0
        ? ((recentUsers - previousPeriodUsers) / previousPeriodUsers) * 100
        : recentUsers > 0 ? 100 : 0;

      // Generate chart data for last 30 days
      const last30Days = eachDayOfInterval({
        start: subDays(new Date(), 29),
        end: new Date(),
      });

      const chartData = last30Days.map(day => {
        const dayStart = startOfDay(day);
        const usersUpToDay = profiles?.filter(p =>
          new Date(p.created_at) <= dayStart
        ).length || 0;

        return {
          date: format(day, 'MMM dd'),
          users: usersUpToDay,
        };
      });

      return {
        totalUsers,
        recentUsers,
        trend,
        chartData,
      };
    },
  });

  const getTrendIcon = () => {
    if (!userData) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (userData.trend > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (userData.trend < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = () => {
    if (!userData) return 'text-muted-foreground';
    if (userData.trend > 0) return 'text-green-600';
    if (userData.trend < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Platform Users
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
            <Users className="h-5 w-5 text-primary" />
            Platform Users
          </span>
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            <span className={`text-sm font-medium ${getTrendColor()}`}>
              {userData?.trend ? `${userData.trend > 0 ? '+' : ''}${userData.trend.toFixed(1)}%` : '0%'}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main Metric */}
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-foreground">
              {userData?.totalUsers.toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground">total users</span>
          </div>

          <div className="text-sm text-muted-foreground">
            +{userData?.recentUsers} new in last 30 days
          </div>

          {/* Chart */}
          <div className="h-48 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userData?.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
