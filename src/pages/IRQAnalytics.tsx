import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertCircle, BarChart3, RefreshCw, ClipboardPlus } from 'lucide-react';
import { IRQWidget } from '@/components/dashboard/IRQWidget';
import { RecoveryCheckinForm } from '@/components/dashboard/RecoveryCheckinForm';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { useElderly } from '@/contexts/ElderlyContext';
import Header from '@/components/layout/Header';
import { Footer } from '@/components/Footer';
import { COMPONENT_LABELS, formatCleanDays, IRQScoreRow, describeFunctionError } from '@/lib/irq';

const num = (v: number | string | null | undefined): number =>
  v === null || v === undefined ? 0 : typeof v === 'string' ? parseFloat(v) : v;

export default function IRQAnalytics() {
  const queryClient = useQueryClient();
  const { elderlyPersons, selectedPersonId, setSelectedPersonId, isLoading: elderlyLoading } = useElderly();
  const [timeRange, setTimeRange] = useState<string>('30');
  const [showCheckinForm, setShowCheckinForm] = useState(false);

  const { data: irqHistory, isLoading: historyLoading, refetch } = useQuery({
    queryKey: ['irq-history', selectedPersonId, timeRange],
    queryFn: async (): Promise<IRQScoreRow[]> => {
      if (!selectedPersonId) return [];

      let query = supabase
        .from('irq_scores')
        .select('*')
        .eq('elderly_person_id', selectedPersonId)
        .order('computation_timestamp', { ascending: true });

      if (timeRange !== 'all') {
        const daysAgo = new Date(Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('computation_timestamp', daysAgo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as IRQScoreRow[];
    },
    enabled: !!selectedPersonId,
  });

  const { data: irqAlerts } = useQuery({
    queryKey: ['irq-alerts', selectedPersonId],
    queryFn: async () => {
      if (!selectedPersonId) return [];
      const { data, error } = await supabase
        .from('irq_alerts')
        .select('*')
        .eq('elderly_person_id', selectedPersonId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedPersonId,
  });

  useEffect(() => {
    if (!selectedPersonId) return;

    const channel = supabase
      .channel('irq-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'irq_scores', filter: `elderly_person_id=eq.${selectedPersonId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['irq-history', selectedPersonId] });
          queryClient.invalidateQueries({ queryKey: ['irq-score-latest', selectedPersonId] });
          queryClient.invalidateQueries({ queryKey: ['irq-alerts', selectedPersonId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedPersonId, queryClient]);

  const chartData = useMemo(() => {
    if (!irqHistory || irqHistory.length === 0) return [];

    const groupedByDay = irqHistory.reduce((acc, row) => {
      const date = new Date(row.computation_timestamp);
      const dayKey = date.toISOString().split('T')[0];

      if (!acc[dayKey]) {
        acc[dayKey] = { date, scores: [], physiological: [], activity: [], sobriety: [], craving: [] };
      }

      acc[dayKey].scores.push(num(row.score));
      acc[dayKey].physiological.push(num(row.physiological_stress_score));
      acc[dayKey].activity.push(num(row.activity_routine_score));
      acc[dayKey].sobriety.push(num(row.sobriety_score));
      acc[dayKey].craving.push(num(row.craving_control_score));

      return acc;
    }, {} as Record<string, { date: Date; scores: number[]; physiological: number[]; activity: number[]; sobriety: number[]; craving: number[] }>);

    const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

    return Object.values(groupedByDay)
      .map((day) => ({
        date: day.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        fullDate: day.date,
        score: Math.round(avg(day.scores) * 10) / 10,
        physiological: Math.round(avg(day.physiological) * 10) / 10,
        activity: Math.round(avg(day.activity) * 10) / 10,
        sobriety: Math.round(avg(day.sobriety) * 10) / 10,
        craving: Math.round(avg(day.craving) * 10) / 10,
      }))
      .sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());
  }, [irqHistory]);

  const computeIRQ = async () => {
    if (!selectedPersonId) return;
    try {
      toast.info('Computing IRQ score...');
      const { data, error } = await supabase.functions.invoke('irq-compute', {
        body: { elderly_person_id: selectedPersonId },
      });
      if (error) throw error;
      toast.success(`IRQ score computed: ${data.irq_score}`);
      refetch();
    } catch (error) {
      console.error('Error computing IRQ:', error);
      toast.error(await describeFunctionError(error));
    }
  };

  if (elderlyLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header showBackButton title="IRQ Analytics" subtitle="Individual Recovery Quotient" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  const latestScore = irqHistory && irqHistory.length > 0 ? irqHistory[irqHistory.length - 1] : null;
  const sobrietyDetail = latestScore?.detailed_metrics?.sobriety as { cleanDays: number | null } | undefined;
  const cleanDays = sobrietyDetail?.cleanDays ?? null;

  const radarData = latestScore
    ? (Object.keys(COMPONENT_LABELS) as (keyof typeof COMPONENT_LABELS)[]).map((key) => ({
        component: COMPONENT_LABELS[key],
        value: num((latestScore as unknown as Record<string, number | string | null>)[`${key}_score`]),
      }))
    : [];

  return (
    <div className="min-h-screen bg-background">
      <Header showBackButton title="IRQ Analytics" subtitle="Individual Recovery Quotient" />
      <main className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="h-8 w-8" />
              IRQ Analytics
            </h1>
            <p className="text-muted-foreground mt-1">
              Recovery progress from device signals, craving check-ins, and sobriety tracking.
            </p>
            {cleanDays !== null && (
              <Badge variant="secondary" className="mt-2">
                {formatCleanDays(cleanDays)}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-4">
            <Select value={selectedPersonId || ''} onValueChange={setSelectedPersonId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select person" />
              </SelectTrigger>
              <SelectContent>
                {elderlyPersons?.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={computeIRQ} disabled={!selectedPersonId}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Compute IRQ
            </Button>

            <Button onClick={() => setShowCheckinForm(true)} disabled={!selectedPersonId} variant="secondary">
              <ClipboardPlus className="h-4 w-4 mr-2" />
              Log check-in
            </Button>
          </div>
        </div>

        {selectedPersonId && (
          <div className="grid gap-6 md:grid-cols-2">
            <IRQWidget elderlyPersonId={selectedPersonId} hideViewDetails />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Active Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {irqAlerts && irqAlerts.filter((a) => a.status === 'active').length > 0 ? (
                    irqAlerts
                      .filter((a) => a.status === 'active')
                      .slice(0, 5)
                      .map((alert) => (
                        <div key={alert.id} className="text-sm border-l-2 border-destructive pl-2">
                          <p className="font-semibold">{alert.title}</p>
                          <p className="text-xs text-muted-foreground">{alert.description}</p>
                        </div>
                      ))
                  ) : (
                    <p className="text-muted-foreground text-sm">No active alerts.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedPersonId && (
          <Tabs defaultValue="history" className="space-y-4">
            <TabsList>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="components">Components</TabsTrigger>
              <TabsTrigger value="alerts">Alert history</TabsTrigger>
            </TabsList>

            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Score history</CardTitle>
                      <CardDescription>IRQ score and component trends over time</CardDescription>
                    </div>
                    <Select value={timeRange} onValueChange={setTimeRange}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">Last 7 days</SelectItem>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        <SelectItem value="90">Last 90 days</SelectItem>
                        <SelectItem value="all">All available data</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {historyLoading ? (
                    <div className="h-80 flex items-center justify-center">
                      <p className="text-muted-foreground">Loading chart...</p>
                    </div>
                  ) : chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={450}>
                      <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                          tickLine={{ stroke: 'hsl(var(--border))' }}
                          angle={chartData.length > 14 ? -45 : 0}
                          textAnchor={chartData.length > 14 ? 'end' : 'middle'}
                          height={chartData.length > 14 ? 60 : 30}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 12 }}
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                          tickLine={{ stroke: 'hsl(var(--border))' }}
                          label={{ value: 'Score', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          wrapperStyle={{ zIndex: 1000 }}
                        />
                        <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} iconType="line" />
                        <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={3} name="IRQ score" dot={{ fill: 'hsl(var(--primary))', r: 4 }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="sobriety" stroke="#10b981" strokeWidth={2} name="Sobriety" dot={{ fill: '#10b981', r: 3 }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="craving" stroke="#f59e0b" strokeWidth={2} name="Craving control" dot={{ fill: '#f59e0b', r: 3 }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="physiological" stroke="#3b82f6" strokeWidth={2} name="Physiological" dot={{ fill: '#3b82f6', r: 3 }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="activity" stroke="#a855f7" strokeWidth={2} name="Activity" dot={{ fill: '#a855f7', r: 3 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-80 flex items-center justify-center">
                      <p className="text-muted-foreground">No historical data yet — compute a first score above.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="components">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Component analysis
                  </CardTitle>
                  <CardDescription>Latest computed breakdown across all four components</CardDescription>
                </CardHeader>
                <CardContent>
                  {radarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="component" />
                        <PolarRadiusAxis domain={[0, 100]} />
                        <Radar name="IRQ score" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-80 flex items-center justify-center">
                      <p className="text-muted-foreground">No component data yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="alerts">
              <Card>
                <CardHeader>
                  <CardTitle>Alert history</CardTitle>
                  <CardDescription>Score drops, low scores, weak components, and logged relapses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {irqAlerts && irqAlerts.length > 0 ? (
                      irqAlerts.map((alert) => (
                        <div key={alert.id} className="border rounded-lg p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-sm">{alert.title}</p>
                            <Badge variant={alert.severity === 'critical' ? 'destructive' : 'outline'} className="text-xs shrink-0">
                              {alert.severity}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {new Date(alert.created_at).toLocaleString()} • {alert.status}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm">No alerts yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>

      {selectedPersonId && (
        <RecoveryCheckinForm
          elderlyPersonId={selectedPersonId}
          open={showCheckinForm}
          onOpenChange={setShowCheckinForm}
          onSaved={() => {
            setShowCheckinForm(false);
            refetch();
          }}
        />
      )}

      <Footer />
    </div>
  );
}
