import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FloorPlanGrid } from '@/components/indoor-tracking/FloorPlanGrid';
import { MovementPlayback } from '@/components/indoor-tracking/MovementPlayback';
import { MovementMetrics } from '@/components/indoor-tracking/MovementMetrics';
import { MapView } from '@/components/outdoor-tracking/MapView';
import { GeofenceManager } from '@/components/outdoor-tracking/GeofenceManager';
import { GeofenceEventsTimeline } from '@/components/outdoor-tracking/GeofenceEventsTimeline';
import { GPSMetrics } from '@/components/outdoor-tracking/GPSMetrics';
import { processPositionData } from '@/lib/positionUtils';
import { processGPSTrail, GPSCoordinate } from '@/lib/gpsUtils';
import { GeofencePlace } from '@/lib/geofenceUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/layout/Header';
import ElderlyList from '@/components/dashboard/ElderlyList';
import { Calendar, MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getDateRangePreset } from '@/lib/movementUtils';
import {useAuth} from "@/contexts/AuthContext.tsx";

export default function Tracking() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState(getDateRangePreset('today'));
  const [selectedPreset, setSelectedPreset] = useState<string>('today');
  const [activeTab, setActiveTab] = useState<'indoor' | 'outdoor'>('indoor');

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
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .rpc('get_accessible_elderly_persons', { _user_id: user.id });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Auto-select first person if none selected
  useEffect(() => {
    if (elderlyPersons.length > 0 && !selectedPersonId) {
      setSelectedPersonId(elderlyPersons[0].id);
    }
  }, [elderlyPersons, selectedPersonId]);

  // Fetch floor plan for indoor tracking
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
      
      return {
        ...data,
        furniture: (data.furniture as any) || [],
        zones: (data.zones as any) || []
      };
    },
    enabled: !!selectedPersonId && activeTab === 'indoor'
  });

  // Fetch position data for indoor tracking
  const { data: positionData = [], isLoading: positionLoading } = useQuery({
    queryKey: ['position-data', selectedPersonId, dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_data')
        .select('*, devices(*)')
        .eq('elderly_person_id', selectedPersonId)
        .eq('data_type', 'position')
        .gte('recorded_at', dateRange.start)
        .lte('recorded_at', dateRange.end)
        .order('recorded_at', { ascending: true })
        .limit(1000);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedPersonId && activeTab === 'indoor'
  });

  // Fetch GPS data for outdoor tracking
  const { data: gpsData = [], isLoading: gpsLoading } = useQuery({
    queryKey: ['gps-data', selectedPersonId, dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_data')
        .select('*')
        .eq('elderly_person_id', selectedPersonId)
        .in('data_type', ['gps', 'location', 'latitude', 'longitude'])
        .gte('recorded_at', dateRange.start)
        .lte('recorded_at', dateRange.end)
        .order('recorded_at', { ascending: true })
        .limit(1000);
      
      if (error) throw error;
      
      // Parse GPS coordinates from different data type formats
      const coordinates: GPSCoordinate[] = [];
      
      data.forEach(d => {
        const value = d.value as any;
        
        if (d.data_type === 'location' || d.data_type === 'gps') {
          // Location or GPS object with latitude/longitude
          if (value.latitude && value.longitude) {
            coordinates.push({
              latitude: typeof value.latitude === 'number' ? value.latitude : parseFloat(value.latitude),
              longitude: typeof value.longitude === 'number' ? value.longitude : parseFloat(value.longitude),
              accuracy: value.accuracy || 10,
              timestamp: d.recorded_at,
            });
          }
        }
      });
      
      return coordinates;
    },
    enabled: !!selectedPersonId && activeTab === 'outdoor'
  });

  // Fetch geofence places
  const { data: geofencePlaces = [], isLoading: placesLoading } = useQuery({
    queryKey: ['geofence-places', selectedPersonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('geofence_places' as any)
        .select('*')
        .eq('elderly_person_id', selectedPersonId)
        .eq('is_active', true);
      
      if (error) throw error;
      return data as any as GeofencePlace[];
    },
    enabled: !!selectedPersonId && activeTab === 'outdoor'
  });

  // Fetch geofence events
  const { data: geofenceEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['geofence-events', selectedPersonId, dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('geofence_events' as any)
        .select('*')
        .eq('elderly_person_id', selectedPersonId)
        .gte('timestamp', dateRange.start)
        .lte('timestamp', dateRange.end)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data as any;
    },
    enabled: !!selectedPersonId && activeTab === 'outdoor'
  });

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    if (preset === 'today' || preset === 'last7days' || preset === 'last30days') {
      setDateRange(getDateRangePreset(preset));
    }
  };

  const isLoading = elderlyLoading || 
    (activeTab === 'indoor' && (floorPlanLoading || positionLoading)) ||
    (activeTab === 'outdoor' && (gpsLoading || placesLoading || eventsLoading));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header showBackButton title="Tracking" subtitle="Indoor and outdoor positioning system" />
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

  // Process indoor tracking data
  const processedData = activeTab === 'indoor' ? processPositionData(positionData) : null;
  const positionEvents = processedData ? processedData.events.map(event => ({
    position: event.position,
    timestamp: event.timestamp
  })) : [];

  const currentPosition = positionEvents[currentPositionIndex]?.position;
  const trail = positionEvents.slice(Math.max(0, currentPositionIndex - 50), currentPositionIndex)
    .map(p => p.position);

  // Process outdoor tracking data
  const gpsTrail = activeTab === 'outdoor' ? processGPSTrail(gpsData) : [];
  const currentGPSPosition = gpsData.length > 0 ? gpsData[gpsData.length - 1] : undefined;
  const mapCenter: [number, number] = currentGPSPosition 
    ? [currentGPSPosition.latitude, currentGPSPosition.longitude]
    : [40.7128, -74.0060]; // Default to NYC

  return (
    <div className="min-h-screen bg-background">
      <Header showBackButton title="Tracking" subtitle="Indoor and outdoor positioning system" />

      <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Movement Tracking</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Real-time indoor and outdoor positioning
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/floor-plan-management')}
                className="w-full sm:w-auto"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Floor Plans
              </Button>

              <Select value={selectedPreset} onValueChange={handlePresetChange}>
                <SelectTrigger className="w-full sm:w-[180px]">
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

          {/* Indoor/Outdoor Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'indoor' | 'outdoor')}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="indoor">
                <MapPin className="h-4 w-4 mr-2" />
                Indoor Tracking
              </TabsTrigger>
              <TabsTrigger value="outdoor">
                <Navigation className="h-4 w-4 mr-2" />
                Outdoor Tracking
              </TabsTrigger>
            </TabsList>

            {/* Indoor Tracking Tab */}
            <TabsContent value="indoor" className="space-y-6">
              {!floorPlan ? (
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold mb-4">No Floor Plan Found</h2>
                  <p className="text-muted-foreground">
                    Register a worker-wearable device to see indoor tracking
                  </p>
                </div>
              ) : (
                <>
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

                  {processedData && <MovementMetrics data={processedData} />}
                </>
              )}
            </TabsContent>

            {/* Outdoor GPS Tab */}
            <TabsContent value="outdoor" className="space-y-6">
              {gpsData.length === 0 ? (
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold mb-4">No GPS Data Available</h2>
                  <p className="text-muted-foreground">
                    Register a GPS device to see outdoor tracking
                  </p>
                </div>
              ) : (
                <>
                  <GPSMetrics 
                    gpsData={gpsData} 
                    events={geofenceEvents} 
                    places={geofencePlaces} 
                  />

                  <MapView
                    center={mapCenter}
                    currentPosition={currentGPSPosition}
                    geofencePlaces={geofencePlaces}
                    gpsTrail={gpsTrail}
                  />

                  <div className="grid gap-6 lg:grid-cols-2">
                    <GeofenceEventsTimeline
                      elderlyPersonId={selectedPersonId!}
                      startDate={new Date(dateRange.start)}
                      endDate={new Date(dateRange.end)}
                      places={geofencePlaces}
                    />

                    <GeofenceManager elderlyPersonId={selectedPersonId!} />
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
