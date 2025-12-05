import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDuration, GeofenceEvent, GeofencePlace } from '@/lib/geofenceUtils';
import { format } from 'date-fns';
import { LogIn, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface GeofenceEventsTimelineProps {
  elderlyPersonId: string;
  startDate: Date;
  endDate: Date;
  places: GeofencePlace[];
}

export function GeofenceEventsTimeline({
  elderlyPersonId,
  startDate,
  endDate,
  places,
}: GeofenceEventsTimelineProps) {
  const { t } = useTranslation();
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['geofence-events', elderlyPersonId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('geofence_events' as any)
        .select('*')
        .eq('elderly_person_id', elderlyPersonId)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data as any as GeofenceEvent[];
    },
  });

  const getPlaceName = (placeId: string) => {
    return places.find(p => p.id === placeId)?.name || 'Unknown Location';
  };

  const getPlaceColor = (placeId: string) => {
    return places.find(p => p.id === placeId)?.color || '#gray';
  };

  if (isLoading) {
    return <div>{t('tracking.events.loading')}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('tracking.events.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('tracking.events.noEvents')}</p>
        ) : (
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-4 pb-4 border-b border-border last:border-0">
                <div
                  className="p-2 rounded-full mt-1"
                  style={{ backgroundColor: getPlaceColor(event.place_id) + '20' }}
                >
                  {event.event_type === 'entry' ? (
                    <LogIn className="h-4 w-4" style={{ color: getPlaceColor(event.place_id) }} />
                  ) : (
                    <LogOut className="h-4 w-4" style={{ color: getPlaceColor(event.place_id) }} />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{getPlaceName(event.place_id)}</span>
                    <Badge variant={event.event_type === 'entry' ? 'default' : 'secondary'}>
                      {event.event_type === 'entry' ? t('tracking.events.arrived') : t('tracking.events.left')}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {format(new Date(event.timestamp), 'MMM d, yyyy h:mm a')}
                  </div>
                  {event.duration_minutes && event.event_type === 'exit' && (
                    <div className="text-sm mt-1">
                      {t('tracking.events.duration')}: {formatDuration(event.duration_minutes)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
