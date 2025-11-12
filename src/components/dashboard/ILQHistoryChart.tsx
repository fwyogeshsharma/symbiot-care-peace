import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface ILQHistoryChartProps {
  elderlyPersonId: string;
  days?: number;
}

export function ILQHistoryChart({ elderlyPersonId, days = 30 }: ILQHistoryChartProps) {
  const { data: ilqHistory, isLoading } = useQuery({
    queryKey: ['ilq-history-chart', elderlyPersonId, days],
    queryFn: async () => {
      const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('ilq_scores')
        .select('*')
        .eq('elderly_person_id', elderlyPersonId)
        .gte('computation_timestamp', daysAgo)
        .order('computation_timestamp', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!elderlyPersonId,
  });

  const chartData = ilqHistory?.map(score => ({
    date: new Date(score.computation_timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: typeof score.score === 'string' ? parseFloat(score.score) : score.score,
    health: score.health_vitals_score ? (typeof score.health_vitals_score === 'string' ? parseFloat(score.health_vitals_score) : score.health_vitals_score) : 0,
    activity: score.physical_activity_score ? (typeof score.physical_activity_score === 'string' ? parseFloat(score.physical_activity_score) : score.physical_activity_score) : 0,
  })) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            ILQ Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading chart...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            ILQ Trend
          </CardTitle>
          <CardDescription>Last {days} days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No ILQ data available for the selected period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          ILQ Trend
        </CardTitle>
        <CardDescription>Independence score over last {days} days</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              domain={[0, 100]} 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="score" 
              stroke="hsl(var(--primary))" 
              strokeWidth={3} 
              name="ILQ Score"
              dot={{ fill: 'hsl(var(--primary))' }}
            />
            <Line 
              type="monotone" 
              dataKey="health" 
              stroke="#10b981" 
              strokeWidth={2} 
              name="Health"
              strokeDasharray="5 5"
            />
            <Line 
              type="monotone" 
              dataKey="activity" 
              stroke="#3b82f6" 
              strokeWidth={2} 
              name="Activity"
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
