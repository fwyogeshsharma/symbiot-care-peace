import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { ArrowLeft, User, Mail, Phone, Save, Shield, LogOut, HelpCircle, Globe, Share2, MapPin, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { restartTour } from '@/components/help/OnboardingTour';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataSharing from '@/components/dashboard/DataSharing';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { Footer } from '@/components/Footer';

const Profile = () => {
  const { user, userRole, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const { t } = useTranslation();

  // Fetch user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    postal_address: profile?.postal_address || '',
  });

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        postal_address: (profile as any).postal_address || '',
      });
    }
  }, [profile]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['accessible-elderly-persons'] });
      queryClient.invalidateQueries({ queryKey: ['elderly-persons'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast({
        title: t('profile.profileUpdated'),
        description: t('profile.profileUpdatedDesc'),
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: t('profile.updateFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const getRoleColor = (role: string | null) => {
    switch (role) {
      case 'admin':
        return 'bg-destructive';
      case 'caregiver':
        return 'bg-primary';
      case 'elderly':
        return '';
      case 'relative':
        return 'bg-accent';
      default:
        return 'bg-muted';
    }
  };

  const getRoleStyle = (role: string | null) => {
    if (role === 'elderly') {
      return { backgroundColor: '#228B22', color: 'white' };
    }
    return {};
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('profile.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4 relative flex items-center justify-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            size="sm"
            className="absolute left-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">{t('profile.backToDashboard')}</span>
            <span className="sm:hidden">{t('profile.back')}</span>
          </Button>
          <h1 className="text-lg sm:text-xl font-bold">{t('profile.title')}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8 max-w-2xl">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className={`grid w-full mb-6 ${userRole === 'caregiver' ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">{t('profile.title')}</span>
              <span className="sm:hidden">{t('profile.title')}</span>
            </TabsTrigger>
            {userRole !== 'caregiver' && (
              <TabsTrigger value="data-sharing" className="flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">{t('nav.dataSharing')}</span>
                <span className="sm:hidden">{t('nav.dataSharing')}</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card className="p-4 sm:p-6 overflow-visible">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <AvatarUpload
                    userId={user?.id || ''}
                    currentAvatarUrl={profile?.avatar_url || null}
                    fullName={profile?.full_name || null}
                    onAvatarChange={(url) => {
                      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
                      queryClient.invalidateQueries({ queryKey: ['accessible-elderly-persons'] });
                      queryClient.invalidateQueries({ queryKey: ['elderly-persons'] });
                      queryClient.invalidateQueries({ queryKey: ['profiles'] });
                    }}
                  />
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl font-bold truncate">{profile?.full_name || 'User'}</h2>
                    {userRole && (
                      <Badge className={`${getRoleColor(userRole)} mt-1`} style={getRoleStyle(userRole)}>
                        {t(`auth.roles.${userRole}`)}
                      </Badge>
                    )}
                  </div>
                </div>
                {!isEditing && (
                  <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" className="shrink-0">
                    <span className="hidden sm:inline">{t('profile.editProfile')}</span>
                    <span className="sm:hidden">{t('profile.edit')}</span>
                  </Button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 overflow-visible">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {t('auth.email')}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('profile.emailCannotChange')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {t('auth.fullName')}
                    </Label>
                    <Input
                      id="full_name"
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      disabled={!isEditing}
                      placeholder={t('profile.enterFullName')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {t('auth.phone')}
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={!isEditing}
                      placeholder={t('profile.enterPhone')}
                    />
                  </div>

                  {profile?.year_of_birth && typeof profile.year_of_birth === 'number' && (
                    <>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {t('profile.yearOfBirth') || 'Year of Birth'}
                        </Label>
                        <Input
                          type="text"
                          value={`${profile.year_of_birth} (Age: ~${new Date().getFullYear() - Number(profile.year_of_birth)} years)`}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                          {t('profile.yearOfBirthCannotChange') || 'Year of birth cannot be changed'}
                        </p>
                      </div>
                      <Separator className="my-4" />
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="postal_address" className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {t('profile.postalAddress') || 'Postal Address'}
                    </Label>
                    <Input
                      id="postal_address"
                      type="text"
                      value={formData.postal_address}
                      onChange={(e) => setFormData({ ...formData, postal_address: e.target.value })}
                      disabled={!isEditing}
                      placeholder={t('profile.enterPostalAddress') || 'Enter your postal address'}
                      className={!isEditing ? 'bg-muted' : ''}
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={updateProfileMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateProfileMutation.isPending ? t('profile.saving') : t('profile.saveChanges')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 sm:flex-none"
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          full_name: profile?.full_name || '',
                          phone: profile?.phone || '',
                          postal_address: (profile as any)?.postal_address || '',
                        });
                      }}
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                )}
              </form>
            </Card>

            {/* Settings Card */}
            <Card className="p-4 sm:p-6">
              <h3 className="text-lg font-semibold mb-4">{t('profile.settings')}</h3>
              <div className="space-y-3">
                {/* Language Settings */}
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <span>{t('profile.language')}</span>
                  </div>
                  <LanguageSwitcher />
                </div>
                <Separator />
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={restartTour}
                >
                  <HelpCircle className="w-4 h-4 mr-2" />
                  {t('profile.restartTour')}
                </Button>
                <Separator />
                {userRole === 'super_admin' && (
                  <>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => navigate('/admin/user-management')}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      {t('profile.userManagement')}
                    </Button>
                    <Separator />
                  </>
                )}
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={signOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('nav.signOut')}
                </Button>
              </div>
            </Card>
          </TabsContent>

          {userRole !== 'caregiver' && (
            <TabsContent value="data-sharing">
              {user && <DataSharing userId={user.id} />}
            </TabsContent>
          )}
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
