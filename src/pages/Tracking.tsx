import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FloorPlanGrid } from '@/components/indoor-tracking/FloorPlanGrid';
import { MovementPlayback } from '@/components/indoor-tracking/MovementPlayback';
import { MovementMetrics } from '@/components/indoor-tracking/MovementMetrics';
import { MapView } from '@/components/outdoor-tracking/MapView';
import { GeofenceManager } from '@/components/outdoor-tracking/GeofenceManager';
import { GeofenceEventsTimeline } from '@/components/outdoor-tracking/GeofenceEventsTimeline';
import { GPSMetrics } from '@/components/outdoor-tracking/GPSMetrics';
import CameraGrid from '@/components/camera/CameraGrid';
import { processPositionData } from '@/lib/positionUtils';
import { processGPSTrail, GPSCoordinate } from '@/lib/gpsUtils';
import { GeofencePlace } from '@/lib/geofenceUtils';
import { detectGeofenceEvents } from '@/lib/geofenceDetectionService';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/layout/Header';
import ElderlyList from '@/components/dashboard/ElderlyList';
import { Calendar, MapPin, Navigation, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { OnboardingTour, useShouldShowTour } from '@/components/help/OnboardingTour';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getDateRangePreset } from '@/lib/movementUtils';
import { useTranslation } from 'react-i18next';
import { Footer } from '@/components/Footer';

export default function Tracking() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const shouldShowTour = useShouldShowTour();
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState(getDateRangePreset('today'));
  const [selectedPreset, setSelectedPreset] = useState<string>('today');
  const [activeTab, setActiveTab] = useState<'indoor' | 'outdoor' | 'camera'>('indoor');

  // Fetch current user
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
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
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
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
        .select('id, elderly_person_id, name, image_url, width, height, furniture, zones, grid_size, created_at, updated_at')
        .eq('elderly_person_id', selectedPersonId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        elderly_person_id: data.elderly_person_id,
        name: data.name,
        image_url: data.image_url || undefined,
        width: data.width,
        height: data.height,
        grid_size: data.grid_size || 20,
        furniture: (data.furniture as any) || [],
        zones: (data.zones as any) || [],
        created_at: data.created_at || '',
        updated_at: data.updated_at || ''
      };
    },
    enabled: !!selectedPersonId && activeTab === 'indoor',
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch position data for indoor tracking
  const { data: positionData = [], isLoading: positionLoading } = useQuery({
    queryKey: ['position-data', selectedPersonId, dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_data')
        .select('id, value, recorded_at, data_type')
        .eq('elderly_person_id', selectedPersonId)
        .eq('data_type', 'position')
        .gte('recorded_at', dateRange.start)
        .lte('recorded_at', dateRange.end)
        .order('recorded_at', { ascending: true })
        .limit(500); // Reduced from 1000

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedPersonId && activeTab === 'indoor',
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  // Fetch GPS data for outdoor tracking
  const { data: gpsData = [], isLoading: gpsLoading } = useQuery({
    queryKey: ['gps-data', selectedPersonId, dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_data')
        .select('value, recorded_at, data_type')
        .eq('elderly_person_id', selectedPersonId)
        .in('data_type', ['gps', 'location', 'latitude', 'longitude'])
        .gte('recorded_at', dateRange.start)
        .lte('recorded_at', dateRange.end)
        .order('recorded_at', { ascending: true })
        .limit(500); // Reduced from 1000

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
    enabled: !!selectedPersonId && activeTab === 'outdoor',
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  // Fetch geofence places
  const { data: geofencePlaces = [], isLoading: placesLoading } = useQuery({
    queryKey: ['geofence-places', selectedPersonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('geofence_places' as any)
        .select('id, elderly_person_id, name, latitude, longitude, radius_meters, is_active')
        .eq('elderly_person_id', selectedPersonId)
        .eq('is_active', true);

      if (error) throw error;
      return data as any as GeofencePlace[];
    },
    enabled: !!selectedPersonId && activeTab === 'outdoor',
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });

  // Fetch geofence events
  const { data: geofenceEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['geofence-events', selectedPersonId, dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('geofence_events' as any)
        .select('id, elderly_person_id, place_id, event_type, timestamp')
        .eq('elderly_person_id', selectedPersonId)
        .gte('timestamp', dateRange.start)
        .lte('timestamp', dateRange.end)
        .order('timestamp', { ascending: false })
        .limit(100); // Add limit to prevent fetching too many events

      if (error) throw error;
      return data as any;
    },
    enabled: !!selectedPersonId && activeTab === 'outdoor',
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  // Real-time subscription for GPS data and geofence detection
  useEffect(() => {
    // Only subscribe if we have selected person and on outdoor tab
    if (!selectedPersonId || activeTab !== 'outdoor') {
      return;
    }

    // Subscribe to new GPS data
    const channel = supabase
      .channel(`gps-realtime-${selectedPersonId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'device_data',
          filter: `elderly_person_id=eq.${selectedPersonId}`
        },
        async (payload) => {
          // Check if this is GPS/location data
          const data = payload.new as any;
          if (data.data_type === 'gps' || data.data_type === 'location') {
            const value = data.value as any;
            if (value.latitude && value.longitude) {
              const gpsPoint: GPSCoordinate = {
                latitude: value.latitude,
                longitude: value.longitude,
                accuracy: value.accuracy || 10,
                timestamp: data.recorded_at
              };

              // Detect and handle geofence events (only if geofence places are loaded)
              if (geofencePlaces.length > 0) {
                await detectGeofenceEvents(
                  selectedPersonId,
                  gpsPoint,
                  geofencePlaces,
                  data.device_id
                );
              }

              // Refresh GPS data and geofence events
              queryClient.invalidateQueries({ queryKey: ['gps-data', selectedPersonId, dateRange] });
              queryClient.invalidateQueries({ queryKey: ['geofence-events', selectedPersonId, dateRange] });
            }
          }
        }
      )
      .subscribe();

    // Cleanup: unsubscribe when component unmounts or dependencies change
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedPersonId, activeTab, geofencePlaces, dateRange, queryClient]);

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    if (preset === 'today' || preset === 'last7days' || preset === 'last30days') {
      setDateRange(getDateRangePreset(preset));
    }
  };

  // Process indoor tracking data - Memoized to avoid recomputation on every render
  const processedData = useMemo(
    () => activeTab === 'indoor' ? processPositionData(positionData) : null,
    [positionData, activeTab]
  );

  const positionEvents = useMemo(
    () => processedData ? processedData.events.map(event => ({
      position: event.position,
      timestamp: event.timestamp
    })) : [],
    [processedData]
  );

  const currentPosition = positionEvents[currentPositionIndex]?.position;

  const trail = useMemo(
    () => positionEvents.slice(Math.max(0, currentPositionIndex - 50), currentPositionIndex)
      .map(p => p.position),
    [positionEvents, currentPositionIndex]
  );

  // Process outdoor tracking data - Memoized to avoid recomputation on every render
  const gpsTrail = useMemo(
    () => activeTab === 'outdoor' ? processGPSTrail(gpsData) : [],
    [gpsData, activeTab]
  );

  const currentGPSPosition = useMemo(
    () => gpsData.length > 0 ? gpsData[gpsData.length - 1] : undefined,
    [gpsData]
  );

  // Determine map center: use current GPS position, first geofence, or default location - Memoized
  const mapCenter: [number, number] = useMemo(
    () => currentGPSPosition
      ? [currentGPSPosition.latitude, currentGPSPosition.longitude]
      : geofencePlaces.length > 0
        ? [geofencePlaces[0].latitude, geofencePlaces[0].longitude]
        : [40.7128, -74.0060], // Default to NYC
    [currentGPSPosition, geofencePlaces]
  );

  // Only block on critical queries - user and elderly persons
  const isCriticalLoading = elderlyLoading;

  if (isCriticalLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header title={t('tracking.title')} subtitle={t('tracking.subtitle')} />
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

  // Tab-specific loading states (non-blocking)
  const isTabLoading =
    (activeTab === 'indoor' && (floorPlanLoading || positionLoading)) ||
    (activeTab === 'outdoor' && (gpsLoading || placesLoading || eventsLoading));

  return (
    <div className="min-h-screen bg-background">
      <OnboardingTour runTour={shouldShowTour} />
      <Header title={t('tracking.title')} subtitle={t('tracking.subtitle')} />

      <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{t('tracking.movementTracking')}</h1>
              <p className="text-muted-foreground">
                {t('tracking.realTimePositioning')}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/floor-plan-management')}
                data-tour="floor-plan-manager"
              >
                <MapPin className="h-4 w-4 mr-2" />
                {t('tracking.floorPlans')}
              </Button>

              <Select value={selectedPreset} onValueChange={handlePresetChange}>
                <SelectTrigger className="w-[180px]" data-tour="tracking-date-range">
                  <Calendar className="mr-2 h-4 w-4" />
                  <SelectValue placeholder={t('tracking.selectPeriod')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">{t('tracking.today')}</SelectItem>
                  <SelectItem value="last7days">{t('tracking.last7Days')}</SelectItem>
                  <SelectItem value="last30days">{t('tracking.last30Days')}</SelectItem>
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

          {/* Indoor/Outdoor/Camera Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'indoor' | 'outdoor' | 'camera')}>
            <TabsList className="grid w-full max-w-xl grid-cols-3" data-tour="tracking-tabs">
              <TabsTrigger value="indoor">
                <MapPin className="h-4 w-4 mr-2" />
                {t('tracking.indoor')}
              </TabsTrigger>
              <TabsTrigger value="outdoor">
                <Navigation className="h-4 w-4 mr-2" />
                {t('tracking.outdoor')}
              </TabsTrigger>
              <TabsTrigger value="camera">
                <Camera className="h-4 w-4 mr-2" />
                {t('tracking.cameras')}
              </TabsTrigger>
            </TabsList>

            {/* Indoor Tracking Tab */}
            <TabsContent value="indoor" className="space-y-6">
              {(floorPlanLoading || positionLoading) ? (
                <div className="space-y-6">
                  <Skeleton className="h-96 w-full" />
                  <Skeleton className="h-48 w-full" />
                </div>
              ) : !floorPlan ? (
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold mb-4">{t('tracking.noFloorPlan.title')}</h2>
                  <p className="text-muted-foreground">
                    {t('tracking.noFloorPlan.description')}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2" data-tour="tracking-floor-plan">
                      <FloorPlanGrid
                        floorPlan={floorPlan}
                        currentPosition={currentPosition}
                        trail={trail}
                        showGrid={true}
                      />
                    </div>

                    <div data-tour="tracking-playback">
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
              {(gpsLoading || placesLoading) ? (
                <div className="space-y-6">
                  <Skeleton className="h-96 w-full" />
                  <Skeleton className="h-48 w-full" />
                </div>
              ) : gpsData.length === 0 && geofencePlaces.length === 0 ? (
                <>
                  <div className="text-center py-8 bg-muted/30 rounded-lg border-2 border-dashed">
                    <Navigation className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h2 className="text-2xl font-bold mb-2">{t('tracking.noGpsData.title')}</h2>
                    <p className="text-muted-foreground mb-4">
                      {t('tracking.noGpsData.description')}
                    </p>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      {t('tracking.noGpsData.setupGeofences')}
                    </p>
                  </div>

                  {/* Show Geofence Manager when no data */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="lg:col-span-2" data-tour="tracking-geofence">
                      <GeofenceManager elderlyPersonId={selectedPersonId!} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Show GPS Metrics only if GPS data exists */}
                  {gpsData.length > 0 && (
                    <GPSMetrics
                      gpsData={gpsData}
                      events={geofenceEvents}
                      places={geofencePlaces}
                    />
                  )}

                  {/* Show map with geofences (and GPS trail if available) */}
                  {geofencePlaces.length > 0 && (
                    <>
                      {gpsData.length === 0 && (
                        <div className="mb-4 p-4 bg-info/10 border border-info/20 rounded-lg">
                          <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-info mt-0.5" />
                            <div>
                              <h3 className="font-semibold text-info">{t('tracking.geofencesConfigured.title')}</h3>
                              <p className="text-sm text-muted-foreground">
                                {t('tracking.geofencesConfigured.description')}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div data-tour="tracking-map">
                        <MapView
                          center={mapCenter}
                          currentPosition={currentGPSPosition}
                          geofencePlaces={geofencePlaces}
                          gpsTrail={gpsTrail}
                          zoom={geofencePlaces.length === 1 ? 15 : 13}
                        />
                      </div>
                    </>
                  )}

                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Show geofence events timeline only if GPS data exists */}
                    {gpsData.length > 0 && geofenceEvents.length > 0 && (
                      <GeofenceEventsTimeline
                        elderlyPersonId={selectedPersonId!}
                        startDate={new Date(dateRange.start)}
                        endDate={new Date(dateRange.end)}
                        places={geofencePlaces}
                      />
                    )}

                    {/* Always show Geofence Manager */}
                    <div
                      className={gpsData.length === 0 || geofenceEvents.length === 0 ? "lg:col-span-2" : ""}
                      data-tour="tracking-geofence"
                    >
                      <GeofenceManager elderlyPersonId={selectedPersonId!} />
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Camera Monitoring Tab */}
            <TabsContent value="camera" className="space-y-6">
              <CameraGrid title={t('tracking.securityCameras')} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
