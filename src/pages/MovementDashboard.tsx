import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import { MovementSummary } from "@/components/dashboard/MovementSummary";
import { MovementTimeline } from "@/components/dashboard/MovementTimeline";
import { MovementHeatmap } from "@/components/dashboard/MovementHeatmap";
import { DwellTimeAnalysis } from "@/components/dashboard/DwellTimeAnalysis";
import { IdealProfileManager } from "@/components/dashboard/IdealProfileManager";
import { ILQWidget } from "@/components/dashboard/ILQWidget";
import { ILQHistoryChart } from "@/components/dashboard/ILQHistoryChart";
import ElderlyList from "@/components/dashboard/ElderlyList";
import { Button } from "@/components/ui/button";
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

export default function MovementDashboard() {
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState(getDateRangePreset('today'));
  const [selectedPreset, setSelectedPreset] = useState<string>('today');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const shouldShowTour = useShouldShowTour();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch all accessible elderly persons
  const { data: elderlyPersons = [], isLoading: elderlyLoading } = useQuery({
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
    if (elderlyPersons.length > 0 && !selectedPersonId) {
      setSelectedPersonId(elderlyPersons[0].id);
    }
  }, [elderlyPersons, selectedPersonId]);

  const { data: rawMovementData = [], isLoading } = useQuery({
    queryKey: ['movement-data', selectedPersonId, dateRange],
    queryFn: async () => {
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
      
      // Filter for activity-related data: devices from activity categories OR data types that represent activity
      return data.filter((item: any) => {
        const deviceType = item.devices?.device_type;
        const deviceCategory = item.devices?.device_types?.category;
        const dataType = item.data_type;
        
        return isActivityDevice(deviceType, deviceCategory) || isActivityDataType(dataType);
      });
    },
    enabled: !!selectedPersonId,
  });

  // Fetch active ideal profile
  const { data: activeProfile } = useQuery({
    queryKey: ['active-ideal-profile', selectedPersonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ideal_profiles')
        .select('*')
        .eq('elderly_person_id', selectedPersonId)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
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
          // Refetch data on new movement events
          queryClient.invalidateQueries({ queryKey: ['movement-data'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedPersonId, queryClient]);

  const processedData = processMovementData(rawMovementData);

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

  if (elderlyLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <OnboardingTour runTour={shouldShowTour} />
      <Header showBackButton title="Activity Dashboard" subtitle="Track activity patterns over time" />
      <main className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Activity Dashboard</h1>
            <p className="text-muted-foreground">
              Track and visualize activity patterns over time
            </p>
          </div>
          
          <div data-tour="date-range-selector" className="flex items-center gap-4">
            <Select value={selectedPreset} onValueChange={handlePresetChange}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="last7days">Last 7 Days</SelectItem>
                <SelectItem value="last30days">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

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
          <div className="space-y-6">
            <MovementHeatmap data={processedData} />
            {selectedPersonId && (
              <ILQHistoryChart elderlyPersonId={selectedPersonId} days={30} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
