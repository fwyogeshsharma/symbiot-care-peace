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
import { useTranslation } from 'react-i18next';

interface IdealProfileManagerProps {
  elderlyPersonId: string;
  currentData?: ProcessedMovementData;
}

export const IdealProfileManager = ({ elderlyPersonId, currentData }: IdealProfileManagerProps) => {
  const { t } = useTranslation();
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
      toast.success(editingProfile ? t('movement.idealProfile.profileUpdated') : t('movement.idealProfile.profileCreated'));
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error(t('movement.idealProfile.failedToSave'));
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
      toast.success(t('movement.idealProfile.profileDeleted'));
    },
    onError: () => {
      toast.error(t('movement.idealProfile.failedToDelete'));
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
      toast.success(t('movement.idealProfile.profileActivated'));
    },
    onError: () => {
      toast.error(t('movement.idealProfile.failedToActivate'));
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
      toast.error(t('movement.idealProfile.noCurrentData'));
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
    toast.success(t('movement.idealProfile.baselineSet'));
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
      toast.error(t('movement.idealProfile.profileNameRequired'));
      return;
    }
    if (Object.keys(formData.baseline_data).length === 0) {
      toast.error(t('movement.idealProfile.baselineRequired'));
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
              {t('movement.idealProfile.title')}
            </CardTitle>
            <HelpTooltip
              title={t('movement.idealProfile.helpTitle')}
              content={
                <div className="space-y-2">
                  <p>{t('movement.idealProfile.helpDescription')}</p>
                  <p className="text-xs mt-2"><strong>{t('movement.idealProfile.helpHowToUse')}</strong></p>
                  <ol className="text-xs space-y-1 list-decimal list-inside">
                    <li>{t('movement.idealProfile.helpStep1')}</li>
                    <li>{t('movement.idealProfile.helpStep2')}</li>
                    <li>{t('movement.idealProfile.helpStep3')}</li>
                    <li>{t('movement.idealProfile.helpStep4')}</li>
                  </ol>
                  <p className="text-xs mt-2">{t('movement.idealProfile.helpAlertInfo')}</p>
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
                {t('movement.idealProfile.newProfile')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProfile ? t('movement.idealProfile.editProfile') : t('movement.idealProfile.createProfile')}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="profile_name">{t('movement.idealProfile.profileName')}</Label>
                  <Input
                    id="profile_name"
                    value={formData.profile_name}
                    onChange={(e) => setFormData({ ...formData, profile_name: e.target.value })}
                    placeholder={t('movement.idealProfile.profileNamePlaceholder')}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">{t('movement.idealProfile.notes')}</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder={t('movement.idealProfile.notesPlaceholder')}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>{t('movement.idealProfile.baselineDwellTimes')}</Label>
                    {currentData && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleUseCurrentAsBaseline}
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        {t('movement.idealProfile.useCurrentBaseline')}
                      </Button>
                    )}
                  </div>

                  {Object.keys(formData.baseline_data).length === 0 ? (
                    <div className="text-center py-8 border rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">
                        {t('movement.idealProfile.noBaselineData')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 border rounded-lg p-4">
                      {Object.entries(formData.baseline_data).map(([location, values]) => (
                        <div key={location} className="space-y-2">
                          <p className="font-medium text-sm">{location}</p>
                          <div className="grid grid-cols-3 gap-3 ml-4">
                            <div>
                              <Label className="text-xs">{t('movement.idealProfile.min')}</Label>
                              <Input
                                type="number"
                                value={values.min_minutes}
                                onChange={(e) => updateLocationBaseline(location, 'min_minutes', e.target.value)}
                                min="0"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">{t('movement.idealProfile.ideal')}</Label>
                              <Input
                                type="number"
                                value={values.ideal_minutes}
                                onChange={(e) => updateLocationBaseline(location, 'ideal_minutes', e.target.value)}
                                min="0"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">{t('movement.idealProfile.max')}</Label>
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
                    {t('movement.idealProfile.cancel')}
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? t('movement.idealProfile.saving') : editingProfile ? t('movement.idealProfile.update') : t('movement.idealProfile.create')}
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
                        {t('movement.idealProfile.active')}
                      </Badge>
                    )}
                  </div>
                  {profile.notes && (
                    <p className="text-sm text-muted-foreground">{profile.notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {Object.keys(profile.baseline_data || {}).length} {t('movement.idealProfile.locationsConfigured')}
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
                      {t('movement.idealProfile.activate')}
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
            title={t('movement.idealProfile.noProfilesYet')}
            description={t('movement.idealProfile.noProfilesDescription')}
          />
        )}
      </CardContent>
    </Card>
  );
};