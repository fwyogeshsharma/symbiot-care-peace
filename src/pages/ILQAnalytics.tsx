import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Activity, TrendingUp, AlertCircle, BarChart3, RefreshCw } from 'lucide-react';
import { ILQWidget } from '@/components/dashboard/ILQWidget';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

export default function ILQAnalytics() {
  const [selectedElderlyPerson, setSelectedElderlyPerson] = useState<string>('');
  const [timeRange, setTimeRange] = useState<string>('30');

  const { data: elderlyPersons } = useQuery({
    queryKey: ['elderly-persons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elderly_persons')
        .select('*')
        .eq('status', 'active')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  const { data: ilqHistory, isLoading: historyLoading, refetch } = useQuery({
    queryKey: ['ilq-history', selectedElderlyPerson, timeRange],
    queryFn: async () => {
      if (!selectedElderlyPerson) return null;
      
      const daysAgo = new Date(Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('ilq_scores')
        .select('*')
        .eq('elderly_person_id', selectedElderlyPerson)
        .gte('computation_timestamp', daysAgo)
        .order('computation_timestamp', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedElderlyPerson,
  });

  const { data: ilqAlerts } = useQuery({
    queryKey: ['ilq-alerts', selectedElderlyPerson],
    queryFn: async () => {
      if (!selectedElderlyPerson) return null;
      
      const { data, error } = await supabase
        .from('ilq_alerts')
        .select('*')
        .eq('elderly_person_id', selectedElderlyPerson)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedElderlyPerson,
  });

  const computeILQ = async () => {
    if (!selectedElderlyPerson) return;
    
    try {
      toast.info('Computing ILQ score...');
      
      const { data, error } = await supabase.functions.invoke('ilq-compute', {
        body: { elderly_person_id: selectedElderlyPerson },
      });
      
      if (error) throw error;
      
      toast.success(`ILQ computed successfully: ${data.ilq_score}`);
      refetch();
    } catch (error: any) {
      console.error('Error computing ILQ:', error);
      toast.error(error.message || 'Failed to compute ILQ');
    }
  };

  // Auto-select first elderly person
  if (elderlyPersons && elderlyPersons.length > 0 && !selectedElderlyPerson) {
    setSelectedElderlyPerson(elderlyPersons[0].id);
  }

  const chartData = ilqHistory?.map(score => ({
    date: new Date(score.computation_timestamp).toLocaleDateString(),
    score: typeof score.score === 'string' ? parseFloat(score.score) : score.score,
    health: score.health_vitals_score ? (typeof score.health_vitals_score === 'string' ? parseFloat(score.health_vitals_score) : score.health_vitals_score) : 0,
    activity: score.physical_activity_score ? (typeof score.physical_activity_score === 'string' ? parseFloat(score.physical_activity_score) : score.physical_activity_score) : 0,
    cognitive: score.cognitive_function_score ? (typeof score.cognitive_function_score === 'string' ? parseFloat(score.cognitive_function_score) : score.cognitive_function_score) : 0,
    safety: score.environmental_safety_score ? (typeof score.environmental_safety_score === 'string' ? parseFloat(score.environmental_safety_score) : score.environmental_safety_score) : 0,
  })) || [];

  const latestScore = ilqHistory && ilqHistory.length > 0 ? ilqHistory[ilqHistory.length - 1] : null;
  
  const radarData = latestScore ? [
    { component: 'Health Vitals', value: latestScore.health_vitals_score ? (typeof latestScore.health_vitals_score === 'string' ? parseFloat(latestScore.health_vitals_score) : latestScore.health_vitals_score) : 0 },
    { component: 'Physical Activity', value: latestScore.physical_activity_score ? (typeof latestScore.physical_activity_score === 'string' ? parseFloat(latestScore.physical_activity_score) : latestScore.physical_activity_score) : 0 },
    { component: 'Cognitive', value: latestScore.cognitive_function_score ? (typeof latestScore.cognitive_function_score === 'string' ? parseFloat(latestScore.cognitive_function_score) : latestScore.cognitive_function_score) : 0 },
    { component: 'Environmental', value: latestScore.environmental_safety_score ? (typeof latestScore.environmental_safety_score === 'string' ? parseFloat(latestScore.environmental_safety_score) : latestScore.environmental_safety_score) : 0 },
    { component: 'Emergency', value: latestScore.emergency_response_score ? (typeof latestScore.emergency_response_score === 'string' ? parseFloat(latestScore.emergency_response_score) : latestScore.emergency_response_score) : 0 },
    { component: 'Social', value: latestScore.social_engagement_score ? (typeof latestScore.social_engagement_score === 'string' ? parseFloat(latestScore.social_engagement_score) : latestScore.social_engagement_score) : 0 },
  ] : [];

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            ILQ Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Independent Living Quotient - Comprehensive Independence Assessment
          </p>
        </div>
        
        <div className="flex gap-4">
          <Select value={selectedElderlyPerson} onValueChange={setSelectedElderlyPerson}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select person" />
            </SelectTrigger>
            <SelectContent>
              {elderlyPersons?.map(person => (
                <SelectItem key={person.id} value={person.id}>
                  {person.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button onClick={computeILQ} disabled={!selectedElderlyPerson}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Compute ILQ
          </Button>
        </div>
      </div>

      {selectedElderlyPerson && (
        <div className="grid gap-6 md:grid-cols-3">
          <ILQWidget elderlyPersonId={selectedElderlyPerson} />
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                7-Day Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="h-40 flex items-center justify-center">
                  <p className="text-muted-foreground">Loading trend data...</p>
                </div>
              ) : chartData.length >= 2 ? (
                <div className="space-y-2">
                  <div className="text-3xl font-bold">
                    {(chartData[chartData.length - 1].score - chartData[0].score).toFixed(1)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {chartData[chartData.length - 1].score > chartData[0].score ? 'Improving' : 'Needs Attention'}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">Not enough data</p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {ilqAlerts && ilqAlerts.length > 0 ? (
                  ilqAlerts.slice(0, 3).map(alert => (
                    <div key={alert.id} className="text-sm border-l-2 border-destructive pl-2">
                      <p className="font-semibold">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{alert.severity}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">No active alerts</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedElderlyPerson && (
        <Tabs defaultValue="history" className="space-y-4">
          <TabsList>
            <TabsTrigger value="history">Historical Trends</TabsTrigger>
            <TabsTrigger value="components">Component Breakdown</TabsTrigger>
            <TabsTrigger value="alerts">Alerts History</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>ILQ Score History</CardTitle>
                    <CardDescription>Track independence levels over time</CardDescription>
                  </div>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
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
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={3} name="ILQ Score" />
                      <Line type="monotone" dataKey="health" stroke="#10b981" strokeWidth={2} name="Health" />
                      <Line type="monotone" dataKey="activity" stroke="#3b82f6" strokeWidth={2} name="Activity" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-80 flex items-center justify-center">
                    <p className="text-muted-foreground">No historical data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="components">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Component Analysis
                  </CardTitle>
                  <CardDescription>Latest score breakdown across all dimensions</CardDescription>
                </CardHeader>
                <CardContent>
                  {radarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="component" />
                        <PolarRadiusAxis domain={[0, 100]} />
                        <Radar name="Score" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-80 flex items-center justify-center">
                      <p className="text-muted-foreground">No component data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Component Details</CardTitle>
                  <CardDescription>Understanding each dimension</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {latestScore && (
                      <>
                        <div className="border-l-4 border-green-500 pl-4">
                          <h4 className="font-semibold">Health Vitals (30%)</h4>
                          <p className="text-sm text-muted-foreground">Heart rate, blood pressure, temperature</p>
                          <p className="text-2xl font-bold mt-1">{(latestScore.health_vitals_score ? (typeof latestScore.health_vitals_score === 'string' ? parseFloat(latestScore.health_vitals_score) : latestScore.health_vitals_score) : 0).toFixed(0)}</p>
                        </div>
                        
                        <div className="border-l-4 border-blue-500 pl-4">
                          <h4 className="font-semibold">Physical Activity (25%)</h4>
                          <p className="text-sm text-muted-foreground">Steps, movement patterns, mobility</p>
                          <p className="text-2xl font-bold mt-1">{(latestScore.physical_activity_score ? (typeof latestScore.physical_activity_score === 'string' ? parseFloat(latestScore.physical_activity_score) : latestScore.physical_activity_score) : 0).toFixed(0)}</p>
                        </div>
                        
                        <div className="border-l-4 border-purple-500 pl-4">
                          <h4 className="font-semibold">Cognitive Function (15%)</h4>
                          <p className="text-sm text-muted-foreground">Routine adherence, medication compliance</p>
                          <p className="text-2xl font-bold mt-1">{(latestScore.cognitive_function_score ? (typeof latestScore.cognitive_function_score === 'string' ? parseFloat(latestScore.cognitive_function_score) : latestScore.cognitive_function_score) : 0).toFixed(0)}</p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle>ILQ Alerts History</CardTitle>
                <CardDescription>All alerts related to ILQ score changes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ilqAlerts && ilqAlerts.length > 0 ? (
                    ilqAlerts.map(alert => (
                      <div key={alert.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-semibold">{alert.title}</h4>
                            <p className="text-sm text-muted-foreground">{alert.description}</p>
                            <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                              <span>Severity: <strong>{alert.severity}</strong></span>
                              <span>Status: <strong>{alert.status}</strong></span>
                              {alert.score_change && (
                                <span>Change: <strong>{alert.score_change.toFixed(1)} points</strong></span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(alert.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No alerts found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
