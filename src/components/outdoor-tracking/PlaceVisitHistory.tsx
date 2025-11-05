import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface PlaceVisitHistoryProps {
  elderlyPersonId: string;
  placeId?: string;
}

interface GeofenceEvent {
  id: string;
  event_type: string;
  place_id: string;
  timestamp: string;
  duration_minutes: number | null;
  latitude: number;
  longitude: number;
  geofence_places: {
    name: string;
    place_type: string;
    color: string;
    icon: string;
  };
}

export function PlaceVisitHistory({ elderlyPersonId, placeId }: PlaceVisitHistoryProps) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['geofence-events', elderlyPersonId, placeId],
    queryFn: async () => {
      let query = supabase
        .from('geofence_events')
        .select(`
          *,
          geofence_places (
            name,
            place_type,
            color,
            icon
          )
        `)
        .eq('elderly_person_id', elderlyPersonId)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (placeId) {
        query = query.eq('place_id', placeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as GeofenceEvent[];
    },
    enabled: !!elderlyPersonId,
  });

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'In progress';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getEventColor = (eventType: string) => {
    return eventType === 'enter' ? 'bg-green-500/20 text-green-700' : 'bg-orange-500/20 text-orange-700';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Visit History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading history...</div>
        ) : events.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            No visit history yet
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0"
                  style={{ backgroundColor: event.geofence_places.color + '20' }}
                >
                  <span className="text-xl">{event.geofence_places.icon}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium truncate">{event.geofence_places.name}</h4>
                    <Badge 
                      variant="outline" 
                      className={getEventColor(event.event_type)}
                    >
                      {event.event_type === 'enter' ? 'Entered' : 'Exited'}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(event.timestamp), 'MMM dd, yyyy')}</span>
                      <span className="text-xs">at {format(new Date(event.timestamp), 'HH:mm')}</span>
                    </div>
                    
                    {event.event_type === 'exit' && event.duration_minutes && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>Duration: {formatDuration(event.duration_minutes)}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs">
                      <MapPin className="h-3 w-3" />
                      <span>{event.latitude.toFixed(6)}, {event.longitude.toFixed(6)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
