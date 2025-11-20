import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Activity, TrendingUp, AlertCircle, BarChart3, RefreshCw, Download, Mail } from 'lucide-react';
import { ILQWidget } from '@/components/dashboard/ILQWidget';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { InfoButton } from '@/components/help/InfoButton';

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

  const downloadReport = async () => {
    if (!selectedElderlyPerson) return;
    
    try {
      toast.info('Generating PDF report...');
      
      const { data, error } = await supabase.functions.invoke('ilq-report-generator', {
        body: { 
          elderly_person_id: selectedElderlyPerson,
          period_days: parseInt(timeRange),
        },
      });
      
      if (error) throw error;
      
      // Convert HTML to downloadable file
      const blob = new Blob([data.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ILQ-Report-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Report downloaded successfully!');
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast.error(error.message || 'Failed to generate report');
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
    <div className="min-h-screen bg-background p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 w-full">
        <div className="flex items-start gap-2 w-full">
          <Activity className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0 mt-1" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold">ILQ Analytics</h1>
              <InfoButton
                title="About ILQ Analytics"
                content={
                  <div className="space-y-2">
                    <p>This comprehensive dashboard provides in-depth analysis of the Independent Living Quotient score.</p>
                    <p className="text-xs">Use this page to:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Track ILQ score trends over time</li>
                      <li>Analyze individual component breakdowns</li>
                      <li>Monitor alerts and score changes</li>
                      <li>Generate detailed PDF reports</li>
                      <li>Compute new ILQ scores on-demand</li>
                    </ul>
                  </div>
                }
                side="bottom"
              />
            </div>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Independent Living Quotient - Comprehensive Independence Assessment
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full">
          <Select value={selectedElderlyPerson} onValueChange={setSelectedElderlyPerson}>
            <SelectTrigger className="w-full sm:w-[250px]">
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

          <div className="flex gap-3 sm:gap-4">
            <Button onClick={computeILQ} disabled={!selectedElderlyPerson} className="flex-1 sm:flex-initial">
              <RefreshCw className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Compute ILQ</span>
              <span className="sm:hidden">Compute</span>
            </Button>

            <Button onClick={downloadReport} disabled={!selectedElderlyPerson || !ilqHistory || ilqHistory.length === 0} variant="outline" className="flex-1 sm:flex-initial">
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Download Report</span>
              <span className="sm:hidden">Report</span>
            </Button>
          </div>
        </div>
      </div>

      {selectedElderlyPerson && (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
          <ILQWidget elderlyPersonId={selectedElderlyPerson} />
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                7-Day Trend
                <InfoButton
                  title="ILQ Trend Analysis"
                  content="Shows the change in ILQ score over the past 7 days. Positive values indicate improvement, negative values suggest attention is needed."
                  side="bottom"
                  className="scale-90"
                />
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
                <InfoButton
                  title="ILQ Alerts"
                  content="Displays active alerts triggered by significant changes in ILQ scores or component values. Alerts help identify areas requiring immediate attention."
                  side="bottom"
                  className="scale-90"
                />
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
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="history" className="text-xs sm:text-sm py-2">
              <span className="hidden sm:inline">Historical Trends</span>
              <span className="sm:hidden">Trends</span>
            </TabsTrigger>
            <TabsTrigger value="components" className="text-xs sm:text-sm py-2">
              <span className="hidden sm:inline">Component Breakdown</span>
              <span className="sm:hidden">Components</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs sm:text-sm py-2">
              <span className="hidden sm:inline">Alerts History</span>
              <span className="sm:hidden">Alerts</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>ILQ Score History</CardTitle>
                    <CardDescription>Track independence levels over time</CardDescription>
                  </div>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-full sm:w-[150px]">
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
                  <div className="h-64 sm:h-80 flex items-center justify-center">
                    <p className="text-muted-foreground">Loading chart...</p>
                  </div>
                ) : chartData.length > 0 ? (
                  <div className="w-full overflow-x-auto">
                    <ResponsiveContainer width="100%" height={300} className="sm:h-[400px]">
                      <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} name="ILQ Score" />
                        <Line type="monotone" dataKey="health" stroke="#10b981" strokeWidth={1.5} name="Health" />
                        <Line type="monotone" dataKey="activity" stroke="#3b82f6" strokeWidth={1.5} name="Activity" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 sm:h-80 flex items-center justify-center">
                    <p className="text-muted-foreground">No historical data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="components">
            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Component Analysis
                    <InfoButton
                      title="Component Radar Chart"
                      content="Visual representation of all ILQ components on a scale of 0-100. Larger areas indicate better performance across multiple dimensions of independent living."
                      side="bottom"
                      className="scale-90"
                    />
                  </CardTitle>
                  <CardDescription>Latest score breakdown across all dimensions</CardDescription>
                </CardHeader>
                <CardContent>
                  {radarData.length > 0 ? (
                    <div className="w-full overflow-x-auto">
                      <ResponsiveContainer width="100%" height={280} className="sm:h-[400px]">
                        <RadarChart data={radarData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="component" tick={{ fontSize: 9 }} />
                          <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 8 }} />
                          <Radar name="Score" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 sm:h-80 flex items-center justify-center">
                      <p className="text-muted-foreground">No component data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Component Details
                    <InfoButton
                      title="Component Weightings"
                      content="Each component contributes differently to the overall ILQ score. The percentages shown indicate each component's weight in the final calculation."
                      side="bottom"
                      className="scale-90"
                    />
                  </CardTitle>
                  <CardDescription>Understanding each dimension</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 sm:space-y-4">
                    {latestScore && (
                      <>
                        <div className="border-l-4 border-green-500 pl-3 sm:pl-4 py-1">
                          <h4 className="font-semibold text-sm sm:text-base">Health Vitals (30%)</h4>
                          <p className="text-xs sm:text-sm text-muted-foreground">Heart rate, blood pressure, temperature</p>
                          <p className="text-xl sm:text-2xl font-bold mt-1">{(latestScore.health_vitals_score ? (typeof latestScore.health_vitals_score === 'string' ? parseFloat(latestScore.health_vitals_score) : latestScore.health_vitals_score) : 0).toFixed(0)}</p>
                        </div>

                        <div className="border-l-4 border-blue-500 pl-3 sm:pl-4 py-1">
                          <h4 className="font-semibold text-sm sm:text-base">Physical Activity (25%)</h4>
                          <p className="text-xs sm:text-sm text-muted-foreground">Steps, movement patterns, mobility</p>
                          <p className="text-xl sm:text-2xl font-bold mt-1">{(latestScore.physical_activity_score ? (typeof latestScore.physical_activity_score === 'string' ? parseFloat(latestScore.physical_activity_score) : latestScore.physical_activity_score) : 0).toFixed(0)}</p>
                        </div>

                        <div className="border-l-4 border-purple-500 pl-3 sm:pl-4 py-1">
                          <h4 className="font-semibold text-sm sm:text-base">Cognitive Function (15%)</h4>
                          <p className="text-xs sm:text-sm text-muted-foreground">Routine adherence, medication compliance</p>
                          <p className="text-xl sm:text-2xl font-bold mt-1">{(latestScore.cognitive_function_score ? (typeof latestScore.cognitive_function_score === 'string' ? parseFloat(latestScore.cognitive_function_score) : latestScore.cognitive_function_score) : 0).toFixed(0)}</p>
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
                <div className="space-y-3 sm:space-y-4">
                  {ilqAlerts && ilqAlerts.length > 0 ? (
                    ilqAlerts.map(alert => (
                      <div key={alert.id} className="border rounded-lg p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="space-y-1 flex-1">
                            <h4 className="font-semibold text-sm sm:text-base">{alert.title}</h4>
                            <p className="text-xs sm:text-sm text-muted-foreground">{alert.description}</p>
                            <div className="flex flex-wrap gap-2 sm:gap-4 text-xs text-muted-foreground mt-2">
                              <span>Severity: <strong>{alert.severity}</strong></span>
                              <span>Status: <strong>{alert.status}</strong></span>
                              {alert.score_change && (
                                <span>Change: <strong>{alert.score_change.toFixed(1)} points</strong></span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
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
