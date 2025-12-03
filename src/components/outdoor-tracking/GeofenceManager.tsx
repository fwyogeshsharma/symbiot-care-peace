import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, MapPin } from 'lucide-react';
import { GeofencePlace, getPlaceTypeOptions, getPlaceTypeColor } from '@/lib/geofenceUtils';
import { metersToFeet, feetToMeters } from '@/lib/unitConversions';
import { useTranslation } from 'react-i18next';

interface GeofenceManagerProps {
  elderlyPersonId: string;
}

export function GeofenceManager({ elderlyPersonId }: GeofenceManagerProps) {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<GeofencePlace | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    place_type: 'home',
    latitude: '',
    longitude: '',
    radius_meters: '328', // 100 meters converted to feet
    address: '',
    color: '#3b82f6',
    notes: '',
  });

  const { data: places = [], isLoading } = useQuery({
    queryKey: ['geofence-places', elderlyPersonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('geofence_places' as any)
        .select('*')
        .eq('elderly_person_id', elderlyPersonId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as any as GeofencePlace[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newPlace: Partial<GeofencePlace>) => {
      const { data, error } = await supabase
        .from('geofence_places' as any)
        .insert([{ ...newPlace, elderly_person_id: elderlyPersonId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofence-places', elderlyPersonId] });
      toast.success('Geofence place created successfully');
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to create geofence place: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<GeofencePlace> }) => {
      const { data, error } = await supabase
        .from('geofence_places' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofence-places', elderlyPersonId] });
      toast.success('Geofence place updated successfully');
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to update geofence place: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('geofence_places' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofence-places', elderlyPersonId] });
      toast.success('Geofence place deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete geofence place: ' + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      place_type: 'home',
      latitude: '',
      longitude: '',
      radius_meters: '328', // 100 meters in feet
      address: '',
      color: '#3b82f6',
      notes: '',
    });
    setEditingPlace(null);
  };

  const handleEdit = (place: GeofencePlace) => {
    setEditingPlace(place);
    setFormData({
      name: place.name,
      place_type: place.place_type,
      latitude: place.latitude.toString(),
      longitude: place.longitude.toString(),
      radius_meters: Math.round(metersToFeet(place.radius_meters)).toString(),
      address: place.address || '',
      color: place.color,
      notes: place.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleGeocodeAddress = async () => {
    if (!formData.address.trim()) {
      toast.error('Please enter an address first');
      return;
    }

    setIsGeocoding(true);
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          formData.address
        )}&key=${apiKey}`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        setFormData({
          ...formData,
          latitude: location.lat.toString(),
          longitude: location.lng.toString(),
        });
        toast.success('Coordinates updated from address');
      } else {
        toast.error('Could not find coordinates for this address');
      }
    } catch (error) {
      toast.error('Failed to geocode address');
      console.error('Geocoding error:', error);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const placeData = {
      name: formData.name,
      place_type: formData.place_type,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      radius_meters: Math.round(feetToMeters(parseInt(formData.radius_meters))),
      address: formData.address || null,
      color: formData.color,
      notes: formData.notes || null,
      is_active: true,
    };

    if (editingPlace) {
      updateMutation.mutate({ id: editingPlace.id, updates: placeData });
    } else {
      createMutation.mutate(placeData);
    }
  };

  if (isLoading) {
    return <div>{t('tracking.geofence.loading')}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t('tracking.geofence.title')}</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                {t('tracking.geofence.addPlace')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingPlace ? t('tracking.geofence.editPlace') : t('tracking.geofence.addGeofencePlace')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">{t('tracking.geofence.name')}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('tracking.geofence.namePlaceholder')}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="place_type">{t('tracking.geofence.placeType')}</Label>
                  <Select
                    value={formData.place_type}
                    onValueChange={(value) => setFormData({ ...formData, place_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getPlaceTypeOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="latitude">{t('tracking.geofence.latitude')}</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="40.7128"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="longitude">{t('tracking.geofence.longitude')}</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="-74.0060"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="radius">{t('tracking.geofence.radius')}</Label>
                  <Input
                    id="radius"
                    type="number"
                    value={formData.radius_meters}
                    onChange={(e) => setFormData({ ...formData, radius_meters: e.target.value })}
                    placeholder="328"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="address">{t('tracking.geofence.address')}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder={t('tracking.geofence.addressPlaceholder')}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleGeocodeAddress}
                      disabled={isGeocoding || !formData.address.trim()}
                      title={t('tracking.geofence.getCoordinates')}
                    >
                      <MapPin className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="color">{t('tracking.geofence.color')}</Label>
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">{t('tracking.geofence.notes')}</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder={t('tracking.geofence.notesPlaceholder')}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingPlace ? t('tracking.geofence.updatePlace') : t('tracking.geofence.createPlace')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetForm();
                      setIsDialogOpen(false);
                    }}
                  >
                    {t('tracking.geofence.cancel')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {places.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('tracking.geofence.noPlaces')}</p>
        ) : (
          <div className="space-y-2">
            {places.map((place) => (
              <div
                key={place.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: place.color }}
                  />
                  <div>
                    <div className="font-medium">{place.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {place.place_type} • {Math.round(metersToFeet(place.radius_meters))} {t('tracking.geofence.ftRadius')}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(place)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(place.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
