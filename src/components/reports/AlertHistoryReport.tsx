import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, differenceInMinutes } from 'date-fns';
import { AlertTriangle, CheckCircle2, Clock, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AlertHistoryReportProps {
  selectedPerson: string;
  dateRange: { from: Date; to: Date };
}

export const AlertHistoryReport = ({ selectedPerson, dateRange }: AlertHistoryReportProps) => {
  const { t } = useTranslation();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alert-history-report', selectedPerson, dateRange],
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

  // Calculate statistics
  const totalAlerts = alerts.length;
  const activeAlerts = alerts.filter(a => a.status === 'active').length;
  const acknowledgedAlerts = alerts.filter(a => a.status === 'acknowledged').length;
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved').length;

  // Calculate average response time (for resolved/acknowledged alerts)
  const alertsWithResponse = alerts.filter(a =>
    (a.status === 'acknowledged' || a.status === 'resolved') && (a.acknowledged_at || a.resolved_at)
  );

  const avgResponseTime = alertsWithResponse.length > 0
    ? Math.round(
        alertsWithResponse.reduce((sum, alert) => {
          const responseDate = alert.resolved_at || alert.acknowledged_at;
          if (!responseDate) return sum;
          const minutes = differenceInMinutes(
            new Date(responseDate),
            new Date(alert.created_at)
          );
          return sum + minutes;
        }, 0) / alertsWithResponse.length
      )
    : 0;

  // Group by severity
  const bySeverity = alerts.reduce((acc: any, alert) => {
    const severity = alert.severity || 'medium';
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {});

  const severityData = Object.entries(bySeverity).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  // Group by alert type
  const byType = alerts.reduce((acc: any, alert) => {
    const type = alert.alert_type || 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const typeData = Object.entries(byType).map(([name, value]) => ({
    name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value,
  }));

  const getSeverityColor = (severity: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'secondary';
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

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">{t('common.noData')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.content.totalAlerts')}</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.content.active')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{activeAlerts}</div>
            <p className="text-xs text-muted-foreground">
              {t('reports.content.requireAttention')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.content.resolved')}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{resolvedAlerts}</div>
            <p className="text-xs text-muted-foreground">
              {t('reports.content.successfullyHandled')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.content.avgResponseTime')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgResponseTime}m</div>
            <p className="text-xs text-muted-foreground">
              {t('reports.content.minutesToAcknowledge')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.content.alertsBySeverity')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={severityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('reports.content.alertsByType')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alert List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.content.recentAlerts')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.slice(0, 10).map((alert) => (
              <div
                key={alert.id}
                className="flex items-start justify-between p-4 border rounded-lg"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{alert.alert_type?.replace(/_/g, ' ')}</h4>
                    <Badge variant={getSeverityColor(alert.severity || 'medium')}>
                      {alert.severity || 'medium'}
                    </Badge>
                    <Badge variant={getStatusColor(alert.status || 'active')}>
                      {alert.status || 'active'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {alert.title || t('reports.content.noTitle')}
                  </p>
                  {alert.description && (
                    <p className="text-sm text-muted-foreground">
                      {alert.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{format(new Date(alert.created_at), 'MMM dd, yyyy HH:mm')}</span>
                    {(alert as any).elderly_persons?.full_name && (
                      <span>• {(alert as any).elderly_persons.full_name}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
