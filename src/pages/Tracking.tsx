import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import ElderlyList from '@/components/dashboard/ElderlyList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FloorPlanGrid } from '@/components/indoor-tracking/FloorPlanGrid';
import { MovementPlayback } from '@/components/indoor-tracking/MovementPlayback';
import { MovementMetrics } from '@/components/indoor-tracking/MovementMetrics';
import { MapView } from '@/components/outdoor-tracking/MapView';
import { PlaceManager } from '@/components/outdoor-tracking/PlaceManager';
import { VisitHistory } from '@/components/outdoor-tracking/VisitHistory';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Navigation } from 'lucide-react';
import { subDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { processPositionData } from '@/lib/positionUtils';

type DatePreset = 'today' | 'week' | 'month';

export default function Tracking() {
  const navigate = useNavigate();
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [preset, setPreset] = useState<DatePreset>('today');
  const [dateRange, setDateRange] = useState({
    from: new Date(),
    to: new Date(),
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: elderlyPersons = [] } = useQuery({
    queryKey: ['accessible-elderly-persons', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.rpc('get_accessible_elderly_persons', {
        _user_id: user.id,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Auto-select first person
  if (elderlyPersons.length > 0 && !selectedPersonId) {
    setSelectedPersonId(elderlyPersons[0].id);
  }

  // Indoor tracking queries
  const { data: floorPlan, isLoading: isLoadingFloorPlan } = useQuery({
    queryKey: ['floor-plan', selectedPersonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('floor_plans')
        .select('*')
        .eq('elderly_person_id', selectedPersonId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPersonId,
  });

  const { data: positionData = [] } = useQuery({
    queryKey: ['position-data', selectedPersonId, dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_data')
        .select('*')
        .eq('elderly_person_id', selectedPersonId)
        .eq('data_type', 'position')
        .gte('recorded_at', dateRange.from.toISOString())
        .lte('recorded_at', dateRange.to.toISOString())
        .order('recorded_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPersonId,
  });

  // Outdoor tracking queries
  const { data: places = [] } = useQuery({
    queryKey: ['geofence-places', selectedPersonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('geofence_places')
        .select('*')
        .eq('elderly_person_id', selectedPersonId)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPersonId,
  });

  const { data: gpsData = [] } = useQuery({
    queryKey: ['gps-data', selectedPersonId, dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_data')
        .select('*')
        .eq('elderly_person_id', selectedPersonId)
        .in('data_type', ['gps', 'location'])
        .gte('recorded_at', dateRange.from.toISOString())
        .lte('recorded_at', dateRange.to.toISOString())
        .order('recorded_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPersonId,
    refetchInterval: 30000,
  });

  const handlePresetChange = (value: DatePreset) => {
    setPreset(value);
    const now = new Date();
    let from = now;

    switch (value) {
      case 'today':
        from = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        from = subDays(now, 7);
        break;
      case 'month':
        from = subDays(now, 30);
        break;
    }

    setDateRange({ from, to: new Date() });
  };

  const processedData = processPositionData(positionData);
  
  const currentPosition = gpsData[0]?.value && typeof gpsData[0].value === 'object' && 'latitude' in gpsData[0].value && 'longitude' in gpsData[0].value
    ? { latitude: Number(gpsData[0].value.latitude), longitude: Number(gpsData[0].value.longitude) }
    : undefined;

  const trail = gpsData
    .filter(d => d.value && typeof d.value === 'object' && 'latitude' in d.value && 'longitude' in d.value)
    .map(d => {
      const val = d.value as { latitude: number; longitude: number };
      return {
        latitude: Number(val.latitude),
        longitude: Number(val.longitude),
        timestamp: d.recorded_at,
      };
    });

  return (
    <div className="min-h-screen bg-background">
      <Header title="Tracking" showBackButton />
      
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-2xl font-semibold">Location Tracking</h2>
          </div>
          <Select value={preset} onValueChange={handlePresetChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ElderlyList
          elderlyPersons={elderlyPersons}
          selectedPersonId={selectedPersonId}
          onSelectPerson={setSelectedPersonId}
        />

        {!selectedPersonId ? (
          <div className="text-center py-12 text-muted-foreground">
            Select a person to view their tracking data
          </div>
        ) : (
          <Tabs defaultValue="outdoor" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="outdoor">
                <Navigation className="h-4 w-4 mr-2" />
                Outdoor
              </TabsTrigger>
              <TabsTrigger value="indoor">
                <Building2 className="h-4 w-4 mr-2" />
                Indoor
              </TabsTrigger>
            </TabsList>

            <TabsContent value="outdoor" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <MapView
                    places={places}
                    currentPosition={currentPosition}
                    trail={trail}
                  />
                  <VisitHistory elderlyPersonId={selectedPersonId} dateRange={dateRange} />
                </div>
                <div>
                  <PlaceManager elderlyPersonId={selectedPersonId} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="indoor" className="space-y-6">
              {isLoadingFloorPlan ? (
                <div className="space-y-4">
                  <Skeleton className="h-[400px] w-full" />
                  <Skeleton className="h-[200px] w-full" />
                </div>
              ) : !floorPlan ? (
                <div className="text-center py-12 space-y-4">
                  <p className="text-muted-foreground">
                    No floor plan found for this person
                  </p>
                  {user && (
                    <Button onClick={() => navigate('/floor-plans')}>
                      <Building2 className="h-4 w-4 mr-2" />
                      Create Floor Plan
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <FloorPlanGrid
                    floorPlan={{
                      ...floorPlan,
                      zones: (floorPlan.zones as any) || []
                    }}
                    trail={processedData.events.map(e => e.position)}
                    currentPosition={processedData.events.length > 0 ? processedData.events[processedData.events.length - 1].position : undefined}
                  />
                  {processedData.events.length > 0 && (
                    <>
                      <MovementPlayback
                        positions={processedData.events}
                        onPositionChange={() => {}}
                        currentIndex={processedData.events.length - 1}
                      />
                      <MovementMetrics
                        data={processedData}
                      />
                    </>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
