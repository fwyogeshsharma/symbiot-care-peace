import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import { MovementSummary } from "@/components/dashboard/MovementSummary";
import { MovementTimeline } from "@/components/dashboard/MovementTimeline";
import { MovementHeatmap } from "@/components/dashboard/MovementHeatmap";
import { DwellTimeAnalysis } from "@/components/dashboard/DwellTimeAnalysis";
import { IdealProfileManager } from "@/components/dashboard/IdealProfileManager";
import { ILQWidget } from "@/components/dashboard/ILQWidget";
import ElderlyList from "@/components/dashboard/ElderlyList";
import HomeHubCard from "@/components/dashboard/HomeHubCard";
import SmartPhoneCard from "@/components/dashboard/SmartPhoneCard";
import { Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { processMovementData, getDateRangePreset } from "@/lib/movementUtils";
import { isActivityDevice, isActivityDataType } from "@/lib/deviceDataMapping";
import { checkDwellTimeDeviations } from "@/lib/dwellTimeAlerts";
import { OnboardingTour, useShouldShowTour } from "@/components/help/OnboardingTour";
import { useElderly } from "@/contexts/ElderlyContext";

export default function MovementDashboard() {
  console.log('MovementDashboard: Component rendering');

  try {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { elderlyPersons, selectedPersonId, setSelectedPersonId, isLoading: elderlyLoading } = useElderly();
    const [dateRange, setDateRange] = useState(getDateRangePreset('today'));
    const [selectedPreset, setSelectedPreset] = useState<string>('today');
    const shouldShowTour = useShouldShowTour();

    console.log('MovementDashboard: State initialized', { elderlyLoading, selectedPersonId });

    const { data: rawMovementData = [], isLoading, error: movementError } = useQuery({
      queryKey: ['movement-data', selectedPersonId, dateRange],
      queryFn: async () => {
        if (!selectedPersonId) {
          return [];
        }

        try {
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

          if (error) {
            console.error('Movement data fetch error:', error);
            throw error;
          }

          // Filter for activity-related data
          const filtered = (data || []).filter((item: any) => {
            const deviceType = item.devices?.device_type;
            const deviceCategory = item.devices?.device_types?.category;
            const dataType = item.data_type;

            return isActivityDevice(deviceType, deviceCategory) || isActivityDataType(dataType);
          });

          console.log('MovementDashboard: Fetched movement data', { count: filtered.length });
          return filtered;
        } catch (err) {
          console.error('Error fetching movement data:', err);
          return [];
        }
      },
      enabled: !!selectedPersonId,
      retry: 2,
    });

    // Fetch active ideal profile
    const { data: activeProfile } = useQuery({
      queryKey: ['active-ideal-profile', selectedPersonId],
      queryFn: async () => {
        if (!selectedPersonId) return null;

        const { data, error } = await supabase
          .from('ideal_profiles')
          .select('*')
          .eq('elderly_person_id', selectedPersonId)
          .eq('is_active', true)
          .maybeSingle();

        if (error) {
          console.error('Error fetching ideal profile:', error);
          return null;
        }
        return data as any;
      },
      enabled: !!selectedPersonId,
    });

    // Subscribe to real-time updates
    useEffect(() => {
      if (!selectedPersonId) return;

      const channel = supabase
        .channel('movement-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'device_data',
            filter: `elderly_person_id=eq.${selectedPersonId}`,
          },
          () => {
            console.log('MovementDashboard: Real-time update received');
            queryClient.invalidateQueries({ queryKey: ['movement-data'] });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, [selectedPersonId, queryClient]);

    const processedData = processMovementData(rawMovementData);
    console.log('MovementDashboard: Processed data', {
      events: processedData.events.length,
      locations: Object.keys(processedData.locationStats).length
    });

    // Check for dwell time deviations and generate alerts
    useEffect(() => {
      if (selectedPersonId && activeProfile && processedData.events.length > 0) {
        checkDwellTimeDeviations(processedData, activeProfile, selectedPersonId);
      }
    }, [selectedPersonId, activeProfile, processedData.events.length]);

    const handlePresetChange = (preset: string) => {
      setSelectedPreset(preset);
      if (preset === 'today' || preset === 'last7days' || preset === 'last30days') {
        setDateRange(getDateRangePreset(preset));
      }
    };

    if (elderlyLoading) {
      console.log('MovementDashboard: Showing loading state');
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('common.loading', 'Loading...')}</p>
          </div>
        </div>
      );
    }

    if (!elderlyPersons || elderlyPersons.length === 0) {
      console.log('MovementDashboard: No elderly persons found');
      return (
        <div className="min-h-screen bg-background">
          <Header showBackButton title={t('movement.title', 'Activity')} subtitle={t('movement.subtitle', 'Movement Tracking')} />
          <main className="container mx-auto p-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t('movement.noPersons', 'No monitored persons found.')}</p>
            </div>
          </main>
        </div>
      );
    }

    if (!selectedPersonId) {
      console.log('MovementDashboard: No person selected');
      return (
        <div className="min-h-screen bg-background">
          <Header showBackButton title={t('movement.title', 'Activity')} subtitle={t('movement.subtitle', 'Movement Tracking')} />
          <main className="container mx-auto p-6">
            <ElderlyList
              elderlyPersons={elderlyPersons}
              selectedPersonId={selectedPersonId}
              onSelectPerson={setSelectedPersonId}
            />
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t('movement.selectPerson', 'Please select a person to view their activity.')}</p>
            </div>
          </main>
        </div>
      );
    }

    console.log('MovementDashboard: Rendering main content');

    return (
      <div className="min-h-screen bg-background">
        <OnboardingTour runTour={shouldShowTour} />
        <Header showBackButton title={t('movement.title', 'Activity')} subtitle={t('movement.subtitle', 'Movement Tracking')} />
        <main className="container mx-auto p-4 sm:p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{t('movement.title', 'Activity Dashboard')}</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {t('movement.description', 'Track movement and activity patterns')}
              </p>
            </div>

            <div data-tour="date-range-selector" className="flex items-center gap-4">
              <Select value={selectedPreset} onValueChange={handlePresetChange}>
                <SelectTrigger className="w-[180px]">
                  <Calendar className="mr-2 h-4 w-4" />
                  <SelectValue placeholder={t('movement.selectPeriod', 'Select period')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">{t('movement.today', 'Today')}</SelectItem>
                  <SelectItem value="last7days">{t('movement.last7days', 'Last 7 Days')}</SelectItem>
                  <SelectItem value="last30days">{t('movement.last30days', 'Last 30 Days')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Error display */}
          {movementError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive">
                {t('movement.error', 'Error loading movement data. Please try again.')}
              </p>
            </div>
          )}

          {/* Monitored Individuals Selection */}
          <ElderlyList
            elderlyPersons={elderlyPersons}
            selectedPersonId={selectedPersonId}
            onSelectPerson={setSelectedPersonId}
          />

          {/* ILQ Widget */}
          {selectedPersonId && (
            <div data-tour="ilq-widget-activity">
              <ILQWidget elderlyPersonId={selectedPersonId} />
            </div>
          )}

          {/* Home Hub and Smart Phone Cards */}
          {selectedPersonId && (
            <div className="grid gap-6 lg:grid-cols-2">
              <HomeHubCard selectedPersonId={selectedPersonId} />
              <SmartPhoneCard selectedPersonId={selectedPersonId} />
            </div>
          )}

          {/* Loading state for movement data */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">{t('movement.loadingData', 'Loading movement data...')}</p>
              </div>
            </div>
          ) : (
            <>
              <div data-tour="movement-summary">
                <MovementSummary data={processedData} />
              </div>

              {/* Dwell Time Analysis - Priority Feature */}
              <div data-tour="dwell-time-analysis">
                <DwellTimeAnalysis data={processedData} idealProfile={activeProfile} />
              </div>

              {/* Ideal Profile Manager */}
              {selectedPersonId && (
                <div data-tour="ideal-profile-manager">
                  <IdealProfileManager elderlyPersonId={selectedPersonId} currentData={processedData} />
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                <MovementTimeline events={processedData.events} />
                <MovementHeatmap data={processedData} />
              </div>
            </>
          )}
        </main>
      </div>
    );
  } catch (error) {
    console.error('MovementDashboard: Error rendering component', error);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-6">
          <h2 className="text-xl font-bold mb-2">Error Loading Page</h2>
          <p className="text-muted-foreground mb-4">
            There was an error loading the activity page.
          </p>
          <p className="text-sm text-red-500">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }
}
