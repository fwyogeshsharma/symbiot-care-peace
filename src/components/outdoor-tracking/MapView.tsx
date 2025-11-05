import { MapContainer, TileLayer, Circle, Marker, Polyline, Popup } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in react-leaflet
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

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
  // Determine map center
  const center: [number, number] = currentPosition
    ? [currentPosition.latitude, currentPosition.longitude]
    : places.length > 0
    ? [places[0].latitude, places[0].longitude]
    : [40.7128, -74.006];

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
        <div style={{ height: '500px', borderRadius: '8px', overflow: 'hidden' }}>
          <MapContainer
            center={center}
            zoom={13}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {places.map((place) => (
              <Circle
                key={`circle-${place.id}`}
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
            ))}
            
            {places.map((place) => (
              <Marker key={`marker-${place.id}`} position={[place.latitude, place.longitude]}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{place.name}</p>
                    <p className="text-muted-foreground">
                      {place.place_type} • {place.radius_meters}m radius
                    </p>
                  </div>
                </Popup>
              </Marker>
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
              <Marker position={[currentPosition.latitude, currentPosition.longitude]}>
                <Popup>Current Position</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}
