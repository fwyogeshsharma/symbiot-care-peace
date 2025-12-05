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
import { Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getDateRangePreset } from '@/lib/movementUtils';

export default function IndoorTracking() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState(getDateRangePreset('today'));
  const [selectedPreset, setSelectedPreset] = useState<string>('today');

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
        zones: (data.zones as any) || [],
        furniture: (data.furniture as any) || []
      };
    },
    enabled: !!selectedPersonId
  });

  // Fetch position data
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
    enabled: !!selectedPersonId
  });

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    if (preset === 'today' || preset === 'last7days' || preset === 'last30days') {
      setDateRange(getDateRangePreset(preset));
    }
  };

  if (elderlyLoading || floorPlanLoading || positionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header showBackButton title={t('tracking.indoorTracking')} subtitle={t('tracking.positioningVisualization')} />
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
        <Header showBackButton title={t('tracking.indoorTracking')} subtitle={t('tracking.positioningVisualization')} />
        <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
          <div className="space-y-6">
            {/* Monitored Individuals Selection */}
            <ElderlyList
              elderlyPersons={elderlyPersons}
              selectedPersonId={selectedPersonId}
              onSelectPerson={setSelectedPersonId}
            />

            <div className="text-center py-12">
              <h2 className="text-2xl font-bold mb-4">{t('tracking.noFloorPlan.title')}</h2>
              <p className="text-muted-foreground">
                {t('tracking.noFloorPlan.description')}
              </p>
            </div>
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
      <Header showBackButton title={t('tracking.indoorTracking')} subtitle={t('tracking.positioningVisualization')} />

      <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{t('tracking.indoorTracking')}</h1>
              <p className="text-muted-foreground">
                {t('tracking.positioningVisualization')}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {(userRole === 'admin' || userRole === 'super_admin') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/floor-plan-management')}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  {t('tracking.floorPlans')}
                </Button>
              )}

              <Select value={selectedPreset} onValueChange={handlePresetChange}>
                <SelectTrigger className="w-[180px]">
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

              {positionEvents.length === 0 && (
                <div className="mt-4 p-4 bg-muted rounded-lg text-sm">
                  <p className="font-medium mb-2">{t('tracking.noMovementData.title')}</p>
                  <p className="text-muted-foreground">
                    {t('tracking.noMovementData.description')}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => navigate('/dashboard')}
                  >
                    {t('tracking.noMovementData.goToDashboard')}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <MovementMetrics data={processedData} />
        </div>
      </main>
    </div>
  );
}
