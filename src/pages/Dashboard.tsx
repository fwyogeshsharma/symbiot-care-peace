import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Heart, Activity, AlertTriangle, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import VitalMetrics from '@/components/dashboard/VitalMetrics';
import AlertsList from '@/components/dashboard/AlertsList';
import ElderlyList from '@/components/dashboard/ElderlyList';
import PanicSosEvents from '@/components/dashboard/PanicSosEvents';
import EnvironmentalSensors from '@/components/dashboard/EnvironmentalSensors';
import { MedicationManagement } from '@/components/dashboard/MedicationManagement';
import Header from '@/components/layout/Header';
import { OnboardingTour, useShouldShowTour } from '@/components/help/OnboardingTour';
import { InfoButton } from '@/components/help/InfoButton';
import { ILQWidget } from '@/components/dashboard/ILQWidget';

const Dashboard = () => {
  const { user } = useAuth();
  const [realtimeData, setRealtimeData] = useState<any[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const shouldShowTour = useShouldShowTour();

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
    
    if (totalSteps > 8000) return 'Good';
    if (totalSteps > 4000) return 'Fair';
    if (totalSteps > 0) return 'Low';
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
        (payload) => {
          console.log('New device data:', payload);
          setRealtimeData(prev => [payload.new, ...prev.slice(0, 9)]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts'
        },
        (payload) => {
          console.log('New alert:', payload);
          refetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetchAlerts]);

  if (elderlyLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <OnboardingTour runTour={shouldShowTour} />
      <Header />

      <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        {/* Stats Overview */}
        <div data-tour="stats-overview" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Monitored Persons</p>
                  <InfoButton content="Total number of elderly persons you are currently monitoring. This includes all individuals assigned to your care." side="top" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold">{elderlyPersons?.length || 0}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Active Alerts</p>
                  <InfoButton content="Alerts requiring attention. These may include vital sign anomalies, panic button activations, geofence violations, or device issues. Click on alerts to acknowledge and resolve them." side="top" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold">{alerts?.length || 0}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-warning" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Avg Heart Rate</p>
                  <InfoButton
                    title="Heart Rate Monitoring"
                    content="Average heart rate from recent readings. Normal resting heart rate: 60-100 bpm. Alerts are triggered for values outside safe ranges."
                    side="top"
                  />
                </div>
                <p className="text-2xl sm:text-3xl font-bold">
                  {avgHeartRate !== null ? avgHeartRate : '—'}
                </p>
                {avgHeartRate !== null ? (
                  <p className="text-xs text-muted-foreground">bpm</p>
                ) : (
                  <p className="text-xs text-muted-foreground">No data</p>
                )}
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Activity Level</p>
                  <InfoButton
                    title="Activity Level Guide"
                    content={
                      <div className="space-y-1">
                        <div><strong>Good:</strong> 8,000+ steps/day</div>
                        <div><strong>Fair:</strong> 4,000-8,000 steps/day</div>
                        <div><strong>Low:</strong> &lt;4,000 steps/day</div>
                      </div>
                    }
                    side="top"
                  />
                </div>
                <p className="text-2xl sm:text-3xl font-bold">
                  {activityLevel !== null ? activityLevel : '—'}
                </p>
                {activityLevel === null && (
                  <p className="text-xs text-muted-foreground">No data</p>
                )}
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-secondary" />
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - Elderly Persons & Devices */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {selectedPersonId && (
              <div data-tour="ilq-widget">
                <ILQWidget elderlyPersonId={selectedPersonId} />
              </div>
            )}
            <div data-tour="elderly-list">
              <ElderlyList 
                elderlyPersons={elderlyPersons || []} 
                selectedPersonId={selectedPersonId}
                onSelectPerson={setSelectedPersonId}
              />
            </div>
            <div data-tour="vital-metrics">
              <VitalMetrics selectedPersonId={selectedPersonId} />
            </div>
          </div>

          {/* Right Column - Medication, Environmental, Emergency Events & Alerts */}
          <div className="space-y-4 sm:space-y-6">
            <MedicationManagement selectedPersonId={selectedPersonId} />
            <EnvironmentalSensors selectedPersonId={selectedPersonId} />
            <PanicSosEvents selectedPersonId={selectedPersonId} />
            <div data-tour="alerts-list">
              <AlertsList alerts={alerts || []} selectedPersonId={selectedPersonId} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;