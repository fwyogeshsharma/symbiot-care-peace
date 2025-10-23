import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FloorPlanGrid } from '@/components/indoor-tracking/FloorPlanGrid';
import { MovementPlayback } from '@/components/indoor-tracking/MovementPlayback';
import { MovementMetrics } from '@/components/indoor-tracking/MovementMetrics';
import { processPositionData } from '@/lib/positionUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import Header from '@/components/layout/Header';
import ElderlyList from '@/components/dashboard/ElderlyList';

export default function IndoorTracking() {
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // Fetch current user
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  // Fetch all accessible elderly persons
  const { data: elderlyPersons = [], isLoading: elderlyLoading } = useQuery({
    queryKey: ['elderly-persons', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elderly_persons')
        .select('*');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Auto-select first person if none selected
  useEffect(() => {
    if (elderlyPersons.length > 0 && !selectedPersonId) {
      setSelectedPersonId(elderlyPersons[0].id);
    }
  }, [elderlyPersons, selectedPersonId]);

  // Fetch floor plan
  const { data: floorPlan, isLoading: floorPlanLoading } = useQuery({
    queryKey: ['floor-plan', selectedPersonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('floor_plans')
        .select('*')
        .eq('elderly_person_id', selectedPersonId)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      // Transform the data to match FloorPlan type
      return {
        ...data,
        zones: (data.zones as any) || []
      };
    },
    enabled: !!selectedPersonId
  });

  // Fetch position data
  const { data: positionData = [], isLoading: positionLoading } = useQuery({
    queryKey: ['position-data', selectedPersonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_data')
        .select('*, devices(*)')
        .eq('elderly_person_id', selectedPersonId)
        .eq('data_type', 'position')
        .order('recorded_at', { ascending: true })
        .limit(1000);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedPersonId
  });

  if (elderlyLoading || floorPlanLoading || positionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header showBackButton title="Indoor Tracking" subtitle="Real-time positioning system" />
        <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (!floorPlan) {
    return (
      <div className="min-h-screen bg-background">
        <Header showBackButton title="Indoor Tracking" subtitle="Real-time positioning system" />
        <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">No Floor Plan Found</h2>
            <p className="text-muted-foreground">
              Register a worker-wearable device to see indoor tracking
            </p>
          </div>
        </main>
      </div>
    );
  }

  const processedData = processPositionData(positionData);
  const positionEvents = processedData.events.map(event => ({
    position: event.position,
    timestamp: event.timestamp
  }));

  const currentPosition = positionEvents[currentPositionIndex]?.position;
  const trail = positionEvents.slice(Math.max(0, currentPositionIndex - 50), currentPositionIndex)
    .map(p => p.position);

  return (
    <div className="min-h-screen bg-background">
      <Header showBackButton title="Indoor Tracking" subtitle="Real-time positioning system" />

      <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        <div className="space-y-6">
          {/* Monitored Individuals Selection */}
          <ElderlyList 
            elderlyPersons={elderlyPersons} 
            selectedPersonId={selectedPersonId}
            onSelectPerson={setSelectedPersonId}
          />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <FloorPlanGrid
                floorPlan={floorPlan}
                currentPosition={currentPosition}
                trail={trail}
                showGrid={true}
              />
            </div>

            <div>
              <MovementPlayback
                positions={positionEvents}
                onPositionChange={setCurrentPositionIndex}
                currentIndex={currentPositionIndex}
              />
            </div>
          </div>

          <MovementMetrics data={processedData} />
        </div>
      </main>
    </div>
  );
}
