import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Settings, Plus, Trash2, CheckCircle, Camera, Edit } from 'lucide-react';
import { ProcessedMovementData, calculateDwellTimes } from '@/lib/movementUtils';
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { EmptyState } from '@/components/help/EmptyState';

interface IdealProfileManagerProps {
  elderlyPersonId: string;
  currentData?: ProcessedMovementData;
}

export const IdealProfileManager = ({ elderlyPersonId, currentData }: IdealProfileManagerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    profile_name: '',
    notes: '',
    baseline_data: {} as Record<string, { min_minutes: number; max_minutes: number; ideal_minutes: number }>,
  });

  // Fetch ideal profiles
  const { data: profiles } = useQuery({
    queryKey: ['ideal-profiles', elderlyPersonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ideal_profiles')
        .select('*')
        .eq('elderly_person_id', elderlyPersonId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!elderlyPersonId,
  });

  const activeProfile = profiles?.find(p => p.is_active);

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingProfile) {
        const { error } = await supabase
          .from('ideal_profiles')
          .update(data)
          .eq('id', editingProfile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ideal_profiles')
          .insert({
            ...data,
            elderly_person_id: elderlyPersonId,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideal-profiles'] });
      toast.success(editingProfile ? 'Profile updated' : 'Profile created');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error('Failed to save profile');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await supabase
        .from('ideal_profiles')
        .delete()
        .eq('id', profileId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideal-profiles'] });
      toast.success('Profile deleted');
    },
    onError: () => {
      toast.error('Failed to delete profile');
    },
  });

  // Activate mutation
  const activateMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await supabase
        .from('ideal_profiles')
        .update({ is_active: true })
        .eq('id', profileId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideal-profiles'] });
      toast.success('Profile activated');
    },
    onError: () => {
      toast.error('Failed to activate profile');
    },
  });

  const resetForm = () => {
    setFormData({
      profile_name: '',
      notes: '',
      baseline_data: {},
    });
    setEditingProfile(null);
  };

  const handleUseCurrentAsBaseline = () => {
    if (!currentData) {
      toast.error('No current data available');
      return;
    }

    const dwellTimes = calculateDwellTimes(currentData.events);
    const baseline: Record<string, { min_minutes: number; max_minutes: number; ideal_minutes: number }> = {};

    Object.entries(dwellTimes).forEach(([location, minutes]) => {
      const rounded = Math.round(minutes);
      baseline[location] = {
        ideal_minutes: rounded,
        min_minutes: Math.max(0, rounded - Math.round(rounded * 0.2)), // -20%
        max_minutes: rounded + Math.round(rounded * 0.2), // +20%
      };
    });

    setFormData({ ...formData, baseline_data: baseline });
    toast.success('Baseline set from current activity');
  };

  const handleEditProfile = (profile: any) => {
    setEditingProfile(profile);
    setFormData({
      profile_name: profile.profile_name,
      notes: profile.notes || '',
      baseline_data: profile.baseline_data || {},
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.profile_name.trim()) {
      toast.error('Profile name is required');
      return;
    }
    if (Object.keys(formData.baseline_data).length === 0) {
      toast.error('Baseline data is required');
      return;
    }
    saveMutation.mutate(formData);
  };

  const updateLocationBaseline = (location: string, field: 'ideal_minutes' | 'min_minutes' | 'max_minutes', value: string) => {
    const numValue = parseInt(value) || 0;
    setFormData({
      ...formData,
      baseline_data: {
        ...formData.baseline_data,
        [location]: {
          ...formData.baseline_data[location],
          [field]: numValue,
        },
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Ideal Profile Management
            </CardTitle>
            <HelpTooltip 
              title="What are Ideal Profiles?"
              content={
                <div className="space-y-2">
                  <p>Ideal profiles define baseline activity patterns for monitoring deviations.</p>
                  <p className="text-xs mt-2"><strong>How to use:</strong></p>
                  <ol className="text-xs space-y-1 list-decimal list-inside">
                    <li>Create a profile with a descriptive name</li>
                    <li>Use "Use Current as Baseline" to capture current activity</li>
                    <li>Adjust min/max thresholds for each location</li>
                    <li>Activate the profile to start monitoring</li>
                  </ol>
                  <p className="text-xs mt-2">The system will alert you when actual dwell times deviate significantly from the ideal ranges.</p>
                </div>
              }
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                New Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProfile ? 'Edit Ideal Profile' : 'Create Ideal Profile'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="profile_name">Profile Name</Label>
                  <Input
                    id="profile_name"
                    value={formData.profile_name}
                    onChange={(e) => setFormData({ ...formData, profile_name: e.target.value })}
                    placeholder="e.g., Weekday Routine, Weekend Pattern"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Optional notes about this profile..."
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>Baseline Dwell Times (minutes)</Label>
                    {currentData && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleUseCurrentAsBaseline}
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Use Current as Baseline
                      </Button>
                    )}
                  </div>

                  {Object.keys(formData.baseline_data).length === 0 ? (
                    <div className="text-center py-8 border rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">
                        No baseline data. Click "Use Current as Baseline" to start.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 border rounded-lg p-4">
                      {Object.entries(formData.baseline_data).map(([location, values]) => (
                        <div key={location} className="space-y-2">
                          <p className="font-medium text-sm">{location}</p>
                          <div className="grid grid-cols-3 gap-3 ml-4">
                            <div>
                              <Label className="text-xs">Min</Label>
                              <Input
                                type="number"
                                value={values.min_minutes}
                                onChange={(e) => updateLocationBaseline(location, 'min_minutes', e.target.value)}
                                min="0"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Ideal</Label>
                              <Input
                                type="number"
                                value={values.ideal_minutes}
                                onChange={(e) => updateLocationBaseline(location, 'ideal_minutes', e.target.value)}
                                min="0"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Max</Label>
                              <Input
                                type="number"
                                value={values.max_minutes}
                                onChange={(e) => updateLocationBaseline(location, 'max_minutes', e.target.value)}
                                min="0"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving...' : editingProfile ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {profiles && profiles.length > 0 ? (
          <div className="space-y-3">
            {profiles.map((profile) => (
              <div key={profile.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{profile.profile_name}</span>
                    {profile.is_active && (
                      <Badge className="bg-success text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>
                  {profile.notes && (
                    <p className="text-sm text-muted-foreground">{profile.notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {Object.keys(profile.baseline_data || {}).length} locations configured
                  </p>
                </div>
                <div className="flex gap-2">
                  {!profile.is_active && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => activateMutation.mutate(profile.id)}
                      disabled={activateMutation.isPending}
                    >
                      Activate
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditProfile(profile)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteMutation.mutate(profile.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Settings}
            title="No ideal profiles yet"
            description="Create an ideal profile to establish baseline activity patterns and receive alerts when deviations occur. Use the 'New Profile' button above to get started."
          />
        )}
      </CardContent>
    </Card>
  );
};