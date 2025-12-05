import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';

export function BillableSubscribersCard() {
  const { data: subscriberData, isLoading } = useQuery({
    queryKey: ['billable-subscribers-stats'],
    refetchInterval: 10000, // Auto-refresh every 10 seconds
    queryFn: async () => {
      // Get elderly persons (these represent billable subscribers - people being monitored)
      const { data: elderlyPersons, error } = await supabase
        .from('elderly_persons')
        .select('id, created_at')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const totalSubscribers = elderlyPersons?.length || 0;

      // Calculate subscribers added in last 30 days for trend
      const thirtyDaysAgo = subDays(new Date(), 30);
      const sixtyDaysAgo = subDays(new Date(), 60);

      const recentSubscribers = elderlyPersons?.filter(p => new Date(p.created_at) >= thirtyDaysAgo).length || 0;
      const previousPeriodSubscribers = elderlyPersons?.filter(p => {
        const date = new Date(p.created_at);
        return date >= sixtyDaysAgo && date < thirtyDaysAgo;
      }).length || 0;

      // Calculate trend percentage
      const trend = previousPeriodSubscribers > 0
        ? ((recentSubscribers - previousPeriodSubscribers) / previousPeriodSubscribers) * 100
        : recentSubscribers > 0 ? 100 : 0;

      // Generate chart data for last 30 days
      const last30Days = eachDayOfInterval({
        start: subDays(new Date(), 29),
        end: new Date(),
      });

      const chartData = last30Days.map(day => {
        const dayStart = startOfDay(day);
        const subscribersUpToDay = elderlyPersons?.filter(p =>
          new Date(p.created_at) <= dayStart
        ).length || 0;

        return {
          date: format(day, 'MMM dd'),
          subscribers: subscribersUpToDay,
        };
      });

      // Calculate estimated MRR (Monthly Recurring Revenue) - assuming $50/subscriber/month
      const estimatedMRR = totalSubscribers * 50;

      return {
        totalSubscribers,
        recentSubscribers,
        trend,
        chartData,
        estimatedMRR,
      };
    },
  });

  const getTrendIcon = () => {
    if (!subscriberData) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (subscriberData.trend > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (subscriberData.trend < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = () => {
    if (!subscriberData) return 'text-muted-foreground';
    if (subscriberData.trend > 0) return 'text-green-600';
    if (subscriberData.trend < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Billable Subscribers
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
            <CreditCard className="h-5 w-5 text-green-600" />
            Billable Subscribers
          </span>
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            <span className={`text-sm font-medium ${getTrendColor()}`}>
              {subscriberData?.trend ? `${subscriberData.trend > 0 ? '+' : ''}${subscriberData.trend.toFixed(1)}%` : '0%'}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main Metric */}
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-foreground">
              {subscriberData?.totalSubscribers.toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground">active subscribers</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              +{subscriberData?.recentSubscribers} new in last 30 days
            </span>
            <span className="text-green-600 font-medium">
              Est. MRR: ${subscriberData?.estimatedMRR.toLocaleString()}
            </span>
          </div>

          {/* Chart */}
          <div className="h-48 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={subscriberData?.chartData}>
                <defs>
                  <linearGradient id="subscriberGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                <Area
                  type="monotone"
                  dataKey="subscribers"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  fill="url(#subscriberGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
