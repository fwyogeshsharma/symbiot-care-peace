import { useCallback, useState } from 'react';
import { GoogleMap, LoadScript, Marker, Circle, Polyline, InfoWindow } from '@react-google-maps/api';
import { GPSCoordinate } from '@/lib/gpsUtils';
import { GeofencePlace } from '@/lib/geofenceUtils';
import { useTranslation } from 'react-i18next';

interface MapViewProps {
  center: [number, number];
  currentPosition?: GPSCoordinate;
  geofencePlaces: GeofencePlace[];
  gpsTrail: [number, number][];
  zoom?: number;
}

const mapContainerStyle = {
  width: '100%',
  height: '600px',
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: true,
  fullscreenControl: true,
};

export function MapView({
  center,
  currentPosition,
  geofencePlaces,
  gpsTrail,
  zoom = 13,
}: MapViewProps) {
  const { t } = useTranslation();
  const [selectedPlace, setSelectedPlace] = useState<GeofencePlace | null>(null);
  const [showCurrentInfo, setShowCurrentInfo] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const mapCenter = {
    lat: center[0],
    lng: center[1],
  };

  const handleLoad = useCallback((map: google.maps.Map) => {
    // Optional: Fit bounds to show all markers
    if (geofencePlaces.length > 0 || currentPosition) {
      const bounds = new google.maps.LatLngBounds();
      
      geofencePlaces.forEach(place => {
        bounds.extend({ lat: place.latitude, lng: place.longitude });
      });
      
      if (currentPosition) {
        bounds.extend({ lat: currentPosition.latitude, lng: currentPosition.longitude });
      }
      
      map.fitBounds(bounds);
    }
  }, [geofencePlaces, currentPosition]);

  const handleScriptLoad = () => {
    setIsLoaded(true);
  };

  return (
    <div className="w-full rounded-lg overflow-hidden border border-border">
      <LoadScript 
        googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
        onLoad={handleScriptLoad}
      >
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={zoom}
          options={mapOptions}
          onLoad={handleLoad}
        >
          {isLoaded && (
            <>
              {/* Geofence circles and markers */}
              {geofencePlaces.map(place => (
                <div key={place.id}>
                  <Circle
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
                  <Marker
                    position={{ lat: place.latitude, lng: place.longitude }}
                    onClick={() => setSelectedPlace(place)}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 8,
                      fillColor: place.color,
                      fillOpacity: 1,
                      strokeColor: '#ffffff',
                      strokeWeight: 2,
                    }}
                  />
                  {selectedPlace?.id === place.id && (
                    <InfoWindow
                      position={{ lat: place.latitude, lng: place.longitude }}
                      onCloseClick={() => setSelectedPlace(null)}
                    >
                      <div className="p-2">
                        <div className="font-semibold text-foreground">{place.name}</div>
                        <div className="text-sm text-muted-foreground">{place.place_type}</div>
                        {place.address && <div className="text-xs mt-1">{place.address}</div>}
                      </div>
                    </InfoWindow>
                  )}
                </div>
              ))}

              {/* GPS trail */}
              {gpsTrail.length > 1 && (
                <Polyline
                  path={gpsTrail.map(([lat, lng]) => ({ lat, lng }))}
                  options={{
                    strokeColor: '#3b82f6',
                    strokeOpacity: 0.7,
                    strokeWeight: 3,
                  }}
                />
              )}

              {/* Current position */}
              {currentPosition && (
                <>
                  <Circle
                    center={{ lat: currentPosition.latitude, lng: currentPosition.longitude }}
                    radius={currentPosition.accuracy || 10}
                    options={{
                      strokeColor: '#3b82f6',
                      strokeOpacity: 0.8,
                      strokeWeight: 2,
                      fillColor: '#3b82f6',
                      fillOpacity: 0.5,
                    }}
                  />
                  <Marker
                    position={{ lat: currentPosition.latitude, lng: currentPosition.longitude }}
                    onClick={() => setShowCurrentInfo(true)}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 10,
                      fillColor: '#3b82f6',
                      fillOpacity: 1,
                      strokeColor: '#ffffff',
                      strokeWeight: 3,
                    }}
                  />
                  {showCurrentInfo && (
                    <InfoWindow
                      position={{ lat: currentPosition.latitude, lng: currentPosition.longitude }}
                      onCloseClick={() => setShowCurrentInfo(false)}
                    >
                      <div className="p-2">
                        <div className="font-semibold text-foreground">{t('tracking.map.currentPosition')}</div>
                        <div className="text-xs">
                          {currentPosition.latitude.toFixed(6)}, {currentPosition.longitude.toFixed(6)}
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </>
              )}
            </>
          )}
        </GoogleMap>
      </LoadScript>
    </div>
  );
}
