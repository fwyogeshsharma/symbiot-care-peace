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
import { de, es, fr, frCA, enUS, Locale } from 'date-fns/locale';
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { EmptyState } from '@/components/help/EmptyState';
import { OnboardingTour, useShouldShowTour } from '@/components/help/OnboardingTour';
import { useTranslation } from 'react-i18next';
import { Footer } from '@/components/Footer';

// Map language codes to date-fns locales
const getDateLocale = (language: string) => {
  const localeMap: Record<string, Locale> = {
    'en': enUS,
    'de': de,
    'es': es,
    'fr': fr,
    'fr-CA': frCA,
  };
  return localeMap[language] || enUS;
};

// Device name mapping for translation
const deviceNameMap: Record<string, string> = {
  'home hub': 'home_hub',
  'home_hub': 'home_hub',
  'smartphone': 'smartphone',
  'smart phone': 'smartphone',
  'fall detection': 'fall_detection',
  'falldetection': 'falldetection',
  'emergency button': 'emergency_button',
  'panic button': 'panic_button',
  'gps tracker': 'gps_tracker',
  'heart rate monitor': 'heart_rate_monitor',
  'blood pressure monitor': 'blood_pressure_monitor',
  'smartwatch': 'smartwatch',
  'wearable': 'wearable',
};

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
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const dateLocale = getDateLocale(i18n.language);

  // Function to translate device names within text
  const translateDeviceNames = (text: string) => {
    if (!text) return text;
    let result = text;
    Object.entries(deviceNameMap).forEach(([deviceName, translationKey]) => {
      const regex = new RegExp(deviceName, 'gi');
      const translated = t(`devices.names.${translationKey}`, { defaultValue: '' });
      if (translated) {
        result = result.replace(regex, translated);
      }
    });
    return result;
  };
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7');
  const shouldShowTour = useShouldShowTour();

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
      if (!user?.id) return [];
      
      // First get accessible elderly persons
      const { data: accessiblePersons, error: personsError } = await supabase
        .rpc('get_accessible_elderly_persons', { _user_id: user.id });
      
      if (personsError) throw personsError;
      if (!accessiblePersons || accessiblePersons.length === 0) return [];
      
      const elderlyIds = accessiblePersons.map((p: any) => p.id);
      const startDate = subDays(new Date(), parseInt(dateRange)).toISOString();
      
      const { data, error } = await supabase
        .from('alerts')
        .select('*, elderly_persons(full_name)')
        .in('elderly_person_id', elderlyIds)
        .gte('created_at', startDate)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Alert[];
    },
    enabled: !!user?.id,
  });

  // Real-time subscription - only for alerts this user has access to
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('alerts-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'alert_recipients',
        filter: `user_id=eq.${user.id}`
      }, () => {
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

  // Normalize alert type function
  const normalizeAlertType = (type: string): string => {
    const normalized = type.toLowerCase().trim();
    // Consolidate singular and plural forms
    if (normalized === 'vital_sign' || normalized === 'vital_signs' || normalized === 'vital sign' || normalized === 'vital signs') {
      return 'vital_signs';
    }
    if (normalized === 'panic_sos' || normalized === 'panic' || normalized === 'sos') {
      return 'panic_sos';
    }
    if (normalized === 'device_offline' || normalized === 'device offline') {
      return 'device_offline';
    }
    if (normalized === 'geofence' || normalized === 'geofence_breach') {
      return 'geofence';
    }
    if (normalized === 'inactivity' || normalized === 'inactive') {
      return 'inactivity';
    }
    return normalized.replace(/\s+/g, '_');
  };

  // Alert type breakdown for pie chart
  const typeBreakdown = filteredAlerts.reduce((acc, alert) => {
    const normalizedType = normalizeAlertType(alert.alert_type);
    acc[normalizedType] = (acc[normalizedType] || 0) + 1;
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
      toast.error(t('alerts.toasts.failedToAcknowledge'));
    } else {
      toast.success(t('alerts.toasts.alertAcknowledged'));
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
        <Header title={t('alerts.management')} />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <OnboardingTour runTour={shouldShowTour} />
      <Header title={t('alerts.management')} subtitle={t('alerts.subtitle')} />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div data-tour="alert-stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-sm text-muted-foreground">{t('alerts.stats.totalAlerts')}</p>
                  <HelpTooltip content={t('alerts.stats.totalAlertsTooltip')} />
                </div>
                <p className="text-3xl font-bold">{totalAlerts}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-primary" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('alerts.stats.active')}</p>
                <p className="text-3xl font-bold">{activeAlerts}</p>
              </div>
              <Clock className="w-10 h-10 text-warning animate-pulse-soft" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('alerts.stats.critical')}</p>
                <p className="text-3xl font-bold">{criticalAlerts}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-sm text-muted-foreground">{t('alerts.stats.avgResponse')}</p>
                  <HelpTooltip
                    title={t('alerts.stats.responseTime')}
                    content={t('alerts.stats.responseTimeTooltip')}
                  />
                </div>
                <p className="text-3xl font-bold">{Math.round(avgResponseTime)}</p>
                <p className="text-xs text-muted-foreground">{t('alerts.stats.minutes')}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-success" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-6" data-tour="alert-filters">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('alerts.filters.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder={t('alerts.severity')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('alerts.filters.allSeverity')}</SelectItem>
                <SelectItem value="critical">{t('alerts.critical')}</SelectItem>
                <SelectItem value="high">{t('alerts.high')}</SelectItem>
                <SelectItem value="medium">{t('alerts.medium')}</SelectItem>
                <SelectItem value="low">{t('alerts.low')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder={t('alerts.type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('alerts.filters.allTypes')}</SelectItem>
                <SelectItem value="vital_signs">{t('alerts.types.vital_signs')}</SelectItem>
                <SelectItem value="panic_sos">{t('alerts.types.panic_sos')}</SelectItem>
                <SelectItem value="device_offline">{t('alerts.types.device_offline')}</SelectItem>
                <SelectItem value="geofence">{t('alerts.types.geofence')}</SelectItem>
                <SelectItem value="inactivity">{t('alerts.types.inactivity')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder={t('alerts.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('alerts.filters.allStatus')}</SelectItem>
                <SelectItem value="active">{t('alerts.statusOptions.active')}</SelectItem>
                <SelectItem value="acknowledged">{t('alerts.statusOptions.acknowledged')}</SelectItem>
                <SelectItem value="resolved">{t('alerts.statusOptions.resolved')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder={t('alerts.filters.dateRange')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">{t('alerts.dateRanges.last24Hours')}</SelectItem>
                <SelectItem value="7">{t('alerts.dateRanges.last7Days')}</SelectItem>
                <SelectItem value="30">{t('alerts.dateRanges.last30Days')}</SelectItem>
                <SelectItem value="90">{t('alerts.dateRanges.last90Days')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Charts Row */}
        <div data-tour="alert-charts" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Alert Trends Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t('alerts.charts.alertTrends')}</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="alerts" name={t('alerts.charts.alerts')} stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Alert Type Breakdown */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t('alerts.charts.alertTypesDistribution')}</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${t(`alerts.types.${name}`, { defaultValue: name.replace(/_/g, ' ') })} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => {
                    // Red shades from light to dark
                    const redShades = [
                      '#fca5a5', // light red
                      '#f87171', // lighter red
                      '#ef4444', // red
                      '#dc2626', // darker red
                      '#b91c1c', // dark red
                      '#991b1b', // very dark red
                      '#7f1d1d', // darkest red
                    ];
                    return (
                      <Cell key={`cell-${index}`} fill={redShades[index % redShades.length]} />
                    );
                  })}
                </Pie>
                <Tooltip formatter={(value, name) => [value, t(`alerts.types.${name}`, { defaultValue: String(name).replace(/_/g, ' ') })]} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Severity Breakdown */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t('alerts.charts.severityBreakdown')}</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="severity" tickFormatter={(value) => t(`alerts.${value}`, { defaultValue: value })} />
                <YAxis />
                <Tooltip labelFormatter={(value) => t(`alerts.${value}`, { defaultValue: value })} />
                <Legend />
                <Bar dataKey="count" name={t('alerts.charts.count')} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Notification Recipients */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t('alerts.recipients.title')}</h3>
            <div className="space-y-3 max-h-[250px] overflow-y-auto">
              {elderlyPersons?.slice(0, 5).map((person: any) => {
                const personAlerts = filteredAlerts.filter(a => a.elderly_person_id === person.id);
                return (
                  <div key={person.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium">{person.full_name}</p>
                        <p className="text-xs text-muted-foreground">{personAlerts.length} {t('alerts.recipients.alerts')}</p>
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
        <Card className="p-6" data-tour="alert-timeline">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold">{t('alerts.timeline.title')}</h3>
            <HelpTooltip
              title={t('alerts.timeline.severityLevels')}
              content={
                <div className="space-y-2">
                  <div><strong className="text-destructive">{t('alerts.critical')}:</strong> {t('alerts.timeline.criticalDesc')}</div>
                  <div><strong className="text-warning">{t('alerts.high')}:</strong> {t('alerts.timeline.highDesc')}</div>
                  <div><strong className="text-accent">{t('alerts.medium')}:</strong> {t('alerts.timeline.mediumDesc')}</div>
                  <div><strong className="text-muted-foreground">{t('alerts.low')}:</strong> {t('alerts.timeline.lowDesc')}</div>
                </div>
              }
            />
          </div>
          {filteredAlerts.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title={t('alerts.noAlertsFound')}
              description={t('alerts.noAlertsDescription')}
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
                          <h4 className="font-semibold">{translateDeviceNames(t(`alerts.messages.${alert.alert_type}.title`, { defaultValue: alert.title }))}</h4>
                          <Badge className={`${getSeverityColor(alert.severity)} capitalize text-xs`}>
                            {t(`alerts.${alert.severity}`, { defaultValue: alert.severity })}
                          </Badge>
                          <Badge variant="outline" className="capitalize text-xs">
                            {t(`alerts.types.${alert.alert_type}`, { defaultValue: alert.alert_type.replace(/_/g, ' ') })}
                          </Badge>
                        </div>
                        {alert.description && (
                          <p className="text-sm text-muted-foreground mb-2">{translateDeviceNames(t(`alerts.messages.${alert.alert_type}.description`, { defaultValue: alert.description }))}</p>
                        )}
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span>{alert.elderly_persons?.full_name || t('alerts.timeline.unknown')}</span>
                          <span>{format(new Date(alert.created_at), 'MMM d, yyyy HH:mm', { locale: dateLocale })}</span>
                          {alert.acknowledged_at && (
                            <span className="text-success">
                              ✓ {t('alerts.timeline.acknowledged')} {format(new Date(alert.acknowledged_at), 'MMM d, yyyy', { locale: dateLocale })}
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
                        {t('alerts.actions.acknowledge')}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Alerts;