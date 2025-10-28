import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import { MovementSummary } from "@/components/dashboard/MovementSummary";
import { MovementTimeline } from "@/components/dashboard/MovementTimeline";
import { MovementHeatmap } from "@/components/dashboard/MovementHeatmap";
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

const MOVEMENT_SENSOR_TYPES = ['door_sensor', 'room_sensor', 'seat_sensor', 'bed_sensor'];

export default function MovementDashboard() {
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState(getDateRangePreset('today'));
  const [selectedPreset, setSelectedPreset] = useState<string>('today');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

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
          devices!inner(location, device_name, device_type)
        `)
        .eq('elderly_person_id', selectedPersonId)
        .gte('recorded_at', dateRange.start)
        .lte('recorded_at', dateRange.end)
        .order('recorded_at', { ascending: true });
      
      if (error) throw error;
      
      // Filter for movement-related sensor types
      return data.filter((item: any) => 
        MOVEMENT_SENSOR_TYPES.includes(item.devices?.device_type)
      );
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
      <Header showBackButton title="Activity Dashboard" subtitle="Track activity patterns over time" />
      <main className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Activity Dashboard</h1>
            <p className="text-muted-foreground">
              Track and visualize activity patterns over time
            </p>
          </div>
          
          <div className="flex items-center gap-4">
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

        <MovementSummary data={processedData} />

        <div className="grid gap-6 lg:grid-cols-2">
          <MovementTimeline events={processedData.events} />
          <div className="space-y-6">
            <MovementHeatmap data={processedData} />
          </div>
        </div>
      </main>
    </div>
  );
}
