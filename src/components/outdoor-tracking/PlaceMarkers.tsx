import { Circle, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

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

interface PlaceMarkersProps {
  place: Place;
}

const placeIcon = L.divIcon({
  className: 'custom-place-icon',
  html: '<div style="background-color: #3b82f6; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export function PlaceMarkers({ place }: PlaceMarkersProps) {
  return (
    <>
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
    </>
  );
}
