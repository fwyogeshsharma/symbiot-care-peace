import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FloorPlanGrid } from '@/components/indoor-tracking/FloorPlanGrid';
import { MovementPlayback } from '@/components/indoor-tracking/MovementPlayback';
import { MovementMetrics } from '@/components/indoor-tracking/MovementMetrics';
import { processPositionData } from '@/lib/positionUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function IndoorTracking() {
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);

  // Fetch current user's elderly person
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  const { data: elderlyPerson } = useQuery({
    queryKey: ['elderly-person', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elderly_persons')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch floor plan
  const { data: floorPlan, isLoading: floorPlanLoading } = useQuery({
    queryKey: ['floor-plan', elderlyPerson?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('floor_plans')
        .select('*')
        .eq('elderly_person_id', elderlyPerson?.id)
        .single();
      
      if (error) throw error;
      
      // Transform the data to match FloorPlan type
      return {
        ...data,
        zones: (data.zones as any) || []
      };
    },
    enabled: !!elderlyPerson?.id
  });

  // Fetch position data
  const { data: positionData = [], isLoading: positionLoading } = useQuery({
    queryKey: ['position-data', elderlyPerson?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_data')
        .select('*, devices(*)')
        .eq('elderly_person_id', elderlyPerson?.id)
        .eq('data_type', 'position')
        .order('recorded_at', { ascending: true })
        .limit(1000);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!elderlyPerson?.id
  });

  if (floorPlanLoading || positionLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!floorPlan) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">No Floor Plan Found</h2>
          <p className="text-muted-foreground">
            Register a worker-wearable device to see indoor tracking
          </p>
        </div>
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Indoor Positioning</h1>
        <p className="text-muted-foreground">
          Real-time tracking and movement analysis
        </p>
      </div>

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
  );
}
