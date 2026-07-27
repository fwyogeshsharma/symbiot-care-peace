import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Save,
  RotateCcw,
  HeartPulse,
  Activity,
  AlertTriangle,
  Wind,
  Pill,
  TrendingUp,
  Users,
  Plus,
  X,
  Eye,
  BarChart3,
  Map,
  Clock,
  MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Header from '@/components/layout/Header';
import { Footer } from '@/components/Footer';
import { cn } from '@/lib/utils';

interface DashboardComponent {
  id: string;
  name: string;
  description: string;
  icon: any;
  enabled: boolean;
  category: string;
}

const CustomizeDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [previewMode, setPreviewMode] = useState(false);

  // Default available dashboard components
  const availableComponents: DashboardComponent[] = [
    {
      id: 'elderly-list',
      name: t('dashboard.elderlyList', { defaultValue: 'Monitored Individuals' }),
      description: t('dashboard.elderlyListDesc', { defaultValue: 'List of people you are monitoring' }),
      icon: Users,
      enabled: true,
      category: 'people'
    },
    {
      id: 'vital-metrics',
      name: t('dashboard.vitalMetrics', { defaultValue: 'Vital Metrics' }),
      description: t('dashboard.vitalMetricsDesc', { defaultValue: 'Heart rate, blood pressure, oxygen levels' }),
      icon: HeartPulse,
      enabled: true,
      category: 'health'
    },
    {
      id: 'health-charts',
      name: t('dashboard.healthCharts', { defaultValue: 'Health Metrics Charts' }),
      description: t('dashboard.healthChartsDesc', { defaultValue: 'Detailed health trend charts and history' }),
      icon: BarChart3,
      enabled: true,
      category: 'health'
    },
    {
      id: 'alerts',
      name: t('dashboard.alerts', { defaultValue: 'Active Alerts' }),
      description: t('dashboard.alertsDesc', { defaultValue: 'Current alerts and notifications' }),
      icon: AlertTriangle,
      enabled: false,
      category: 'monitoring'
    },
    {
      id: 'panic-sos',
      name: t('dashboard.panicSos', { defaultValue: 'Panic/SOS Events' }),
      description: t('dashboard.panicSosDesc', { defaultValue: 'Emergency button activity' }),
      icon: AlertTriangle,
      enabled: false,
      category: 'monitoring'
    },
    {
      id: 'environmental',
      name: t('dashboard.environmental', { defaultValue: 'Environmental Sensors' }),
      description: t('dashboard.environmentalDesc', { defaultValue: 'Temperature, humidity, air quality' }),
      icon: Wind,
      enabled: true,
      category: 'environment'
    },
    {
      id: 'medication',
      name: t('dashboard.medication', { defaultValue: 'Medication Management' }),
      description: t('dashboard.medicationDesc', { defaultValue: 'Medication schedule and adherence' }),
      icon: Pill,
      enabled: false,
      category: 'health'
    },
    {
      id: 'ilq-score',
      name: t('dashboard.ilqScore', { defaultValue: 'ILQ Score' }),
      description: t('dashboard.ilqScoreDesc', { defaultValue: 'Independent Living Quality metrics' }),
      icon: TrendingUp,
      enabled: false,
      category: 'analytics'
    },
    {
      id: 'movement-summary',
      name: t('dashboard.movementSummary', { defaultValue: 'Movement Summary' }),
      description: t('dashboard.movementSummaryDesc', { defaultValue: 'Activity patterns and movement statistics' }),
      icon: Activity,
      enabled: false,
      category: 'activity'
    },
    {
      id: 'movement-timeline',
      name: t('dashboard.movementTimeline', { defaultValue: 'Movement Timeline' }),
      description: t('dashboard.movementTimelineDesc', { defaultValue: 'Daily activity timeline and patterns' }),
      icon: Clock,
      enabled: false,
      category: 'activity'
    },
    {
      id: 'movement-heatmap',
      name: t('dashboard.movementHeatmap', { defaultValue: 'Movement Heatmap' }),
      description: t('dashboard.movementHeatmapDesc', { defaultValue: 'Visual heatmap of activity by location' }),
      icon: Map,
      enabled: false,
      category: 'activity'
    },
    {
      id: 'dwell-time',
      name: t('dashboard.dwellTime', { defaultValue: 'Dwell Time Analysis' }),
      description: t('dashboard.dwellTimeDesc', { defaultValue: 'Time spent in different locations' }),
      icon: MapPin,
      enabled: false,
      category: 'activity'
    }
  ];

  const [components, setComponents] = useState<DashboardComponent[]>(availableComponents);

  // Fetch user's dashboard layout
  const { data: dashboardLayout, isLoading } = useQuery({
    queryKey: ['dashboard-layout', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('dashboard_layouts')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Load saved layout into components
  useEffect(() => {
    if (dashboardLayout?.layout_config) {
      const savedConfig = dashboardLayout.layout_config as any[];
      // Merge saved config with available components to restore icon references
      const mergedComponents = availableComponents.map(availableComp => {
        const savedComp = savedConfig.find(s => s.id === availableComp.id);
        if (savedComp) {
          return {
            ...availableComp,
            enabled: savedComp.enabled
          };
        }
        return availableComp;
      });
      setComponents(mergedComponents);
    }
  }, [dashboardLayout]);

  // Save dashboard layout mutation
  const saveLayoutMutation = useMutation({
    mutationFn: async (layoutConfig: DashboardComponent[]) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Remove icon references before saving to database (can't serialize React components)
      const serializableConfig = layoutConfig.map(({ icon, ...rest }) => rest);

      const { error } = await supabase
        .from('dashboard_layouts')
        .upsert({
          user_id: user.id,
          layout_config: serializableConfig,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-layout', user?.id] });
      toast({
        title: t('dashboard.layoutSaved', { defaultValue: 'Layout Saved' }),
        description: t('dashboard.layoutSavedDesc', { defaultValue: 'Your dashboard layout has been saved successfully' }),
      });
      navigate('/dashboard');
    },
    onError: (error: any) => {
      toast({
        title: t('dashboard.saveFailed', { defaultValue: 'Save Failed' }),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleToggleComponent = (componentId: string) => {
    setComponents(prev =>
      prev.map(comp =>
        comp.id === componentId ? { ...comp, enabled: !comp.enabled } : comp
      )
    );
  };

  const handleSave = () => {
    saveLayoutMutation.mutate(components);
  };

  const handleReset = () => {
    setComponents(availableComponents);
    toast({
      title: t('dashboard.layoutReset', { defaultValue: 'Layout Reset' }),
      description: t('dashboard.layoutResetDesc', { defaultValue: 'Dashboard layout has been reset to default' }),
    });
  };

  const enabledComponents = components.filter(c => c.enabled);
  const disabledComponents = components.filter(c => !c.enabled);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('common.loading', { defaultValue: 'Loading...' })}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/profile')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {t('dashboard.customizeTitle', { defaultValue: 'Customize Dashboard' })}
              </h1>
              <p className="text-muted-foreground">
                {t('dashboard.customizeDesc', { defaultValue: 'Add or remove components from your dashboard' })}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
            >
              <Eye className="w-4 h-4 mr-2" />
              {previewMode ? 'Edit Mode' : 'Preview'}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Panel - Component Library */}
          {!previewMode && (
            <Card className="lg:col-span-4 p-6 h-fit sticky top-20">
              <h2 className="text-xl font-semibold mb-4">
                {t('dashboard.availableComponents', { defaultValue: 'Available Components' })}
              </h2>
              <div className="space-y-2">
                {disabledComponents.map((component) => {
                  const Icon = component.icon;
                  return (
                    <div
                      key={component.id}
                      className="p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => handleToggleComponent(component.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm">{component.name}</h3>
                          <p className="text-xs text-muted-foreground truncate">{component.description}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleComponent(component.id);
                          }}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {disabledComponents.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('dashboard.allComponentsAdded', { defaultValue: 'All components are added to your dashboard' })}
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* Right Panel - Dashboard Preview */}
          <div className={cn("lg:col-span-8", previewMode && "lg:col-span-12")}>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  {t('dashboard.preview', { defaultValue: 'Dashboard Preview' })}
                </h2>
                <span className="text-sm text-muted-foreground">
                  {enabledComponents.length} {t('dashboard.components', { defaultValue: 'components' })}
                </span>
              </div>

              {/* Simulated Dashboard Layout */}
              <div className="space-y-4 min-h-[500px]">
                {enabledComponents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Activity className="w-16 h-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {t('dashboard.emptyDashboard', { defaultValue: 'No Components Added' })}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t('dashboard.emptyDashboardDesc', { defaultValue: 'Add components from the left panel to customize your dashboard' })}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {enabledComponents.map((component) => {
                      const Icon = component.icon;
                      return (
                        <div
                          key={component.id}
                          className="relative group"
                        >
                          {/* Component Preview Card */}
                          <Card className="p-6 hover:shadow-lg transition-all border-2 border-dashed border-primary/20 hover:border-primary/50">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-4 flex-1">
                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <Icon className="w-6 h-6 text-primary" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-lg mb-1">{component.name}</h3>
                                  <p className="text-sm text-muted-foreground">{component.description}</p>
                                  <div className="mt-3 h-20 bg-muted/30 rounded flex items-center justify-center">
                                    <span className="text-xs text-muted-foreground">
                                      {t('dashboard.componentPreview', { defaultValue: 'Component Preview Area' })}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Remove Button */}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleToggleComponent(component.id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Action Buttons - Fixed at Bottom */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8 sticky bottom-4 bg-background/95 backdrop-blur p-4 border rounded-lg shadow-lg">
          <Button
            onClick={handleSave}
            className="flex-1"
            size="lg"
            disabled={saveLayoutMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {saveLayoutMutation.isPending
              ? t('common.saving', { defaultValue: 'Saving...' })
              : t('common.save', { defaultValue: 'Save Layout' })}
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            size="lg"
            className="flex-1 sm:flex-none"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('common.reset', { defaultValue: 'Reset to Default' })}
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CustomizeDashboard;
