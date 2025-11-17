import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Heart, Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import VitalMetrics from '@/components/dashboard/VitalMetrics';
import ElderlyList from '@/components/dashboard/ElderlyList';
import { MedicationManagement } from '@/components/dashboard/MedicationManagement';
import Header from '@/components/layout/Header';
import { OnboardingTour, useShouldShowTour } from '@/components/help/OnboardingTour';
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { ILQWidget } from '@/components/dashboard/ILQWidget';

const Health = () => {
  const { user } = useAuth();
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

  // Auto-select first person if none selected
  useEffect(() => {
    if (elderlyPersons && elderlyPersons.length > 0 && !selectedPersonId) {
      setSelectedPersonId(elderlyPersons[0].id);
    }
  }, [elderlyPersons, selectedPersonId]);

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

  // Fetch blood pressure data
  const { data: bloodPressureData } = useQuery({
    queryKey: ['blood-pressure-avg', user?.id, elderlyPersons],
    queryFn: async () => {
      if (!elderlyPersons || elderlyPersons.length === 0) return [];

      const elderlyIds = elderlyPersons.map(p => p.id);

      const { data, error } = await supabase
        .from('device_data')
        .select('value')
        .eq('data_type', 'blood_pressure')
        .in('elderly_person_id', elderlyIds)
        .order('recorded_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!elderlyPersons && elderlyPersons.length > 0,
  });

  // Calculate average heart rate
  const calculateAvgHeartRate = () => {
    if (!heartRateData || heartRateData.length === 0) return null;

    const values = heartRateData.map(d => {
      if (typeof d.value === 'object' && d.value !== null && 'value' in d.value) {
        return Number(d.value.value);
      }
      if (typeof d.value === 'object' && d.value !== null && 'bpm' in d.value) {
        return Number(d.value.bpm);
      }
      return Number(d.value);
    }).filter(v => !isNaN(v));

    if (values.length === 0) return null;

    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.round(avg);
  };

  // Calculate average blood pressure
  const calculateAvgBloodPressure = () => {
    if (!bloodPressureData || bloodPressureData.length === 0) return null;

    const systolicValues: number[] = [];
    const diastolicValues: number[] = [];

    bloodPressureData.forEach(d => {
      if (typeof d.value === 'object' && d.value !== null) {
        const systolic = d.value.systolic || d.value.value?.systolic;
        const diastolic = d.value.diastolic || d.value.value?.diastolic;

        if (systolic) systolicValues.push(Number(systolic));
        if (diastolic) diastolicValues.push(Number(diastolic));
      }
    });

    if (systolicValues.length === 0 || diastolicValues.length === 0) return null;

    const avgSystolic = Math.round(systolicValues.reduce((sum, val) => sum + val, 0) / systolicValues.length);
    const avgDiastolic = Math.round(diastolicValues.reduce((sum, val) => sum + val, 0) / diastolicValues.length);

    return { systolic: avgSystolic, diastolic: avgDiastolic };
  };

  const avgHeartRate = calculateAvgHeartRate();
  const avgBloodPressure = calculateAvgBloodPressure();

  if (elderlyLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading health dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <OnboardingTour runTour={shouldShowTour} />
      <Header showBackButton title="Health Metrics" subtitle="Monitor vital signs and health data" />

      <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Monitored Persons</p>
                  <HelpTooltip content="Total number of elderly persons you are currently monitoring for health metrics." />
                </div>
                <p className="text-2xl sm:text-3xl font-bold">{elderlyPersons?.length || 0}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Avg Heart Rate</p>
                  <HelpTooltip
                    title="Heart Rate Monitoring"
                    content="Average heart rate from recent readings. Normal resting heart rate: 60-100 bpm."
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

          <Card className="p-4 sm:p-6 col-span-2 lg:col-span-1">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Avg Blood Pressure</p>
                  <HelpTooltip
                    title="Blood Pressure Monitoring"
                    content="Average blood pressure from recent readings. Normal range: 90-120 / 60-80 mmHg."
                  />
                </div>
                <p className="text-2xl sm:text-3xl font-bold">
                  {avgBloodPressure !== null
                    ? `${avgBloodPressure.systolic}/${avgBloodPressure.diastolic}`
                    : '—'}
                </p>
                {avgBloodPressure !== null ? (
                  <p className="text-xs text-muted-foreground">mmHg</p>
                ) : (
                  <p className="text-xs text-muted-foreground">No data</p>
                )}
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-info" />
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - Person Selection & Health Metrics */}
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

          {/* Right Column - Medication Management */}
          <div className="space-y-4 sm:space-y-6">
            <MedicationManagement selectedPersonId={selectedPersonId} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Health;
