import { memo, useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';

interface MapUpdaterProps {
  center: [number, number];
  zoom: number;
}

// Component to update map view without remounting
function MapUpdater({ center, zoom }: MapUpdaterProps) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  
  return null;
}

interface StableMapContainerProps {
  center: [number, number];
  zoom: number;
  children: React.ReactNode;
}

// Memoized container that doesn't remount on prop changes
export const StableMapContainer = memo(function StableMapContainer({
  center,
  zoom,
  children,
}: StableMapContainerProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={true}
      style={{ height: '500px', borderRadius: '8px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapUpdater center={center} zoom={zoom} />
      {children}
    </MapContainer>
  );
});
