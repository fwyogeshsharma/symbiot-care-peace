import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Activity, TrendingUp, AlertCircle, BarChart3, RefreshCw, Download, Mail, Share2 } from 'lucide-react';
import { ILQWidget } from '@/components/dashboard/ILQWidget';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { useElderly } from '@/contexts/ElderlyContext';
import Header from '@/components/layout/Header';
import { useTranslation } from 'react-i18next';
import { useFileSystem } from '@/hooks/useFileSystem';
import { isNative } from '@/lib/capacitor/platform';

// Custom hook to detect mobile screen size
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

export default function ILQAnalytics() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { elderlyPersons, selectedPersonId, setSelectedPersonId, isLoading: elderlyLoading } = useElderly();
  const [timeRange, setTimeRange] = useState<string>('30');
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(true);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { writeFile, shareText, downloadCSV } = useFileSystem();
  const isMobile = useIsMobile();

  // Helper function for web download fallback
  const downloadFallback = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export ILQ data as CSV
  const exportCSVData = async () => {
    if (!ilqHistory || ilqHistory.length === 0) {
      toast.error(t('ilq.analytics.noDataToExport', 'No data to export'));
      return;
    }

    const csvData = ilqHistory.map(score => ({
      date: new Date(score.computation_timestamp).toLocaleDateString(),
      overall_score: score.score,
      health_vitals: score.health_vitals_score,
      physical_activity: score.physical_activity_score,
      cognitive_function: score.cognitive_function_score,
      environmental_safety: score.environmental_safety_score,
    }));

    const filename = `ILQ-Data-${new Date().toISOString().split('T')[0]}.csv`;
    await downloadCSV(filename, csvData);
    toast.success(t('ilq.analytics.csvExported', 'CSV data exported'));
  };

  const { data: ilqHistory, isLoading: historyLoading, refetch } = useQuery({
    queryKey: ['ilq-history', selectedPersonId, timeRange],
    queryFn: async () => {
      if (!selectedPersonId) return null;

      const daysAgo = new Date(Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('ilq_scores')
        .select('*')
        .eq('elderly_person_id', selectedPersonId)
        .gte('computation_timestamp', daysAgo)
        .order('computation_timestamp', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedPersonId,
  });

  const { data: ilqAlerts } = useQuery({
    queryKey: ['ilq-alerts', selectedPersonId],
    queryFn: async () => {
      if (!selectedPersonId) return null;

      const { data, error } = await supabase
        .from('ilq_alerts')
        .select('*')
        .eq('elderly_person_id', selectedPersonId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedPersonId,
  });

  // Auto-refresh compute every 10 seconds
  useEffect(() => {
    if (isAutoRefreshing && selectedPersonId) {
      autoRefreshIntervalRef.current = setInterval(() => {
        computeILQ(true); // Silent mode for auto-refresh
      }, 10000);
    }

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [isAutoRefreshing, selectedPersonId]);

  // Subscribe to real-time ILQ score updates
  useEffect(() => {
    if (!selectedPersonId) return;

    const channel = supabase
      .channel('ilq-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ilq_scores',
          filter: `elderly_person_id=eq.${selectedPersonId}`,
        },
        () => {
          // Refetch data on new ILQ scores
          queryClient.invalidateQueries({ queryKey: ['ilq-history', selectedPersonId] });
          queryClient.invalidateQueries({ queryKey: ['ilq-score-latest', selectedPersonId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedPersonId, queryClient]);

  const computeILQ = async (silent = false) => {
    if (!selectedPersonId) return;

    try {
      if (!silent) {
        toast.info(t('ilq.analytics.computingScore'));
      }

      const { data, error } = await supabase.functions.invoke('ilq-compute', {
        body: { elderly_person_id: selectedPersonId },
      });

      if (error) throw error;

      if (!silent) {
        toast.success(t('ilq.analytics.computedSuccess', { score: data.ilq_score }));
      }
      refetch();
    } catch (error: any) {
      console.error('Error computing ILQ:', error);
      if (!silent) {
        toast.error(error.message || t('ilq.analytics.computeFailed'));
      }
    }
  };

  const downloadReport = async () => {
    if (!selectedPersonId) return;

    try {
      toast.info(t('ilq.analytics.generatingReport'));

      const { data, error } = await supabase.functions.invoke('ilq-report-generator', {
        body: {
          elderly_person_id: selectedPersonId,
          period_days: parseInt(timeRange),
        },
      });

      if (error) throw error;

      const filename = `ILQ-Report-${new Date().toISOString().split('T')[0]}.html`;

      // On native platforms, save to filesystem
      if (isNative()) {
        const filePath = await writeFile(filename, data.html);
        if (filePath) {
          toast.success(t('ilq.analytics.reportSaved', { path: filename }));
        } else {
          // Fallback if file system fails
          downloadFallback(data.html, filename);
        }
      } else {
        // Web fallback - download directly
        downloadFallback(data.html, filename);
      }

      toast.success(t('ilq.analytics.reportDownloaded'));
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast.error(error.message || t('ilq.analytics.reportFailed'));
    }
  };

  // Show loading state
  if (elderlyLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header showBackButton title={t('ilq.analytics.title')} subtitle={t('ilq.analytics.subtitle')} />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
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

  // Use shorter labels on mobile for better fit
  const radarData = latestScore ? [
    {
      component: isMobile ? t('ilq.analytics.healthVitalsShort') : t('ilq.analytics.healthVitals'),
      value: latestScore.health_vitals_score ? (typeof latestScore.health_vitals_score === 'string' ? parseFloat(latestScore.health_vitals_score) : latestScore.health_vitals_score) : 0
    },
    {
      component: isMobile ? t('ilq.analytics.physicalActivityShort') : t('ilq.analytics.physicalActivity'),
      value: latestScore.physical_activity_score ? (typeof latestScore.physical_activity_score === 'string' ? parseFloat(latestScore.physical_activity_score) : latestScore.physical_activity_score) : 0
    },
    {
      component: isMobile ? t('ilq.analytics.cognitiveFunctionShort') : t('ilq.analytics.cognitiveFunction'),
      value: latestScore.cognitive_function_score ? (typeof latestScore.cognitive_function_score === 'string' ? parseFloat(latestScore.cognitive_function_score) : latestScore.cognitive_function_score) : 0
    },
    {
      component: isMobile ? t('ilq.analytics.environmentalShort') : t('ilq.analytics.environmentalSafety'),
      value: latestScore.environmental_safety_score ? (typeof latestScore.environmental_safety_score === 'string' ? parseFloat(latestScore.environmental_safety_score) : latestScore.environmental_safety_score) : 0
    },
    {
      component: isMobile ? t('ilq.analytics.emergencyShort') : t('ilq.analytics.emergencyResponse'),
      value: latestScore.emergency_response_score ? (typeof latestScore.emergency_response_score === 'string' ? parseFloat(latestScore.emergency_response_score) : latestScore.emergency_response_score) : 0
    },
    {
      component: isMobile ? t('ilq.analytics.socialShort') : t('ilq.analytics.socialEngagement'),
      value: latestScore.social_engagement_score ? (typeof latestScore.social_engagement_score === 'string' ? parseFloat(latestScore.social_engagement_score) : latestScore.social_engagement_score) : 0
    },
  ] : [];

  return (
    <div className="min-h-screen bg-background">
      <Header showBackButton title={t('ilq.analytics.title')} subtitle={t('ilq.analytics.subtitle')} />
      <main className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="h-8 w-8" />
              {t('ilq.analytics.title')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('ilq.analytics.description')}
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Select value={selectedPersonId || ''} onValueChange={setSelectedPersonId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder={t('ilq.analytics.selectPerson')} />
              </SelectTrigger>
              <SelectContent>
                {elderlyPersons?.map(person => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={() => computeILQ(false)} disabled={!selectedPersonId}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isAutoRefreshing ? 'animate-spin' : ''}`} />
              {t('ilq.analytics.computeILQ')}
            </Button>

            <Button
              onClick={() => setIsAutoRefreshing(!isAutoRefreshing)}
              variant={isAutoRefreshing ? 'default' : 'outline'}
              title={isAutoRefreshing ? t('ilq.analytics.autoRefreshOn') : t('ilq.analytics.autoRefreshOff')}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {isAutoRefreshing ? t('ilq.analytics.autoOn') : t('ilq.analytics.autoOff')}
            </Button>

            <Button onClick={downloadReport} disabled={!selectedPersonId || !ilqHistory || ilqHistory.length === 0} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              {t('ilq.analytics.downloadReport')}
            </Button>
          </div>
        </div>

        {selectedPersonId && (
          <div className="grid gap-6 md:grid-cols-3">
            <ILQWidget elderlyPersonId={selectedPersonId} hideViewDetails />
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t('ilq.analytics.sevenDayTrend')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="h-40 flex items-center justify-center">
                  <p className="text-muted-foreground">{t('ilq.analytics.loadingTrendData')}</p>
                </div>
              ) : chartData.length >= 2 ? (
                <div className="space-y-2">
                  <div className="text-3xl font-bold">
                    {(chartData[chartData.length - 1].score - chartData[0].score).toFixed(1)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {chartData[chartData.length - 1].score > chartData[0].score ? t('ilq.analytics.improving') : t('ilq.analytics.needsAttention')}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">{t('ilq.analytics.notEnoughData')}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                {t('ilq.analytics.activeAlerts')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {ilqAlerts && ilqAlerts.length > 0 ? (
                  ilqAlerts.slice(0, 3).map(alert => (
                    <div key={alert.id} className="text-sm border-l-2 border-destructive pl-2">
                      <p className="font-semibold">{t(`alerts.messages.${alert.alert_type}.title`, { defaultValue: alert.title })}</p>
                      <p className="text-xs text-muted-foreground">{t(`alerts.${alert.severity}`, { defaultValue: alert.severity })}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">{t('alerts.noAlerts')}</p>
                )}
              </div>
            </CardContent>
          </Card>
          </div>
        )}

        {selectedPersonId && (
          <Tabs defaultValue="history" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="history" className="text-xs sm:text-sm">{t('ilq.analytics.historicalTrends')}</TabsTrigger>
            <TabsTrigger value="components" className="text-xs sm:text-sm">{t('ilq.analytics.componentBreakdown')}</TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs sm:text-sm">{t('ilq.analytics.alertsHistory')}</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="space-y-4">
                  <div>
                    <CardTitle>{t('ilq.analytics.scoreHistory')}</CardTitle>
                    <CardDescription>{t('ilq.analytics.trackIndependence')}</CardDescription>
                  </div>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">{t('ilq.analytics.last7Days')}</SelectItem>
                      <SelectItem value="30">{t('ilq.analytics.last30Days')}</SelectItem>
                      <SelectItem value="90">{t('ilq.analytics.last90Days')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <p className="text-muted-foreground">{t('ilq.loadingChart')}</p>
                  </div>
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={3} name={t('ilq.ilqScore')} />
                      <Line type="monotone" dataKey="health" stroke="#10b981" strokeWidth={2} name={t('ilq.health')} />
                      <Line type="monotone" dataKey="activity" stroke="#3b82f6" strokeWidth={2} name={t('ilq.activity')} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-80 flex items-center justify-center">
                    <p className="text-muted-foreground">{t('ilq.analytics.noHistoricalData')}</p>
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
                    {t('ilq.analytics.componentAnalysis')}
                  </CardTitle>
                  <CardDescription>{t('ilq.analytics.componentAnalysisDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {radarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={isMobile ? 400 : 500}>
                      <RadarChart
                        data={radarData}
                        margin={isMobile ? { top: 40, right: 30, bottom: 40, left: 30 } : { top: 20, right: 80, bottom: 20, left: 80 }}
                      >
                        <PolarGrid />
                        <PolarAngleAxis
                          dataKey="component"
                          tick={{ fill: 'hsl(var(--foreground))', fontSize: isMobile ? 10 : 12 }}
                          tickLine={false}
                        />
                        <PolarRadiusAxis
                          domain={[0, 100]}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 8 : 10 }}
                          axisLine={false}
                        />
                        <Radar name={t('ilq.score')} dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-80 flex items-center justify-center">
                      <p className="text-muted-foreground">{t('ilq.analytics.noComponentData')}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('ilq.analytics.componentDetails')}</CardTitle>
                  <CardDescription>{t('ilq.analytics.componentDetailsDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {latestScore && (
                      <>
                        <div className="border-l-4 border-green-500 pl-4">
                          <h4 className="font-semibold">{t('ilq.analytics.healthVitalsPercent')}</h4>
                          <p className="text-sm text-muted-foreground">{t('ilq.analytics.healthVitalsDesc')}</p>
                          <p className="text-2xl font-bold mt-1">{(latestScore.health_vitals_score ? (typeof latestScore.health_vitals_score === 'string' ? parseFloat(latestScore.health_vitals_score) : latestScore.health_vitals_score) : 0).toFixed(0)}</p>
                        </div>

                        <div className="border-l-4 border-blue-500 pl-4">
                          <h4 className="font-semibold">{t('ilq.analytics.physicalActivityPercent')}</h4>
                          <p className="text-sm text-muted-foreground">{t('ilq.analytics.physicalActivityDesc')}</p>
                          <p className="text-2xl font-bold mt-1">{(latestScore.physical_activity_score ? (typeof latestScore.physical_activity_score === 'string' ? parseFloat(latestScore.physical_activity_score) : latestScore.physical_activity_score) : 0).toFixed(0)}</p>
                        </div>

                        <div className="border-l-4 border-purple-500 pl-4">
                          <h4 className="font-semibold">{t('ilq.analytics.cognitiveFunctionPercent')}</h4>
                          <p className="text-sm text-muted-foreground">{t('ilq.analytics.cognitiveFunctionDesc')}</p>
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
                <CardTitle>{t('ilq.alertsHistory', { defaultValue: 'ILQ Alerts History' })}</CardTitle>
                <CardDescription>{t('ilq.alertsHistoryDesc', { defaultValue: 'All alerts related to ILQ score changes' })}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ilqAlerts && ilqAlerts.length > 0 ? (
                    ilqAlerts.map(alert => (
                      <div key={alert.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-semibold">{t(`alerts.messages.${alert.alert_type}.title`, { defaultValue: alert.title })}</h4>
                            <p className="text-sm text-muted-foreground">{t(`alerts.messages.${alert.alert_type}.description`, { defaultValue: alert.description })}</p>
                            <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                              <span>{t('alerts.severity')}: <strong>{t(`alerts.${alert.severity}`, { defaultValue: alert.severity })}</strong></span>
                              <span>{t('alerts.status')}: <strong>{t(`alerts.statusOptions.${alert.status}`, { defaultValue: alert.status })}</strong></span>
                              {alert.score_change && (
                                <span>{t('ilq.change', { defaultValue: 'Change' })}: <strong>{alert.score_change.toFixed(1)} {t('ilq.points', { defaultValue: 'points' })}</strong></span>
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
                    <p className="text-center text-muted-foreground py-8">{t('alerts.noAlertsFound')}</p>
                  )}
                </div>
              </CardContent>
            </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
