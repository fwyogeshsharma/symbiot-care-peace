import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { ArrowLeft, User, Mail, Phone, Save, Shield, LogOut, HelpCircle, Share2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { restartTour } from '@/components/help/OnboardingTour';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataSharing from '@/components/dashboard/DataSharing';

type UserRole = 'elderly' | 'caregiver' | 'relative';

const EDITABLE_ROLES: { value: UserRole; label: string }[] = [
  { value: 'elderly', label: 'Elderly' },
  { value: 'caregiver', label: 'Caregiver' },
  { value: 'relative', label: 'Relative' },
];

const Profile = () => {
  const { user, userRole, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

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
    role: userRole || '',
  });

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        role: userRole || '',
      });
    }
  }, [profile, userRole]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { full_name: string; phone: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (newRole: string) => {
      // Only allow changing to elderly, caregiver, or relative
      if (!['elderly', 'caregiver', 'relative'].includes(newRole)) {
        throw new Error('Invalid role');
      }

      // First, delete existing non-admin roles
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user?.id)
        .in('role', ['elderly', 'caregiver', 'relative']);

      if (deleteError) throw deleteError;

      // Then insert the new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: user?.id, role: newRole });

      if (insertError) throw insertError;
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const profileData = { full_name: formData.full_name, phone: formData.phone };
    const roleChanged = formData.role !== userRole &&
                        ['elderly', 'caregiver', 'relative'].includes(formData.role);

    try {
      // Update profile
      await updateProfileMutation.mutateAsync(profileData);

      // Update role if changed (only for non-admin roles)
      if (roleChanged) {
        await updateRoleMutation.mutateAsync(formData.role);
        toast({
          title: "Profile updated",
          description: "Your profile and role have been updated. Refreshing...",
        });
        // Reload to refresh auth context with new role
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast({
          title: "Profile updated",
          description: "Your profile has been updated successfully.",
        });
        setIsEditing(false);
      }
    } catch (error) {
      // Error handling is done in individual mutations
    }
  };

  // Check if user can edit their role (not admin/super_admin)
  const canEditRole = userRole && ['elderly', 'caregiver', 'relative'].includes(userRole);

  const getRoleColor = (role: string | null) => {
    switch (role) {
      case 'admin':
        return 'bg-destructive';
      case 'caregiver':
        return 'bg-primary';
      case 'elderly':
        return 'bg-secondary';
      case 'relative':
        return 'bg-accent';
      default:
        return 'bg-muted';
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <h1 className="text-lg sm:text-xl font-bold">Profile</h1>
          <div className="w-16 sm:w-24"></div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8 max-w-4xl">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="data-sharing" className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Data Sharing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl font-bold truncate">{profile?.full_name || 'User'}</h2>
                    {userRole && (
                      <Badge className={`${getRoleColor(userRole)} capitalize mt-1`}>
                        {userRole}
                      </Badge>
                    )}
                  </div>
                </div>
                {!isEditing && (
                  <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" className="shrink-0">
                    <span className="hidden sm:inline">Edit Profile</span>
                    <span className="sm:hidden">Edit</span>
                  </Button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Full Name
                    </Label>
                    <Input
                      id="full_name"
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role" className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Profile Type
                    </Label>
                    {canEditRole ? (
                      <>
                        <Select
                          value={formData.role}
                          onValueChange={(value) => setFormData({ ...formData, role: value })}
                          disabled={!isEditing}
                        >
                          <SelectTrigger id="role">
                            <SelectValue placeholder="Select your profile type" />
                          </SelectTrigger>
                          <SelectContent>
                            {EDITABLE_ROLES.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Your profile type determines your role in the system
                        </p>
                      </>
                    ) : (
                      <>
                        <Input
                          id="role"
                          value={userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : ''}
                          disabled
                          className="bg-muted capitalize"
                        />
                        <p className="text-xs text-muted-foreground">
                          Admin roles cannot be changed from this page
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={updateProfileMutation.isPending || updateRoleMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateProfileMutation.isPending || updateRoleMutation.isPending ? 'Saving...' : 'Save Changes'}
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
                          role: userRole || '',
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </form>
            </Card>

            {/* Additional Actions */}
            <Card className="p-4 sm:p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={restartTour}
                >
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Restart Onboarding Tour
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
                      User Management
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
                  Sign Out
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="data-sharing">
            {user && <DataSharing userId={user.id} />}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Profile;
