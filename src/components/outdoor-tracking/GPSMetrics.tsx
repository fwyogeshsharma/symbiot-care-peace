import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GPSCoordinate, calculateTotalDistance, formatDistance } from '@/lib/gpsUtils';
import { GeofenceEvent, GeofencePlace, getMostVisitedPlaces, formatDuration } from '@/lib/geofenceUtils';
import { MapPin, Clock, TrendingUp } from 'lucide-react';

interface GPSMetricsProps {
  gpsData: GPSCoordinate[];
  events: GeofenceEvent[];
  places: GeofencePlace[];
}

export function GPSMetrics({ gpsData, events, places }: GPSMetricsProps) {
  const totalDistance = calculateTotalDistance(gpsData);
  const mostVisited = getMostVisitedPlaces(events, places, 3);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatDistance(totalDistance)}</div>
          <p className="text-xs text-muted-foreground">
            Based on {gpsData.length} GPS points
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Locations Visited</CardTitle>
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{places.length}</div>
          <p className="text-xs text-muted-foreground">
            Active geofence locations
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Events</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{events.length}</div>
          <p className="text-xs text-muted-foreground">
            Entry and exit events
          </p>
        </CardContent>
      </Card>

      {mostVisited.length > 0 && (
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Most Visited Places</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mostVisited.map(({ place, visits, totalMinutes }) => (
                <div key={place.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: place.color }}
                    />
                    <span className="font-medium">{place.name}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {visits} {visits === 1 ? 'visit' : 'visits'} • {formatDuration(totalMinutes)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
