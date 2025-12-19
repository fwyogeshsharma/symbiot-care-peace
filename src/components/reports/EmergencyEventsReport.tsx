import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { AlertTriangle, AlertOctagon, Activity, Clock, MapPin, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface EmergencyEventsReportProps {
  selectedPerson: string;
  dateRange: { from: Date; to: Date };
}

export const EmergencyEventsReport = ({ selectedPerson, dateRange }: EmergencyEventsReportProps) => {
  const { t } = useTranslation();

  const { data: emergencyAlerts = [], isLoading } = useQuery({
    queryKey: ['emergency-events-report', selectedPerson, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('alerts')
        .select('*, elderly_persons(full_name)')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .in('severity', ['critical', 'high'])
        .order('created_at', { ascending: false });

      if (selectedPerson !== 'all') {
        query = query.eq('elderly_person_id', selectedPerson);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Filter for panic/SOS events
  const panicEvents = emergencyAlerts.filter(a =>
    a.alert_type === 'panic_button' ||
    a.alert_type === 'sos' ||
    a.alert_type === 'fall_detected'
  );

  // Calculate critical statistics
  const totalEmergencies = emergencyAlerts.length;
  const criticalAlerts = emergencyAlerts.filter(a => a.severity === 'critical').length;
  const unresolvedEmergencies = emergencyAlerts.filter(a => a.status === 'active').length;

  // Calculate fastest response time for critical events
  const resolvedCritical = emergencyAlerts.filter(a =>
    a.severity === 'critical' && (a.acknowledged_at || a.resolved_at)
  );

  const fastestResponse = resolvedCritical.length > 0
    ? Math.min(...resolvedCritical.map(alert => {
        const responseDate = alert.acknowledged_at || alert.resolved_at;
        if (!responseDate) return Infinity;
        return differenceInSeconds(
          new Date(responseDate),
          new Date(alert.created_at)
        );
      }))
    : 0;

  const avgCriticalResponse = resolvedCritical.length > 0
    ? Math.round(
        resolvedCritical.reduce((sum, alert) => {
          const responseDate = alert.acknowledged_at || alert.resolved_at;
          if (!responseDate) return sum;
          const seconds = differenceInSeconds(
            new Date(responseDate),
            new Date(alert.created_at)
          );
          return sum + seconds;
        }, 0) / resolvedCritical.length
      )
    : 0;

  // Emergency types distribution
  const panicButtonCount = emergencyAlerts.filter(a => a.alert_type === 'panic_button').length;
  const fallDetectedCount = emergencyAlerts.filter(a => a.alert_type === 'fall_detected').length;
  const vitalSignsCriticalCount = emergencyAlerts.filter(a => a.alert_type === 'vital_signs' && a.severity === 'critical').length;
  const geofenceCount = emergencyAlerts.filter(a => a.alert_type === 'geofence_breach').length;
  const inactivityCount = emergencyAlerts.filter(a => a.alert_type === 'inactivity').length;
  const otherEmergencyCount = emergencyAlerts.filter(a =>
    !['panic_button', 'fall_detected', 'vital_signs', 'geofence_breach', 'inactivity'].includes(a.alert_type || '')
  ).length;

  const emergencyTypeData = [
    {
      name: 'Panic Button',
      value: panicButtonCount,
      color: '#dc2626'
    },
    {
      name: 'Fall Detected',
      value: fallDetectedCount,
      color: '#ea580c'
    },
    {
      name: 'Vital Signs Critical',
      value: vitalSignsCriticalCount,
      color: '#ca8a04'
    },
    {
      name: 'Geofence Breach',
      value: geofenceCount,
      color: '#7c3aed'
    },
    {
      name: 'Inactivity Alert',
      value: inactivityCount,
      color: '#0891b2'
    },
    {
      name: 'Other Emergency',
      value: otherEmergencyCount,
      color: '#9333ea'
    },
  ].filter(item => item.value > 0);

  const hasEmergencyTypeData = emergencyTypeData.length > 0;

  // Daily emergency trend
  const dailyTrend = emergencyAlerts.reduce((acc: any, alert) => {
    const date = format(new Date(alert.created_at), 'MMM dd');
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const trendData = Object.entries(dailyTrend).map(([date, count]) => ({
    date,
    emergencies: count,
  }));

  const getSeverityColor = (severity: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case 'active': return 'destructive';
      case 'acknowledged': return 'secondary';
      case 'resolved': return 'default';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  if (emergencyAlerts.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="flex flex-col items-center gap-4">
            <AlertOctagon className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="font-medium">{t('reports.alerts.noEmergencies')}</p>
              <p className="text-sm text-muted-foreground">{t('reports.alerts.noEmergenciesDesc')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Emergency Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.alerts.totalEmergencies')}</CardTitle>
            <AlertOctagon className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{totalEmergencies}</div>
            <p className="text-xs text-muted-foreground">
              {criticalAlerts} {t('reports.alerts.criticalLevel')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.alerts.panicEvents')}</CardTitle>
            <Phone className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{panicEvents.length}</div>
            <p className="text-xs text-muted-foreground">
              {t('reports.alerts.requiresImmediate')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.alerts.fastestResponse')}</CardTitle>
            <Clock className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {fastestResponse < Infinity ? `${fastestResponse}s` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('reports.alerts.quickestReaction')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.alerts.avgCriticalResponse')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgCriticalResponse}s</div>
            <p className="text-xs text-muted-foreground">
              {t('reports.alerts.forCriticalEvents')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.alerts.emergencyTypes')}</CardTitle>
          </CardHeader>
          <CardContent>
            {hasEmergencyTypeData ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={emergencyTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {emergencyTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                <p>{t('common.noData')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('reports.alerts.emergencyTrend')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="emergencies"
                  stroke="#dc2626"
                  strokeWidth={2}
                  name={t('reports.alerts.emergencies')}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Emergency Events Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.alerts.emergencyTimeline')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {emergencyAlerts.slice(0, 15).map((alert) => {
              const responseTime = (alert.acknowledged_at || alert.resolved_at)
                ? differenceInSeconds(
                    new Date(alert.acknowledged_at || alert.resolved_at),
                    new Date(alert.created_at)
                  )
                : null;

              return (
                <div
                  key={alert.id}
                  className="flex items-start gap-4 p-4 border-l-4 border-destructive rounded-lg bg-destructive/5"
                >
                  <div className="flex-shrink-0 mt-1">
                    {alert.alert_type === 'panic_button' && <Phone className="h-5 w-5 text-destructive" />}
                    {alert.alert_type === 'fall_detected' && <Activity className="h-5 w-5 text-destructive" />}
                    {!['panic_button', 'fall_detected'].includes(alert.alert_type || '') && (
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-destructive">
                            {alert.alert_type?.replace(/_/g, ' ').toUpperCase()}
                          </h4>
                          <Badge variant={getSeverityColor(alert.severity || 'high')}>
                            {alert.severity || 'high'}
                          </Badge>
                          <Badge variant={getStatusColor(alert.status || 'active')}>
                            {alert.status || 'active'}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium mt-1">
                          {alert.title || t('reports.content.noTitle')}
                        </p>
                      </div>
                      {responseTime !== null && (
                        <div className="text-right">
                          <div className="text-sm font-semibold text-success">
                            {t('reports.alerts.responded')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {responseTime}s
                          </div>
                        </div>
                      )}
                    </div>

                    {alert.description && (
                      <p className="text-sm text-muted-foreground">
                        {alert.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(alert.created_at), 'MMM dd, yyyy HH:mm:ss')}
                      </span>
                      {(alert as any).elderly_persons?.full_name && (
                        <span>• {(alert as any).elderly_persons.full_name}</span>
                      )}
                      {alert.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {alert.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Unresolved Emergencies Warning */}
      {unresolvedEmergencies > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t('reports.alerts.unresolvedEmergencies')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {t('reports.alerts.unresolvedEmergenciesDesc', { count: unresolvedEmergencies })}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
