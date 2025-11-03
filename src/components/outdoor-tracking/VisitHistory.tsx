import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Clock, MapPin, TrendingUp } from 'lucide-react';

interface VisitEvent {
  id: string;
  place_id: string;
  event_type: 'entry' | 'exit';
  timestamp: string;
  duration_minutes?: number;
  geofence_places: {
    name: string;
    place_type: string;
    icon?: string;
    color: string;
  };
}

interface VisitHistoryProps {
  elderlyPersonId: string;
  dateRange?: { from: Date; to: Date };
}

export function VisitHistory({ elderlyPersonId, dateRange }: VisitHistoryProps) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['geofence-events', elderlyPersonId, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('geofence_events')
        .select(`
          *,
          geofence_places!inner(name, place_type, icon, color)
        `)
        .eq('elderly_person_id', elderlyPersonId)
        .order('timestamp', { ascending: false })
        .limit(20);

      if (dateRange) {
        query = query
          .gte('timestamp', dateRange.from.toISOString())
          .lte('timestamp', dateRange.to.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as VisitEvent[];
    },
    enabled: !!elderlyPersonId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Calculate statistics
  const stats = {
    totalVisits: events.filter(e => e.event_type === 'entry').length,
    totalDuration: events.reduce((sum, e) => sum + (e.duration_minutes || 0), 0),
    uniquePlaces: new Set(events.map(e => e.place_id)).size,
  };

  // Group events by place for visit pairs
  const visits: Array<{
    place: VisitEvent['geofence_places'];
    entry: VisitEvent;
    exit?: VisitEvent;
  }> = [];

  events.forEach(event => {
    if (event.event_type === 'entry') {
      const exit = events.find(
        e => e.event_type === 'exit' && 
        e.place_id === event.place_id && 
        new Date(e.timestamp) > new Date(event.timestamp)
      );
      visits.push({
        place: event.geofence_places,
        entry: event,
        exit,
      });
    }
  });

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.totalVisits}</div>
                <div className="text-sm text-muted-foreground">Total Visits</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {Math.floor(stats.totalDuration / 60)}h {stats.totalDuration % 60}m
                </div>
                <div className="text-sm text-muted-foreground">Total Time</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.uniquePlaces}</div>
                <div className="text-sm text-muted-foreground">Places Visited</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visit History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Visits</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading visit history...</div>
          ) : visits.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No visits recorded yet
            </div>
          ) : (
            <div className="space-y-3">
              {visits.map((visit, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div
                    className="flex items-center justify-center w-12 h-12 rounded-full shrink-0"
                    style={{ backgroundColor: visit.place.color + '20' }}
                  >
                    <span className="text-2xl">{visit.place.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{visit.place.name}</div>
                    <div className="text-sm text-muted-foreground space-y-1 mt-1">
                      <div className="flex items-center gap-2">
                        <span>Entry:</span>
                        <span>{format(new Date(visit.entry.timestamp), 'MMM dd, hh:mm a')}</span>
                      </div>
                      {visit.exit && (
                        <>
                          <div className="flex items-center gap-2">
                            <span>Exit:</span>
                            <span>{format(new Date(visit.exit.timestamp), 'MMM dd, hh:mm a')}</span>
                          </div>
                          {visit.exit.duration_minutes && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              <span>
                                Duration: {Math.floor(visit.exit.duration_minutes / 60)}h{' '}
                                {visit.exit.duration_minutes % 60}m
                              </span>
                            </div>
                          )}
                        </>
                      )}
                      {!visit.exit && (
                        <Badge variant="secondary" className="text-xs">
                          Currently Inside
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
