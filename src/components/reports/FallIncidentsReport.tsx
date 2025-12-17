import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, differenceInMinutes } from 'date-fns';
import { AlertTriangle, Clock, TrendingDown, CheckCircle2, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';

interface FallIncidentsReportProps {
  selectedPerson: string;
  dateRange: { from: Date; to: Date };
}

export const FallIncidentsReport = ({ selectedPerson, dateRange }: FallIncidentsReportProps) => {
  const { t } = useTranslation();

  // Fetch fall-related alerts
  const { data: fallAlerts = [], isLoading } = useQuery({
    queryKey: ['fall-incidents', selectedPerson, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('alerts')
        .select('*')
        .or('alert_type.eq.fall,title.ilike.%fall%,description.ilike.%fall%')
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
  const totalFalls = fallAlerts.length;
  const criticalFalls = fallAlerts.filter((a: any) => a.severity === 'critical').length;
  const resolvedFalls = fallAlerts.filter((a: any) => a.status === 'resolved').length;
  const unresolvedFalls = totalFalls - resolvedFalls;

  // Calculate average response time (time from created to resolved)
  const resolvedWithTime = fallAlerts.filter((a: any) => a.status === 'resolved' && a.resolved_at);
  const avgResponseTime = resolvedWithTime.length > 0
    ? Math.round(
        resolvedWithTime.reduce((sum: number, alert: any) => {
          return sum + differenceInMinutes(new Date(alert.resolved_at), new Date(alert.created_at));
        }, 0) / resolvedWithTime.length
      )
    : null;

  // Group falls by time of day
  const fallsByTimeOfDay = fallAlerts.reduce((acc: any, alert: any) => {
    const hour = new Date(alert.created_at).getHours();
    let timeOfDay;
    if (hour >= 6 && hour < 12) timeOfDay = 'Morning (6am-12pm)';
    else if (hour >= 12 && hour < 18) timeOfDay = 'Afternoon (12pm-6pm)';
    else if (hour >= 18 && hour < 22) timeOfDay = 'Evening (6pm-10pm)';
    else timeOfDay = 'Night (10pm-6am)';

    acc[timeOfDay] = (acc[timeOfDay] || 0) + 1;
    return acc;
  }, {});

  if (isLoading) {
    return <div className="text-center py-8">{t('common.loading', { defaultValue: 'Loading...' })}</div>;
  }

  if (fallAlerts.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-success" />
          <p className="text-lg font-medium mb-2">No Fall Incidents Detected</p>
          <p className="text-sm text-muted-foreground">
            No fall detection alerts were recorded during this period.
          </p>
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
            <CardTitle className="text-sm font-medium">Total Falls</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFalls}</div>
            <p className="text-xs text-muted-foreground">
              {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Critical Falls</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalFalls}</div>
            <p className="text-xs text-muted-foreground">
              Requiring immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{resolvedFalls}</div>
            <p className="text-xs text-muted-foreground">
              {unresolvedFalls} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgResponseTime !== null ? `${avgResponseTime}m` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Time to resolve incident
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Falls by Time of Day */}
      <Card>
        <CardHeader>
          <CardTitle>Fall Incidents by Time of Day</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            {Object.entries(fallsByTimeOfDay).map(([timeOfDay, count]) => (
              <div key={timeOfDay} className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold">{count as number}</div>
                <p className="text-sm text-muted-foreground">{timeOfDay}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Fall Incidents List */}
      <Card>
        <CardHeader>
          <CardTitle>Fall Incident Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {fallAlerts.map((alert: any) => {
              const responseTime = alert.resolved_at
                ? differenceInMinutes(new Date(alert.resolved_at), new Date(alert.created_at))
                : null;

              return (
                <div key={alert.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle
                        className={`h-5 w-5 mt-0.5 ${
                          alert.severity === 'critical'
                            ? 'text-destructive'
                            : alert.severity === 'high'
                            ? 'text-warning'
                            : 'text-info'
                        }`}
                      />
                      <div>
                        <p className="font-medium mb-1">{alert.title}</p>
                        {alert.description && (
                          <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(alert.created_at), 'MMM dd, yyyy • h:mm a')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        variant={
                          alert.severity === 'critical'
                            ? 'destructive'
                            : alert.severity === 'high'
                            ? 'warning'
                            : 'default'
                        }
                      >
                        {alert.severity}
                      </Badge>
                      <Badge variant={alert.status === 'resolved' ? 'default' : 'secondary'}>
                        {alert.status === 'resolved' ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        {alert.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Response Details */}
                  {alert.status === 'resolved' && alert.resolved_at && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="grid gap-2 md:grid-cols-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Resolved At: </span>
                          <span className="font-medium">
                            {format(new Date(alert.resolved_at), 'h:mm a')}
                          </span>
                        </div>
                        {responseTime !== null && (
                          <div>
                            <span className="text-muted-foreground">Response Time: </span>
                            <span className="font-medium">{responseTime} minutes</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {alert.status === 'acknowledged' && alert.acknowledged_at && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Acknowledged At: </span>
                        <span className="font-medium">
                          {format(new Date(alert.acknowledged_at), 'MMM dd, yyyy • h:mm a')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Safety Recommendations */}
      <Card className="border-info">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-info">
            <AlertTriangle className="h-5 w-5" />
            Fall Prevention Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {totalFalls >= 3 && (
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-info mt-1.5" />
                <span>
                  <strong>Multiple falls detected:</strong> Consider a comprehensive home safety assessment
                  to identify and address fall hazards.
                </span>
              </li>
            )}
            {fallsByTimeOfDay['Night (10pm-6am)'] > 0 && (
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-info mt-1.5" />
                <span>
                  <strong>Night-time falls detected:</strong> Ensure adequate lighting and consider installing
                  night lights along pathways to bathroom.
                </span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-info mt-1.5" />
              <span>
                Regular review of medications that may cause dizziness or affect balance.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-info mt-1.5" />
              <span>
                Consider physical therapy or balance exercises to improve strength and stability.
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
