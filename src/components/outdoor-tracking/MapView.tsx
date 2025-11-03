import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Layers } from 'lucide-react';

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

interface MapViewProps {
  places: Place[];
  currentPosition?: { latitude: number; longitude: number };
  trail?: Array<{ latitude: number; longitude: number; timestamp: string }>;
  onMapClick?: (lat: number, lng: number) => void;
  onPlaceClick?: (placeId: string) => void;
}

const PLACE_TYPE_ICONS: Record<string, string> = {
  hospital: '🏥',
  mall: '🛒',
  grocery: '🛒',
  relative: '👨‍👩‍👧',
  doctor: '👨‍⚕️',
  park: '🌳',
  pharmacy: '💊',
  restaurant: '🍽️',
  other: '📍',
};

export function MapView({ places, currentPosition, trail, onMapClick, onPlaceClick }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [needsToken, setNeedsToken] = useState(false);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    // Check if Mapbox token is available
    const token = localStorage.getItem('mapbox_token');
    if (token) {
      setMapboxToken(token);
      initializeMap(token);
    } else {
      setNeedsToken(true);
    }
  }, []);

  const initializeMap = (token: string) => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [0, 0],
      zoom: 2,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'top-right'
    );

    if (onMapClick) {
      map.current.on('click', (e) => {
        onMapClick(e.lngLat.lat, e.lngLat.lng);
      });
    }

    setNeedsToken(false);
  };

  const handleTokenSubmit = () => {
    if (mapboxToken) {
      localStorage.setItem('mapbox_token', mapboxToken);
      initializeMap(mapboxToken);
    }
  };

  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add place markers
    places.forEach(place => {
      const el = document.createElement('div');
      el.className = 'cursor-pointer';
      el.innerHTML = `
        <div class="flex items-center justify-center w-10 h-10 rounded-full shadow-lg" style="background-color: ${place.color}">
          <span class="text-xl">${place.icon || PLACE_TYPE_ICONS[place.place_type] || '📍'}</span>
        </div>
      `;

      el.addEventListener('click', () => {
        if (onPlaceClick) onPlaceClick(place.id);
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([place.longitude, place.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2">
              <h3 class="font-semibold">${place.name}</h3>
              <p class="text-sm text-muted-foreground">${place.place_type}</p>
            </div>`
          )
        )
        .addTo(map.current!);

      markersRef.current.push(marker);

      // Add circle for geofence radius
      if (map.current!.getSource(`geofence-${place.id}`)) {
        map.current!.removeLayer(`geofence-${place.id}`);
        map.current!.removeSource(`geofence-${place.id}`);
      }

      map.current!.addSource(`geofence-${place.id}`, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [place.longitude, place.latitude],
          },
          properties: {},
        },
      });

      map.current!.addLayer({
        id: `geofence-${place.id}`,
        type: 'circle',
        source: `geofence-${place.id}`,
        paint: {
          'circle-radius': {
            stops: [
              [0, 0],
              [20, place.radius_meters],
            ],
            base: 2,
          },
          'circle-color': place.color,
          'circle-opacity': 0.1,
          'circle-stroke-width': 2,
          'circle-stroke-color': place.color,
          'circle-stroke-opacity': 0.5,
        },
      });
    });

    // Fit map to show all places
    if (places.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      places.forEach(place => {
        bounds.extend([place.longitude, place.latitude]);
      });
      map.current.fitBounds(bounds, { padding: 100 });
    }
  }, [places, onPlaceClick]);

  useEffect(() => {
    if (!map.current || !currentPosition) return;

    // Add current position marker
    const el = document.createElement('div');
    el.className = 'animate-pulse';
    el.innerHTML = `
      <div class="flex items-center justify-center w-6 h-6 rounded-full bg-primary shadow-lg">
        <div class="w-3 h-3 rounded-full bg-background"></div>
      </div>
    `;

    new mapboxgl.Marker({ element: el })
      .setLngLat([currentPosition.longitude, currentPosition.latitude])
      .addTo(map.current);
  }, [currentPosition]);

  useEffect(() => {
    if (!map.current || !trail || trail.length === 0) return;

    if (map.current.getSource('trail')) {
      map.current.removeLayer('trail');
      map.current.removeSource('trail');
    }

    map.current.addSource('trail', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: trail.map(point => [point.longitude, point.latitude]),
        },
        properties: {},
      },
    });

    map.current.addLayer({
      id: 'trail',
      type: 'line',
      source: 'trail',
      paint: {
        'line-color': 'hsl(var(--primary))',
        'line-width': 3,
        'line-opacity': 0.7,
      },
    });
  }, [trail]);

  if (needsToken) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-5 w-5" />
            <h3 className="font-semibold">Mapbox Token Required</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            To use outdoor tracking with maps, you need a Mapbox access token.
            Get one free at{' '}
            <a
              href="https://mapbox.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              mapbox.com
            </a>
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Enter Mapbox access token"
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
              type="password"
            />
            <Button onClick={handleTokenSubmit}>
              <Layers className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[500px]">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg" />
    </div>
  );
}
