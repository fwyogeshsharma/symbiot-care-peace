import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import VitalMetrics from '@/components/dashboard/VitalMetrics';
import AlertsList from '@/components/dashboard/AlertsList';
import ElderlyList from '@/components/dashboard/ElderlyList';
import PanicSosEvents from '@/components/dashboard/PanicSosEvents';
import EnvironmentalSensors from '@/components/dashboard/EnvironmentalSensors';
import { MedicationManagement } from '@/components/dashboard/MedicationManagement';
import { ILQWidget } from '@/components/dashboard/ILQWidget';
import Header from '@/components/layout/Header';
import { useTranslation } from 'react-i18next';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

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

  // Check if a component is enabled
  const isComponentEnabled = (componentId: string) => {
    if (!dashboardLayout?.layout_config) return true; // Default to showing all if no custom layout

    const components = dashboardLayout.layout_config as any[];
    const component = components.find((c: any) => c.id === componentId);
    return component ? component.enabled : true;
  };

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
        {/* Header with Customize Button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{t('nav.dashboard', { defaultValue: 'Dashboard' })}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('dashboard.welcome', { defaultValue: 'Welcome to your personalized dashboard' })}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/customize-dashboard')}
            className="flex items-center gap-2"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">{t('profile.customizeDashboard', { defaultValue: 'Customize' })}</span>
          </Button>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - Elderly Persons & Vital Metrics */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {isComponentEnabled('elderly-list') && (
              <ElderlyList
                elderlyPersons={elderlyPersons || []}
                selectedPersonId={selectedPersonId}
                onSelectPerson={setSelectedPersonId}
              />
            )}
            {isComponentEnabled('vital-metrics') && (
              <VitalMetrics selectedPersonId={selectedPersonId} />
            )}
          </div>

          {/* Right Column - Other Components */}
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
              <AlertsList alerts={alerts || []} selectedPersonId={selectedPersonId} />
            )}
          </div>
        </div>

        {/* Empty State */}
        {dashboardLayout?.layout_config &&
         (dashboardLayout.layout_config as any[]).filter(c => c.enabled).length === 0 && (
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
