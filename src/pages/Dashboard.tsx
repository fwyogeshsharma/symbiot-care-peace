import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Heart, Activity, AlertTriangle, Users } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import VitalMetrics from '@/components/dashboard/VitalMetrics';
import AlertsList from '@/components/dashboard/AlertsList';
import ElderlyList from '@/components/dashboard/ElderlyList';
import PanicSosEvents from '@/components/dashboard/PanicSosEvents';
import EnvironmentalSensors from '@/components/dashboard/EnvironmentalSensors';
import { MedicationManagement } from '@/components/dashboard/MedicationManagement';
import { ILQWidget } from '@/components/dashboard/ILQWidget';
import Header from '@/components/layout/Header';
import { OnboardingTour, useShouldShowTour } from '@/components/help/OnboardingTour';
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { useTranslation } from 'react-i18next';
import { AlertNotificationDialog } from '@/components/dashboard/AlertNotificationDialog';
import { toast } from 'sonner';
import { Footer } from '@/components/Footer';

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [realtimeData, setRealtimeData] = useState<any[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [newAlert, setNewAlert] = useState<any>(null);
  const shouldShowTour = useShouldShowTour();

  // Fetch user's dashboard layout
  const { data: dashboardLayout } = useQuery({
    queryKey: ['dashboard-layout', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('dashboard_layouts')
        .select('layout_config')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Check if a component is enabled
  const isComponentEnabled = (componentId: string) => {
    if (!dashboardLayout?.layout_config) return true; // Default to showing all if no custom layout

    const components = dashboardLayout.layout_config as any[];
    const component = components.find((c: any) => c.id === componentId);
    return component ? component.enabled : true;
  };

  // Fetch elderly persons based on role
  const { data: elderlyPersons, isLoading: elderlyLoading } = useQuery({
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

  // Fetch active alerts
  const { data: alerts, refetch: refetchAlerts } = useQuery({
    queryKey: ['alerts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*, elderly_persons(full_name)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch heart rate data for average calculation
  const { data: heartRateData } = useQuery({
    queryKey: ['heart-rate-avg', user?.id, elderlyPersons],
    queryFn: async () => {
      if (!elderlyPersons || elderlyPersons.length === 0) return [];
      
      const elderlyIds = elderlyPersons.map(p => p.id);
      
      const { data, error } = await supabase
        .from('device_data')
        .select('value')
        .eq('data_type', 'heart_rate')
        .in('elderly_person_id', elderlyIds)
        .order('recorded_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!elderlyPersons && elderlyPersons.length > 0,
  });

  // Fetch activity/steps data
  const { data: activityData } = useQuery({
    queryKey: ['activity-level', user?.id, elderlyPersons],
    queryFn: async () => {
      if (!elderlyPersons || elderlyPersons.length === 0) return [];
      
      const elderlyIds = elderlyPersons.map(p => p.id);
      
      const { data, error } = await supabase
        .from('device_data')
        .select('value, data_type')
        .in('data_type', ['steps', 'activity'])
        .in('elderly_person_id', elderlyIds)
        .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('recorded_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!elderlyPersons && elderlyPersons.length > 0,
  });

  // Calculate average heart rate
  const calculateAvgHeartRate = () => {
    if (!heartRateData || heartRateData.length === 0) return null;
    
    const values = heartRateData.map(d => {
      if (typeof d.value === 'object' && d.value !== null && 'bpm' in d.value) {
        return Number(d.value.bpm);
      }
      return Number(d.value);
    }).filter(v => !isNaN(v));
    
    if (values.length === 0) return null;
    
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.round(avg);
  };

  // Calculate activity level
  const calculateActivityLevel = () => {
    if (!activityData || activityData.length === 0) return null;

    const totalSteps = activityData
      .filter(d => d.data_type === 'steps')
      .reduce((sum, d) => {
        const steps = typeof d.value === 'object' && d.value !== null && 'count' in d.value
          ? Number(d.value.count)
          : Number(d.value);
        return sum + (isNaN(steps) ? 0 : steps);
      }, 0);

    if (totalSteps > 8000) return t('dashboard.stats.activityLevel.good');
    if (totalSteps > 4000) return t('dashboard.stats.activityLevel.fair');
    if (totalSteps > 0) return t('dashboard.stats.activityLevel.low');
    return null;
  };

  const avgHeartRate = calculateAvgHeartRate();
  const activityLevel = calculateActivityLevel();

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'device_data'
        },
        async (payload) => {
          console.log('New device data:', payload);
          setRealtimeData(prev => [payload.new, ...prev.slice(0, 9)]);

          // Check if this is a panic SOS event (emergency_button)
          const newData = payload.new as any;
          if (newData.device_id) {
            // Fetch device info to check if it's an emergency button
            const { data: device } = await supabase
              .from('devices')
              .select('device_type, elderly_person_id, elderly_persons(full_name)')
              .eq('id', newData.device_id)
              .single();

            if (device?.device_type === 'emergency_button') {
              // Check if user has access to this elderly person
              const { data: accessiblePersons } = await supabase
                .rpc('get_accessible_elderly_persons', { _user_id: user.id });

              const hasAccess = accessiblePersons?.some((p: any) => p.id === device.elderly_person_id);

              if (hasAccess) {
                const elderlyPerson = device.elderly_persons as any;
                // Show toast notification for panic SOS
                toast.error(t('panicSos.notifications.emergencyAlert'), {
                  description: `${t('panicSos.notifications.sosActivated')} ${elderlyPerson?.full_name || t('panicSos.unknown')}`,
                  duration: 10000,
                });

                // Refetch panic events
                queryClient.invalidateQueries({ queryKey: ['panic-sos-events'] });
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alert_recipients',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('New alert for user:', payload);
          refetchAlerts();

          // Fetch full alert details with elderly person info
          const recipientData = payload.new as any;
          const { data: fullAlert } = await supabase
            .from('alerts')
            .select('*, elderly_persons(full_name)')
            .eq('id', recipientData.alert_id)
            .single();

          if (fullAlert) {
            setNewAlert(fullAlert);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetchAlerts, queryClient, t]);

  if (elderlyLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  const handleAlertClose = () => {
    setNewAlert(null);
  };

  const handleAlertAcknowledge = async (alertId: string) => {
    try {
      await supabase
        .from('alerts')
        .update({ status: 'acknowledged' })
        .eq('id', alertId);

      refetchAlerts();
      setNewAlert(null);
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <OnboardingTour runTour={shouldShowTour} />
      <Header />

      {/* Alert Notification Dialog */}
      <AlertNotificationDialog
        newAlert={newAlert}
        onClose={handleAlertClose}
        onAcknowledge={handleAlertAcknowledge}
      />

      <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        {/* Stats Overview */}
        <div data-tour="stats-overview" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3 min-h-[80px]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-2">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{t('dashboard.stats.monitoredPersons.label')}</p>
                  <HelpTooltip content={t('dashboard.stats.monitoredPersons.tooltip')} />
                </div>
                <p className="text-2xl sm:text-3xl font-bold">{elderlyPersons?.length || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3 min-h-[80px]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-2">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{t('dashboard.stats.activeAlerts.label')}</p>
                  <HelpTooltip content={t('dashboard.stats.activeAlerts.tooltip')} />
                </div>
                <p className="text-2xl sm:text-3xl font-bold">{alerts?.length || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-warning" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3 min-h-[80px]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-2">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{t('dashboard.stats.avgHeartRate.label')}</p>
                  <HelpTooltip
                    title={t('dashboard.stats.avgHeartRate.title')}
                    content={t('dashboard.stats.avgHeartRate.tooltip')}
                  />
                </div>
                <p className="text-2xl sm:text-3xl font-bold">
                  {avgHeartRate !== null ? avgHeartRate : '—'}
                </p>
                {avgHeartRate !== null ? (
                  <p className="text-xs text-muted-foreground">{t('dashboard.stats.avgHeartRate.bpm')}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">{t('dashboard.stats.avgHeartRate.noData')}</p>
                )}
              </div>
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                <Heart className="w-6 h-6 text-success" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3 min-h-[80px]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-2">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{t('dashboard.stats.activityLevel.label')}</p>
                  <HelpTooltip
                    title={t('dashboard.stats.activityLevel.title')}
                    content={
                      <div className="space-y-1">
                        <div><strong>{t('dashboard.stats.activityLevel.good')}:</strong> {t('dashboard.stats.activityLevel.goodDesc')}</div>
                        <div><strong>{t('dashboard.stats.activityLevel.fair')}:</strong> {t('dashboard.stats.activityLevel.fairDesc')}</div>
                        <div><strong>{t('dashboard.stats.activityLevel.low')}:</strong> {t('dashboard.stats.activityLevel.lowDesc')}</div>
                      </div>
                    }
                  />
                </div>
                <p className="text-2xl sm:text-3xl font-bold">
                  {activityLevel !== null ? activityLevel : '—'}
                </p>
                {activityLevel === null && (
                  <p className="text-xs text-muted-foreground">{t('dashboard.stats.activityLevel.noData')}</p>
                )}
              </div>
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                <Activity className="w-6 h-6 text-secondary" />
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - Elderly Persons & Devices */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {isComponentEnabled('elderly-list') && (
              <div data-tour="elderly-list">
                <ElderlyList
                  elderlyPersons={elderlyPersons || []}
                  selectedPersonId={selectedPersonId}
                  onSelectPerson={setSelectedPersonId}
                />
              </div>
            )}
            {isComponentEnabled('vital-metrics') && (
              <div data-tour="vital-metrics">
                <VitalMetrics selectedPersonId={selectedPersonId} />
              </div>
            )}
          </div>

          {/* Right Column - Medication, Environmental, ILQ Score, Emergency Events & Alerts */}
          <div className="space-y-4 sm:space-y-6">
            {isComponentEnabled('ilq-score') && selectedPersonId && (
              <ILQWidget elderlyPersonId={selectedPersonId} />
            )}
            {isComponentEnabled('medication') && (
              <MedicationManagement selectedPersonId={selectedPersonId} />
            )}
            {isComponentEnabled('environmental') && (
              <EnvironmentalSensors selectedPersonId={selectedPersonId} />
            )}
            {isComponentEnabled('panic-sos') && (
              <PanicSosEvents selectedPersonId={selectedPersonId} />
            )}
            {isComponentEnabled('alerts') && (
              <div data-tour="alerts-list">
                <AlertsList alerts={alerts || []} selectedPersonId={selectedPersonId} />
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;