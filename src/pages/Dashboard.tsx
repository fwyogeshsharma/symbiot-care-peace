import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import VitalMetrics from '@/components/dashboard/VitalMetrics';
import AlertsList from '@/components/dashboard/AlertsList';
import ElderlyList from '@/components/dashboard/ElderlyList';
import PanicSosEvents from '@/components/dashboard/PanicSosEvents';
import EnvironmentalSensors from '@/components/dashboard/EnvironmentalSensors';
import { MedicationManagement } from '@/components/dashboard/MedicationManagement';
import { ILQWidget } from '@/components/dashboard/ILQWidget';
import HealthMetricsCharts from '@/components/dashboard/HealthMetricsCharts';
import { MovementSummary } from '@/components/dashboard/MovementSummary';
import { MovementTimeline } from '@/components/dashboard/MovementTimeline';
import { MovementHeatmap } from '@/components/dashboard/MovementHeatmap';
import { DwellTimeAnalysis } from '@/components/dashboard/DwellTimeAnalysis';
import Header from '@/components/layout/Header';
import { useTranslation } from 'react-i18next';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { processMovementData, getDateRangePreset } from '@/lib/movementUtils';

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [dateRange] = useState(getDateRangePreset('today'));
  const [healthChartsOpen, setHealthChartsOpen] = useState(false);

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
  const { data: alerts } = useQuery({
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

  // Fetch movement data for activity components
  const { data: rawMovementData = [] } = useQuery({
    queryKey: ['movement-data', selectedPersonId, dateRange],
    queryFn: async () => {
      if (!selectedPersonId) return [];

      const { data, error } = await supabase
        .from('device_data')
        .select(`
          *,
          devices!inner(location, device_name, device_type, device_types!inner(category))
        `)
        .eq('elderly_person_id', selectedPersonId)
        .gte('recorded_at', dateRange.start)
        .lte('recorded_at', dateRange.end)
        .order('recorded_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedPersonId,
  });

  const processedMovementData = processMovementData(rawMovementData || []);

  // Auto-select first person when dashboard loads
  useEffect(() => {
    if (elderlyPersons && elderlyPersons.length > 0 && !selectedPersonId) {
      setSelectedPersonId(elderlyPersons[0].id);
    }
  }, [elderlyPersons, selectedPersonId]);

  // Check if a component is enabled
  const isComponentEnabled = (componentId: string) => {
    if (!dashboardLayout?.layout_config) {
      // No custom layout saved - show default components
      const defaultEnabled = ['elderly-list', 'vital-metrics', 'health-charts', 'environmental'];
      console.log('No dashboard layout, using defaults for:', componentId, defaultEnabled.includes(componentId));
      return defaultEnabled.includes(componentId);
    }

    // Handle both old format (array) and new format (object with components property)
    const layoutConfig = dashboardLayout.layout_config as any;
    const components = Array.isArray(layoutConfig) ? layoutConfig : (layoutConfig.components || []);
    const component = components.find((c: any) => c.id === componentId);

    console.log('Checking component:', componentId, 'Found:', !!component, 'Enabled:', component?.enabled);

    // If component not found in saved config (new component added later), don't show it by default
    if (!component) return false;

    return component.enabled;
  };

  // Debug: Log the dashboard layout when it changes
  useEffect(() => {
    if (dashboardLayout?.layout_config) {
      console.log('Dashboard layout loaded:', dashboardLayout.layout_config);
      const layoutConfig = dashboardLayout.layout_config as any;
      const components = Array.isArray(layoutConfig) ? layoutConfig : (layoutConfig.components || []);
      console.log('Enabled components:', components.filter((c: any) => c.enabled).map((c: any) => c.id));
    }
  }, [dashboardLayout]);

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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        {/* Page Heading */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title', { defaultValue: 'Dashboard' })}</h1>
            <p className="text-muted-foreground mt-1">
              {t('dashboard.subtitle', { defaultValue: 'Monitor and manage elderly care' })}
            </p>
          </div>
          <Button onClick={() => navigate('/customize-dashboard')} variant="outline">
            <LayoutDashboard className="w-4 h-4 mr-2" />
            {t('profile.customizeDashboard', { defaultValue: 'Customize Dashboard' })}
          </Button>
        </div>

        {/* Main Content Grid */}
        <div className="space-y-4 sm:space-y-6">
          {/* Elderly List */}
          {isComponentEnabled('elderly-list') && (
            <ElderlyList
              elderlyPersons={elderlyPersons || []}
              selectedPersonId={selectedPersonId}
              onSelectPerson={setSelectedPersonId}
            />
          )}

          {/* Grid Layout for Side-by-Side Components */}
          <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Left Column - Health & Monitoring */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {isComponentEnabled('vital-metrics') && (
                <VitalMetrics selectedPersonId={selectedPersonId} />
              )}
              {isComponentEnabled('health-charts') && (
                <HealthMetricsCharts 
                  open={healthChartsOpen} 
                  onOpenChange={setHealthChartsOpen} 
                  selectedPersonId={selectedPersonId} 
                />
              )}
              {isComponentEnabled('movement-summary') && (
                <MovementSummary data={processedMovementData} />
              )}
              {isComponentEnabled('movement-timeline') && (
                <MovementTimeline events={processedMovementData.events} />
              )}
              {isComponentEnabled('movement-heatmap') && (
                <MovementHeatmap data={processedMovementData} />
              )}
              {isComponentEnabled('dwell-time') && (
                <DwellTimeAnalysis data={processedMovementData} idealProfile={null} />
              )}
            </div>

            {/* Right Column - Widgets & Quick Info */}
            <div className="space-y-4 sm:space-y-6">
              {isComponentEnabled('ilq-score') && (
                <ILQWidget elderlyPersonId={selectedPersonId || ''} />
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
                <AlertsList alerts={alerts || []} selectedPersonId={selectedPersonId} />
              )}
            </div>
          </div>

        </div>

        {/* Empty State */}
        {dashboardLayout?.layout_config &&
         (() => {
           const layoutConfig = dashboardLayout.layout_config as any;
           const components = Array.isArray(layoutConfig) ? layoutConfig : (layoutConfig.components || []);
           return components.filter((c: any) => c.enabled).length === 0;
         })() && (
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <LayoutDashboard className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                {t('dashboard.emptyDashboard', { defaultValue: 'No Components Added' })}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('dashboard.emptyDashboardDesc', { defaultValue: 'Customize your dashboard to add components' })}
              </p>
              <Button onClick={() => navigate('/customize-dashboard')}>
                <LayoutDashboard className="w-4 h-4 mr-2" />
                {t('profile.customizeDashboard', { defaultValue: 'Customize Dashboard' })}
              </Button>
            </div>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
