import { Circle, Marker, Polyline, Popup } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation } from 'lucide-react';
import { StableMapContainer } from './StableMapContainer';
import { useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  const center = useMemo((): [number, number] => {
    if (currentPosition) {
      return [currentPosition.latitude, currentPosition.longitude];
    }
    if (places.length > 0) {
      return [places[0].latitude, places[0].longitude];
    }
    return [40.7128, -74.006];
  }, [currentPosition, places]);

  // Custom icons for Leaflet
  const placeIcon = L.divIcon({
    className: 'custom-place-icon',
    html: '<div style="background-color: #3b82f6; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

  const currentPositionIcon = L.divIcon({
    className: 'custom-position-icon',
    html: '<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

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
        <StableMapContainer center={center} zoom={13}>
          {places.map((place) => (
            <div key={place.id}>
              <Circle
                center={[place.latitude, place.longitude]}
                radius={place.radius_meters}
                pathOptions={{
                  color: place.color,
                  opacity: 0.8,
                  weight: 2,
                  fillColor: place.color,
                  fillOpacity: 0.2,
                }}
              />
              <Marker position={[place.latitude, place.longitude]} icon={placeIcon}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{place.name}</p>
                    <p className="text-muted-foreground">
                      {place.place_type} • {place.radius_meters}m radius
                    </p>
                  </div>
                </Popup>
              </Marker>
            </div>
          ))}

          {trail.length > 1 && (
            <Polyline
              positions={trail.map((p) => [p.latitude, p.longitude] as [number, number])}
              pathOptions={{
                color: '#8b5cf6',
                opacity: 0.7,
                weight: 3,
              }}
            />
          )}

          {currentPosition && (
            <Marker position={[currentPosition.latitude, currentPosition.longitude]} icon={currentPositionIcon}>
              <Popup>Current Position</Popup>
            </Marker>
          )}
        </StableMapContainer>
      </CardContent>
    </Card>
  );
}
