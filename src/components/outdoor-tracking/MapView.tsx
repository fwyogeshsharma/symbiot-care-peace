import { MapContainer, TileLayer, Circle, Marker, Popup, Polyline } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GPSCoordinate } from '@/lib/gpsUtils';
import { GeofencePlace, getPlaceTypeColor } from '@/lib/geofenceUtils';

// Fix Leaflet default icon issue
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const defaultIcon = new Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapViewProps {
  center: [number, number];
  currentPosition?: GPSCoordinate;
  geofencePlaces: GeofencePlace[];
  gpsTrail: [number, number][];
  zoom?: number;
}

export function MapView({
  center,
  currentPosition,
  geofencePlaces,
  gpsTrail,
  zoom = 13,
}: MapViewProps) {
  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden border border-border">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Geofence circles */}
        {geofencePlaces.map(place => (
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
              <div className="font-semibold">{place.name}</div>
              <div className="text-sm text-muted-foreground">{place.place_type}</div>
              {place.address && <div className="text-xs mt-1">{place.address}</div>}
            </Popup>
          </Circle>
        ))}

        {/* Geofence markers */}
        {geofencePlaces.map(place => (
          <Marker
            key={`marker-${place.id}`}
            position={[place.latitude, place.longitude]}
            icon={defaultIcon}
          >
            <Popup>
              <div className="font-semibold">{place.name}</div>
              <div className="text-sm text-muted-foreground">{place.place_type}</div>
              {place.address && <div className="text-xs mt-1">{place.address}</div>}
            </Popup>
          </Marker>
        ))}

        {/* GPS trail */}
        {gpsTrail.length > 1 && (
          <Polyline
            positions={gpsTrail}
            pathOptions={{
              color: 'hsl(var(--primary))',
              weight: 3,
              opacity: 0.7,
            }}
          />
        )}

        {/* Current position */}
        {currentPosition && (
          <Circle
            center={[currentPosition.latitude, currentPosition.longitude]}
            radius={currentPosition.accuracy || 10}
            pathOptions={{
              color: 'hsl(var(--primary))',
              fillColor: 'hsl(var(--primary))',
              fillOpacity: 0.5,
              weight: 2,
            }}
          >
            <Popup>
              <div className="font-semibold">Current Position</div>
              <div className="text-xs">
                {currentPosition.latitude.toFixed(6)}, {currentPosition.longitude.toFixed(6)}
              </div>
            </Popup>
          </Circle>
        )}
      </MapContainer>
    </div>
  );
}
