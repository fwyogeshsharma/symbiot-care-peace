import { GoogleMap, useLoadScript } from '@react-google-maps/api';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

const mapContainerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '8px',
};

const defaultCenter = {
  lat: 40.7128,
  lng: -74.006,
};

interface GoogleMapContainerProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  children?: React.ReactNode;
}

export function GoogleMapContainer({ center = defaultCenter, zoom = 13, children }: GoogleMapContainerProps) {
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '');
  const [tempKey, setTempKey] = useState('');

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
  });

  if (loadError) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-2 text-destructive mb-4">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div>
              <p className="font-medium">Map loading error</p>
              <p className="text-sm text-muted-foreground mt-1">
                Failed to load Google Maps. Please check your API key.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!apiKey) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-2 text-amber-600">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Google Maps API Key Required</p>
              <p className="text-sm text-muted-foreground mt-1">
                To use Google Maps, please add your API key below or set <code className="bg-muted px-1 py-0.5 rounded">VITE_GOOGLE_MAPS_API_KEY</code> in your .env file.
              </p>
              <a 
                href="https://console.cloud.google.com/google/maps-apis" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline mt-2 inline-block"
              >
                Get your Google Maps API key here →
              </a>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="google-maps-key">Google Maps API Key</Label>
            <Input
              id="google-maps-key"
              type="password"
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              placeholder="Enter your Google Maps API key"
            />
            <button
              onClick={() => setApiKey(tempKey)}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Load Map
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center bg-muted rounded-lg">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={zoom}
      options={{
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
      }}
    >
      {children}
    </GoogleMap>
  );
}
