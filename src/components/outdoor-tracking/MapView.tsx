import { Circle, Marker, Polyline } from '@react-google-maps/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation } from 'lucide-react';
import { GoogleMapContainer } from './GoogleMapContainer';
import { useMemo } from 'react';

interface Place {
  id: string;
  name: string;
  place_type: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  color: string;
  icon?: string;
}

interface Position {
  latitude: number;
  longitude: number;
  timestamp?: string;
}

interface MapViewProps {
  places: Place[];
  currentPosition?: Position;
  trail?: Position[];
}

export function MapView({ places, currentPosition, trail = [] }: MapViewProps) {
  const center = useMemo(() => {
    if (currentPosition) {
      return { lat: currentPosition.latitude, lng: currentPosition.longitude };
    }
    if (places.length > 0) {
      return { lat: places[0].latitude, lng: places[0].longitude };
    }
    return { lat: 40.7128, lng: -74.006 };
  }, [currentPosition, places]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Live Location Map</CardTitle>
        </div>
        {currentPosition && (
          <Badge variant="outline" className="gap-1">
            <Navigation className="h-3 w-3" />
            Live
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <GoogleMapContainer center={center} zoom={13}>
          {places.map((place) => (
            <Circle
              key={place.id}
              center={{ lat: place.latitude, lng: place.longitude }}
              radius={place.radius_meters}
              options={{
                strokeColor: place.color,
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: place.color,
                fillOpacity: 0.2,
              }}
            />
          ))}

          {places.map((place) => (
            <Marker
              key={`marker-${place.id}`}
              position={{ lat: place.latitude, lng: place.longitude }}
              label={{
                text: place.icon || '📍',
                fontSize: '24px',
              }}
            />
          ))}

          {trail.length > 1 && (
            <Polyline
              path={trail.map((p) => ({ lat: p.latitude, lng: p.longitude }))}
              options={{
                strokeColor: '#8b5cf6',
                strokeOpacity: 0.7,
                strokeWeight: 3,
              }}
            />
          )}

          {currentPosition && (
            <Marker
              position={{ lat: currentPosition.latitude, lng: currentPosition.longitude }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#3b82f6',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
              }}
              animation={google.maps.Animation.DROP}
            />
          )}
        </GoogleMapContainer>
      </CardContent>
    </Card>
  );
}
