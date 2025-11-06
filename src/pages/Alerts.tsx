import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle, Clock, Search, Filter, TrendingUp, Users } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { EmptyState } from '@/components/help/EmptyState';

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  elderly_person_id: string;
  elderly_persons?: { full_name: string };
}

const SEVERITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#64748b',
};

const Alerts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7');

  // Fetch elderly persons
  const { data: elderlyPersons } = useQuery({
    queryKey: ['elderly-persons', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .rpc('get_accessible_elderly_persons', { _user_id: user.id });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch alerts with filtering
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['all-alerts', user?.id, dateRange],
    queryFn: async () => {
      const startDate = subDays(new Date(), parseInt(dateRange)).toISOString();
      const { data, error } = await supabase
        .from('alerts')
        .select('*, elderly_persons(full_name)')
        .gte('created_at', startDate)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Alert[];
    },
    enabled: !!user,
  });

  // Real-time subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('alerts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        queryClient.invalidateQueries({ queryKey: ['all-alerts'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  // Filter alerts
  const filteredAlerts = alerts?.filter(alert => {
    const matchesSearch = searchTerm === '' || 
      alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.elderly_persons?.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
    const matchesType = typeFilter === 'all' || alert.alert_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesType && matchesStatus;
  }) || [];

  // Calculate statistics
  const totalAlerts = filteredAlerts.length;
  const activeAlerts = filteredAlerts.filter(a => a.status === 'active').length;
  const criticalAlerts = filteredAlerts.filter(a => a.severity === 'critical').length;
  
  // Average response time (in minutes)
  const acknowledgedAlerts = filteredAlerts.filter(a => a.acknowledged_at);
  const avgResponseTime = acknowledgedAlerts.length > 0
    ? acknowledgedAlerts.reduce((sum, a) => {
        const created = new Date(a.created_at).getTime();
        const acked = new Date(a.acknowledged_at!).getTime();
        return sum + (acked - created) / 60000; // Convert to minutes
      }, 0) / acknowledgedAlerts.length
    : 0;

  // Alert type breakdown for pie chart
  const typeBreakdown = filteredAlerts.reduce((acc, alert) => {
    acc[alert.alert_type] = (acc[alert.alert_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const pieData = Object.entries(typeBreakdown).map(([name, value]) => ({ name, value }));

  // Severity breakdown for bar chart
  const severityBreakdown = {
    critical: filteredAlerts.filter(a => a.severity === 'critical').length,
    high: filteredAlerts.filter(a => a.severity === 'high').length,
    medium: filteredAlerts.filter(a => a.severity === 'medium').length,
    low: filteredAlerts.filter(a => a.severity === 'low').length,
  };
  const barData = Object.entries(severityBreakdown).map(([name, count]) => ({ 
    severity: name, 
    count 
  }));

  // Alert trends (last 7 days)
  const trendData = Array.from({ length: parseInt(dateRange) }, (_, i) => {
    const date = subDays(new Date(), parseInt(dateRange) - 1 - i);
    const dateStr = format(date, 'MM/dd');
    const count = filteredAlerts.filter(a => 
      format(new Date(a.created_at), 'MM/dd') === dateStr
    ).length;
    return { date: dateStr, alerts: count };
  });

  const handleAcknowledge = async (alertId: string) => {
    const { error } = await supabase
      .from('alerts')
      .update({ 
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: user?.id
      })
      .eq('id', alertId);

    if (error) {
      toast.error('Failed to acknowledge alert');
    } else {
      toast.success('Alert acknowledged');
      queryClient.invalidateQueries({ queryKey: ['all-alerts'] });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive';
      case 'high': return 'bg-warning';
      case 'medium': return 'bg-accent';
      case 'low': return 'bg-muted';
      default: return 'bg-muted';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Alert Management" />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title="Alert Management" subtitle="Monitor and respond to system alerts" />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-sm text-muted-foreground">Total Alerts</p>
                  <HelpTooltip content="Total number of alerts in the selected time period, including active, acknowledged, and resolved alerts." />
                </div>
                <p className="text-3xl font-bold">{totalAlerts}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-primary" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-3xl font-bold">{activeAlerts}</p>
              </div>
              <Clock className="w-10 h-10 text-warning animate-pulse-soft" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-3xl font-bold">{criticalAlerts}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-sm text-muted-foreground">Avg Response</p>
                  <HelpTooltip 
                    title="Response Time"
                    content="Average time taken to acknowledge alerts. Lower response times indicate faster attention to critical issues."
                  />
                </div>
                <p className="text-3xl font-bold">{Math.round(avgResponseTime)}</p>
                <p className="text-xs text-muted-foreground">minutes</p>
              </div>
              <TrendingUp className="w-10 h-10 text-success" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search alerts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="vital_signs">Vital Signs</SelectItem>
                <SelectItem value="panic_sos">Panic/SOS</SelectItem>
                <SelectItem value="device_offline">Device Offline</SelectItem>
                <SelectItem value="geofence">Geofence</SelectItem>
                <SelectItem value="inactivity">Inactivity</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24 Hours</SelectItem>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Alert Trends Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Alert Trends</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="alerts" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Alert Type Breakdown */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Alert Types Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Severity Breakdown */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Severity Breakdown</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="severity" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Notification Recipients */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Recipients</h3>
            <div className="space-y-3 max-h-[250px] overflow-y-auto">
              {elderlyPersons?.slice(0, 5).map((person: any) => {
                const personAlerts = filteredAlerts.filter(a => a.elderly_person_id === person.id);
                return (
                  <div key={person.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium">{person.full_name}</p>
                        <p className="text-xs text-muted-foreground">{personAlerts.length} alerts</p>
                      </div>
                    </div>
                    <Badge variant="outline">{personAlerts.length}</Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Alert Timeline */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold">Alert Timeline</h3>
            <HelpTooltip 
              title="Alert Severity Levels"
              content={
                <div className="space-y-2">
                  <div><strong className="text-destructive">Critical:</strong> Immediate action required (e.g., panic button, severe vital anomaly)</div>
                  <div><strong className="text-warning">High:</strong> Urgent attention needed (e.g., geofence breach, device offline)</div>
                  <div><strong className="text-accent">Medium:</strong> Should be reviewed soon (e.g., minor vital deviation)</div>
                  <div><strong className="text-muted-foreground">Low:</strong> Informational (e.g., routine notifications)</div>
                </div>
              }
            />
          </div>
          {filteredAlerts.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="No alerts found"
              description="All clear! No alerts match your current filters. Try adjusting the filters above to view different alerts."
            />
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {filteredAlerts.map((alert) => (
                <div key={alert.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <AlertTriangle className="w-5 h-5 text-warning mt-1 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-semibold">{alert.title}</h4>
                          <Badge className={`${getSeverityColor(alert.severity)} capitalize text-xs`}>
                            {alert.severity}
                          </Badge>
                          <Badge variant="outline" className="capitalize text-xs">
                            {alert.alert_type.replace('_', ' ')}
                          </Badge>
                        </div>
                        {alert.description && (
                          <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                        )}
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span>{alert.elderly_persons?.full_name || 'Unknown'}</span>
                          <span>{format(new Date(alert.created_at), 'PPp')}</span>
                          {alert.acknowledged_at && (
                            <span className="text-success">
                              ✓ Acknowledged {format(new Date(alert.acknowledged_at), 'PP')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {alert.status === 'active' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleAcknowledge(alert.id)}
                        className="ml-2 shrink-0"
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};

export default Alerts;