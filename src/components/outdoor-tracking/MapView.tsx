import { useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

// Create default icon for place markers
const defaultIcon = L.icon({
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
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

// Component to update map view when position changes
function MapUpdater({ position }: { position?: Position }) {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.setView([position.latitude, position.longitude], 15);
    }
  }, [position, map]);
  
  return null;
}

// Separate the map content to ensure proper context handling
function MapContent({ places, currentPosition, trail }: MapViewProps) {
  return (
    <>
      <MapUpdater position={currentPosition} />
      
      {/* Draw geofence circles */}
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
        >
          <Popup>
            <div className="text-center">
              <div className="text-lg mb-1">{place.icon}</div>
              <div className="font-semibold">{place.name}</div>
              <div className="text-sm text-muted-foreground">{place.place_type}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Radius: {place.radius_meters}m
              </div>
            </div>
          </Popup>
        </Circle>
      ))}
      
      {/* Place markers */}
      {places.map((place) => (
        <Marker
          key={`marker-${place.id}`}
          position={[place.latitude, place.longitude]}
          icon={defaultIcon}
        >
          <Popup>
            <div className="text-center">
              <div className="text-lg mb-1">{place.icon}</div>
              <div className="font-semibold">{place.name}</div>
              <div className="text-sm text-muted-foreground">{place.place_type}</div>
            </div>
          </Popup>
        </Marker>
      ))}
      
      {/* Movement trail */}
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
      
      {/* Current position marker */}
      {currentPosition && (
        <Marker
          position={[currentPosition.latitude, currentPosition.longitude]}
          icon={createCurrentPositionIcon()}
        >
          <Popup>
            <div className="text-center">
              <div className="font-semibold">Current Location</div>
              <div className="text-xs text-muted-foreground">
                {currentPosition.latitude.toFixed(6)}, {currentPosition.longitude.toFixed(6)}
              </div>
              {currentPosition.timestamp && (
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(currentPosition.timestamp).toLocaleString()}
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      )}
    </>
  );
}

// Create custom icon for current position
const createCurrentPositionIcon = () => {
  return L.divIcon({
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
};

export function MapView({ places, currentPosition, trail = [] }: MapViewProps) {
  // Default center (use current position or first place or default location)
  const center: [number, number] = currentPosition
    ? [currentPosition.latitude, currentPosition.longitude]
    : places.length > 0
    ? [places[0].latitude, places[0].longitude]
    : [40.7128, -74.0060]; // Default to NYC

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
        
        <MapContainer
          center={center}
          zoom={13}
          scrollWheelZoom={true}
          className="rounded-lg"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapContent places={places} currentPosition={currentPosition} trail={trail} />
        </MapContainer>
        
        {!currentPosition && places.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
            <div className="text-center text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No location data available</p>
              <p className="text-sm">Add places or wait for GPS data</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
