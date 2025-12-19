import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { Clock, TrendingDown, TrendingUp, Target, Award, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ScatterChart, Scatter, ZAxis } from 'recharts';

interface ResponseTimeAnalysisReportProps {
  selectedPerson: string;
  dateRange: { from: Date; to: Date };
}

export const ResponseTimeAnalysisReport = ({ selectedPerson, dateRange }: ResponseTimeAnalysisReportProps) => {
  const { t } = useTranslation();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['response-time-analysis-report', selectedPerson, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('alerts')
        .select('*, elderly_persons(full_name)')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .order('created_at', { ascending: false });

      if (selectedPerson !== 'all') {
        query = query.eq('elderly_person_id', selectedPerson);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate response times
  const alertsWithResponse = alerts.filter(a =>
    (a.status === 'acknowledged' || a.status === 'resolved') && (a.acknowledged_at || a.resolved_at)
  ).map(alert => {
    const acknowledgeTime = alert.acknowledged_at
      ? differenceInSeconds(new Date(alert.acknowledged_at), new Date(alert.created_at))
      : null;

    const resolveTime = alert.resolved_at
      ? differenceInMinutes(new Date(alert.resolved_at), new Date(alert.created_at))
      : null;

    return {
      ...alert,
      acknowledgeSeconds: acknowledgeTime,
      resolveMinutes: resolveTime,
    };
  });

  // Overall statistics
  const totalResponded = alertsWithResponse.length;
  const avgAcknowledgeTime = alertsWithResponse.length > 0
    ? Math.round(
        alertsWithResponse.reduce((sum, a) => sum + (a.acknowledgeSeconds || 0), 0) /
        alertsWithResponse.filter(a => a.acknowledgeSeconds).length
      )
    : 0;

  const avgResolveTime = alertsWithResponse.length > 0
    ? Math.round(
        alertsWithResponse.reduce((sum, a) => sum + (a.resolveMinutes || 0), 0) /
        alertsWithResponse.filter(a => a.resolveMinutes).length
      )
    : 0;

  // Response time by severity
  const bySeverity = ['critical', 'high', 'medium', 'low'].map(severity => {
    const severityAlerts = alertsWithResponse.filter(a => a.severity === severity);
    const avgTime = severityAlerts.length > 0
      ? Math.round(
          severityAlerts.reduce((sum, a) => sum + (a.acknowledgeSeconds || 0), 0) / severityAlerts.length
        )
      : 0;

    return {
      severity: severity.charAt(0).toUpperCase() + severity.slice(1),
      avgResponseSeconds: avgTime,
      count: severityAlerts.length,
    };
  }).filter(item => item.count > 0);

  // Response time by alert type
  const byType = alerts.reduce((acc: any, alert) => {
    const type = alert.alert_type || 'other';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(alert);
    return acc;
  }, {});

  const typeResponseData = Object.entries(byType).map(([type, typeAlerts]: [string, any]) => {
    const responded = typeAlerts.filter((a: any) =>
      (a.status === 'acknowledged' || a.status === 'resolved') && (a.acknowledged_at || a.resolved_at)
    );

    const avgTime = responded.length > 0
      ? Math.round(
          responded.reduce((sum: number, a: any) => {
            const time = a.acknowledged_at
              ? differenceInSeconds(new Date(a.acknowledged_at), new Date(a.created_at))
              : 0;
            return sum + time;
          }, 0) / responded.length
        )
      : 0;

    return {
      type: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      avgResponseSeconds: avgTime,
      totalAlerts: typeAlerts.length,
      respondedAlerts: responded.length,
    };
  }).filter(item => item.respondedAlerts > 0);

  // Daily performance trend
  const dailyPerformance = alertsWithResponse.reduce((acc: any, alert) => {
    const date = format(new Date(alert.created_at), 'MMM dd');
    if (!acc[date]) {
      acc[date] = { total: 0, sumTime: 0, count: 0 };
    }
    acc[date].total += 1;
    if (alert.acknowledgeSeconds) {
      acc[date].sumTime += alert.acknowledgeSeconds;
      acc[date].count += 1;
    }
    return acc;
  }, {});

  const performanceData = Object.entries(dailyPerformance).map(([date, data]: [string, any]) => ({
    date,
    avgResponseSeconds: data.count > 0 ? Math.round(data.sumTime / data.count) : 0,
    totalAlerts: data.total,
  }));

  // Performance benchmarks
  const under1Min = alertsWithResponse.filter(a => (a.acknowledgeSeconds || 0) < 60).length;
  const under5Min = alertsWithResponse.filter(a => (a.acknowledgeSeconds || 0) < 300).length;
  const over10Min = alertsWithResponse.filter(a => (a.acknowledgeSeconds || 0) > 600).length;

  // Best and worst response times
  const sortedByResponse = [...alertsWithResponse]
    .filter(a => a.acknowledgeSeconds)
    .sort((a, b) => (a.acknowledgeSeconds || 0) - (b.acknowledgeSeconds || 0));

  const bestResponses = sortedByResponse.slice(0, 5);
  const worstResponses = sortedByResponse.slice(-5).reverse();

  const getPerformanceColor = (seconds: number): "default" | "destructive" | "outline" | "secondary" => {
    if (seconds < 60) return 'default'; // Under 1 minute - excellent
    if (seconds < 300) return 'secondary'; // Under 5 minutes - good
    return 'destructive'; // Over 5 minutes - needs improvement
  };

  if (isLoading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  if (alertsWithResponse.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="flex flex-col items-center gap-4">
            <Clock className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="font-medium">{t('reports.alerts.noResponseData')}</p>
              <p className="text-sm text-muted-foreground">{t('reports.alerts.noResponseDataDesc')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.alerts.totalResponded')}</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalResponded}</div>
            <p className="text-xs text-muted-foreground">
              {t('reports.alerts.outOf')} {alerts.length} {t('reports.alerts.totalAlerts')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.alerts.avgAcknowledgeTime')}</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {avgAcknowledgeTime < 60
                ? `${avgAcknowledgeTime}s`
                : `${Math.round(avgAcknowledgeTime / 60)}m`}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('reports.alerts.timeToAcknowledge')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.alerts.avgResolveTime')}</CardTitle>
            <Clock className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{avgResolveTime}m</div>
            <p className="text-xs text-muted-foreground">
              {t('reports.alerts.timeToResolve')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.alerts.under1Minute')}</CardTitle>
            <Award className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{under1Min}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((under1Min / totalResponded) * 100)}% {t('reports.alerts.excellentResponse')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Benchmarks */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.alerts.performanceBenchmarks')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('reports.alerts.under1Min')}</span>
                <Badge variant="default">{under1Min}</Badge>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-success"
                  style={{ width: `${(under1Min / totalResponded) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.round((under1Min / totalResponded) * 100)}% - {t('reports.alerts.excellent')}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('reports.alerts.under5Min')}</span>
                <Badge variant="secondary">{under5Min}</Badge>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${(under5Min / totalResponded) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.round((under5Min / totalResponded) * 100)}% - {t('reports.alerts.good')}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('reports.alerts.over10Min')}</span>
                <Badge variant="destructive">{over10Min}</Badge>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-destructive"
                  style={{ width: `${(over10Min / totalResponded) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.round((over10Min / totalResponded) * 100)}% - {t('reports.alerts.needsImprovement')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.alerts.responseTimeBySeverity')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={bySeverity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="severity" />
                <YAxis label={{ value: 'Seconds', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgResponseSeconds" fill="#3b82f6" name={t('reports.alerts.avgResponse')} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('reports.alerts.dailyPerformanceTrend')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: 'Seconds', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avgResponseSeconds"
                  stroke="#10b981"
                  strokeWidth={2}
                  name={t('reports.alerts.avgResponse')}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Response Time by Alert Type */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.alerts.responseTimeByType')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={typeResponseData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" label={{ value: 'Seconds', position: 'insideBottom', offset: -5 }} />
              <YAxis type="category" dataKey="type" width={150} />
              <Tooltip />
              <Legend />
              <Bar dataKey="avgResponseSeconds" fill="#8b5cf6" name={t('reports.alerts.avgResponse')} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Best Responses */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-success" />
              {t('reports.alerts.bestResponses')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bestResponses.map((alert, index) => (
                <div key={alert.id} className="flex items-start justify-between p-3 border rounded-lg bg-success/5">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-success">#{index + 1}</span>
                      <span className="text-sm font-medium">
                        {alert.alert_type?.replace(/_/g, ' ')}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(alert.created_at), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-success">
                      {(alert.acknowledgeSeconds || 0) < 60
                        ? `${alert.acknowledgeSeconds}s`
                        : `${Math.round((alert.acknowledgeSeconds || 0) / 60)}m`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {t('reports.alerts.slowestResponses')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {worstResponses.map((alert, index) => (
                <div key={alert.id} className="flex items-start justify-between p-3 border rounded-lg bg-destructive/5">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-destructive">#{index + 1}</span>
                      <span className="text-sm font-medium">
                        {alert.alert_type?.replace(/_/g, ' ')}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(alert.created_at), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-destructive">
                      {(alert.acknowledgeSeconds || 0) < 60
                        ? `${alert.acknowledgeSeconds}s`
                        : `${Math.round((alert.acknowledgeSeconds || 0) / 60)}m`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {over10Min > 0 && (
        <Card className="border-orange-500/50 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <TrendingUp className="h-5 w-5" />
              {t('reports.alerts.performanceRecommendations')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-orange-500">•</span>
                <span>{t('reports.alerts.recommendation1', { count: over10Min })}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500">•</span>
                <span>{t('reports.alerts.recommendation2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500">•</span>
                <span>{t('reports.alerts.recommendation3')}</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
