import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Plus, MapPin, Trash2, Target } from 'lucide-react';
import { toast } from 'sonner';
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';

interface Place {
  id: string;
  name: string;
  place_type: string;
  address?: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  color: string;
  icon?: string;
  notes?: string;
  is_active: boolean;
}

interface PlaceManagerProps {
  elderlyPersonId: string;
  onPlaceClick?: (placeId: string) => void;
}

const PLACE_TYPES = [
  { value: 'home', label: 'Home', icon: '🏠', color: '#3b82f6' },
  { value: 'work', label: 'Work', icon: '💼', color: '#6366f1' },
  { value: 'hospital', label: 'Hospital', icon: '🏥', color: '#ef4444' },
  { value: 'mall', label: 'Mall', icon: '🛒', color: '#8b5cf6' },
  { value: 'grocery', label: 'Grocery Store', icon: '🛒', color: '#10b981' },
  { value: 'relative', label: 'Relative', icon: '👨‍👩‍👧', color: '#f59e0b' },
  { value: 'doctor', label: 'Doctor', icon: '👨‍⚕️', color: '#3b82f6' },
  { value: 'park', label: 'Park', icon: '🌳', color: '#22c55e' },
  { value: 'pharmacy', label: 'Pharmacy', icon: '💊', color: '#ec4899' },
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️', color: '#f97316' },
  { value: 'other', label: 'Other', icon: '📍', color: '#6366f1' },
];

export function PlaceManager({ elderlyPersonId, onPlaceClick }: PlaceManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    place_type: 'other',
    address: '',
    latitude: 0,
    longitude: 0,
    radius_meters: 100,
    notes: '',
  });

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  const queryClient = useQueryClient();

  const { data: places = [], isLoading } = useQuery({
    queryKey: ['geofence-places', elderlyPersonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('geofence_places')
        .select('*')
        .eq('elderly_person_id', elderlyPersonId)
        .order('name');
      
      if (error) throw error;
      return data as Place[];
    },
    enabled: !!elderlyPersonId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!elderlyPersonId) {
        throw new Error('No elderly person selected');
      }
      const placeType = PLACE_TYPES.find(t => t.value === data.place_type);
      const { error } = await supabase.from('geofence_places').insert({
        elderly_person_id: elderlyPersonId,
        name: data.name,
        place_type: data.place_type,
        address: data.address || null,
        latitude: data.latitude,
        longitude: data.longitude,
        radius_meters: data.radius_meters,
        color: placeType?.color || '#6366f1',
        icon: placeType?.icon,
        notes: data.notes || null,
      });
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofence-places'] });
      toast.success('Place added successfully');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error('Failed to add place'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (placeId: string) => {
      const { error } = await supabase
        .from('geofence_places')
        .delete()
        .eq('id', placeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofence-places'] });
      toast.success('Place deleted');
    },
    onError: () => toast.error('Failed to delete place'),
  });

  // Geocode address using Google Geocoding API
  useEffect(() => {
    const geocodeAddress = async () => {
      if (formData.address.length < 5 || !isLoaded) return;
      
      setIsGeocoding(true);
      try {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: formData.address }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const location = results[0].geometry.location;
            setFormData(prev => ({
              ...prev,
              latitude: location.lat(),
              longitude: location.lng(),
            }));
            toast.success('Location found! Coordinates updated.');
          }
        });
      } catch (error) {
        console.error('Geocoding error:', error);
      } finally {
        setIsGeocoding(false);
      }
    };

    const timeoutId = setTimeout(geocodeAddress, 1000);
    return () => clearTimeout(timeoutId);
  }, [formData.address, isLoaded]);

  const resetForm = () => {
    setFormData({
      name: '',
      place_type: 'other',
      address: '',
      latitude: 0,
      longitude: 0,
      radius_meters: 100,
      notes: '',
    });
    setEditingPlace(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.latitude === 0 || formData.longitude === 0) {
      toast.error('Please fill in all required fields and set location on map');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setFormData(prev => ({
        ...prev,
        latitude: e.latLng!.lat(),
        longitude: e.latLng!.lng(),
      }));
      toast.success('Location set! You can adjust it by clicking again.');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Places</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Place
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Place</DialogTitle>
              <DialogDescription>
                Create a new geofence location for tracking
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Place Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., City Hospital"
                  required
                />
              </div>

              <div>
                <Label htmlFor="place_type">Type *</Label>
                <Select
                  value={formData.place_type}
                  onValueChange={(value) => setFormData({ ...formData, place_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLACE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <span className="flex items-center gap-2">
                          <span>{type.icon}</span>
                          <span>{type.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="address">Address {isGeocoding && <span className="text-xs text-muted-foreground">(searching...)</span>}</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Type address to auto-fill coordinates"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Coordinates will be automatically filled when you type an address, or click "Set on Map" below
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Click on Map to Set Location</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMap(!showMap)}
                  >
                    <Target className="h-4 w-4 mr-2" />
                    {showMap ? 'Hide Map' : 'Set on Map'}
                  </Button>
                </div>
                
                {showMap && isLoaded && (
                  <div className="border rounded-lg overflow-hidden">
                    <GoogleMap
                      mapContainerStyle={{ height: '300px', width: '100%' }}
                      center={
                        formData.latitude !== 0 && formData.longitude !== 0
                          ? { lat: formData.latitude, lng: formData.longitude }
                          : { lat: 40.7128, lng: -74.006 }
                      }
                      zoom={13}
                      onClick={handleMapClick}
                    >
                      {formData.latitude !== 0 && formData.longitude !== 0 && (
                        <Marker position={{ lat: formData.latitude, lng: formData.longitude }} />
                      )}
                    </GoogleMap>
                    <p className="text-xs text-muted-foreground p-2 bg-muted">
                      Click anywhere on the map to set the place location
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="latitude">Latitude *</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="0.000001"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                    placeholder="40.7128"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="longitude">Longitude *</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="0.000001"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                    placeholder="-74.0060"
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Radius: {formData.radius_meters}m</Label>
                <Slider
                  value={[formData.radius_meters]}
                  onValueChange={([value]) => setFormData({ ...formData, radius_meters: value })}
                  min={50}
                  max={500}
                  step={10}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional information..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Adding...' : 'Add Place'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading places...</div>
        ) : places.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            No places added yet. Click "Add Place" to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {places.map((place) => (
              <div
                key={place.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => onPlaceClick?.(place.id)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-full"
                    style={{ backgroundColor: place.color + '20' }}
                  >
                    <span className="text-xl">{place.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{place.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {PLACE_TYPES.find(t => t.value === place.place_type)?.label}
                    </div>
                  </div>
                  <Badge variant="outline">{place.radius_meters}m</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this place?')) {
                      deleteMutation.mutate(place.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
