import { Circle, Marker, Polyline } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { StableMapContainer } from './StableMapContainer';
import { MapErrorBoundary } from './MapErrorBoundary';
import { useMemo } from 'react';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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

// Create custom icon for current position (memoized to prevent recreation)
const currentPositionIcon = L.divIcon({
  className: 'custom-current-position',
  html: `
    <div style="position: relative; width: 30px; height: 30px;">
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 16px;
        height: 16px;
        background: #3b82f6;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 30px;
        height: 30px;
        background: rgba(59, 130, 246, 0.3);
        border-radius: 50%;
        animation: pulse 2s ease-out infinite;
      "></div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

export function MapView({ places, currentPosition, trail = [] }: MapViewProps) {
  // Memoize center calculation
  const center: [number, number] = useMemo(() => {
    if (currentPosition) {
      return [currentPosition.latitude, currentPosition.longitude];
    }
    if (places.length > 0) {
      return [places[0].latitude, places[0].longitude];
    }
    return [40.7128, -74.0060]; // Default to NYC
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
        <style>{`
          @keyframes pulse {
            0% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 1;
            }
            100% {
              transform: translate(-50%, -50%) scale(2);
              opacity: 0;
            }
          }
          .leaflet-container {
            height: 500px;
            border-radius: 8px;
            z-index: 0;
          }
        `}</style>
        
        <MapErrorBoundary>
          <StableMapContainer center={center} zoom={13}>
            {places.map((place) => (
              <Circle
                key={place.id}
                center={[place.latitude, place.longitude]}
                radius={place.radius_meters}
                pathOptions={{
                  color: place.color,
                  fillColor: place.color,
                  fillOpacity: 0.2,
                  weight: 2,
                }}
              />
            ))}
            
            {places.map((place) => (
              <Marker
                key={`marker-${place.id}`}
                position={[place.latitude, place.longitude]}
              />
            ))}
            
            {trail.length > 1 && (
              <Polyline
                positions={trail.map(p => [p.latitude, p.longitude] as [number, number])}
                pathOptions={{
                  color: '#8b5cf6',
                  weight: 3,
                  opacity: 0.7,
                  dashArray: '5, 10',
                }}
              />
            )}
            
            {currentPosition && (
              <Marker
                position={[currentPosition.latitude, currentPosition.longitude]}
                icon={currentPositionIcon}
              />
            )}
          </StableMapContainer>
        </MapErrorBoundary>
      </CardContent>
    </Card>
  );
}
