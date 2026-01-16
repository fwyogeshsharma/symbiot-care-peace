import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

const profileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['elderly', 'caregiver', 'relative']),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').regex(/^[0-9+\-\s()]*$/, 'Invalid phone number format'),
  postalAddress: z.string().min(5, 'Postal address must be at least 5 characters'),
});

interface ProfileCompletionDialogProps {
  open: boolean;
  onComplete: () => void;
}

export const ProfileCompletionDialog = ({ open, onComplete }: ProfileCompletionDialogProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [role, setRole] = useState<string>('caregiver');
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [postalAddress, setPostalAddress] = useState<string>('');
  const [showSkipWarning, setShowSkipWarning] = useState(false);

  // Pre-fill user data from OAuth if available
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata) {
        // Pre-fill name from OAuth (Google provides full_name or name)
        if (user.user_metadata.full_name) {
          setFullName(user.user_metadata.full_name);
        } else if (user.user_metadata.name) {
          setFullName(user.user_metadata.name);
        }

        // Pre-fill phone if it exists (from OAuth providers that provide it)
        if (user.user_metadata.phone) {
          setPhone(user.user_metadata.phone);
        }
      }

      // If no name from metadata, use email as fallback
      if (!fullName && user?.email) {
        setFullName(user.email.split('@')[0]);
      }
    };

    if (open) {
      loadUserData();
    }
  }, [open]);

  const handleAttemptClose = () => {
    setShowSkipWarning(true);
    toast({
      title: "Profile Completion Required",
      description: "You must complete your profile to access the dashboard. This information is necessary to use the platform.",
      variant: "destructive",
      duration: 5000,
    });
  };

  // Listen for escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        handleAttemptClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form
      const validation = profileSchema.safeParse({
        fullName,
        role,
        phone,
        postalAddress,
      });

      if (!validation.success) {
        toast({
          title: "Validation Error",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          role,
          phone,
          postal_address: postalAddress,
          profile_completed: true,
        },
      });

      if (updateError) throw updateError;

      // Get user data
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Insert user role
        await supabase.from('user_roles').insert({
          user_id: user.id,
          role: role,
        });

        // Update or insert profile data in profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            full_name: fullName,
            phone: phone,
            postal_address: postalAddress,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'id'
          });

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }

      toast({
        title: "Profile Completed!",
        description: "Your profile has been set up successfully.",
      });

      onComplete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md"
        onInteractOutside={(e) => {
          e.preventDefault();
          handleAttemptClose();
        }}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleAttemptClose();
        }}
      >
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Please provide additional information to complete your registration
          </DialogDescription>
        </DialogHeader>

        {/* Warning Banner */}
        {showSkipWarning && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <div className="text-destructive mt-0.5">⚠️</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">
                  Profile Completion Required
                </p>
                <p className="text-xs text-destructive/80 mt-1">
                  You cannot skip this step. This information is required to use the Symbiot Care Peace platform and ensure proper functionality.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">{t('auth.fullName')} *</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Enter your full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">{t('auth.selectRole')} *</Label>
            <Select value={role} onValueChange={setRole} required>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="caregiver">{t('auth.roles.caregiver')}</SelectItem>
                <SelectItem value="elderly">{t('auth.roles.elderly')}</SelectItem>
                <SelectItem value="relative">{t('auth.roles.relative')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Self-monitoring info based on role */}
            {role === 'caregiver' ? (
              <p className="text-xs text-muted-foreground mt-2">
                ℹ️ As a caregiver, you will be able to monitor others but cannot monitor yourself.
              </p>
            ) : (
              <p className="text-xs text-primary mt-2">
                ✓ As {role === 'elderly' ? 'an elderly person' : 'a family member'}, you can monitor yourself and others.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t('auth.phone')} *</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="Enter your phone number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="postalAddress">Postal Address *</Label>
            <Input
              id="postalAddress"
              type="text"
              value={postalAddress}
              onChange={(e) => setPostalAddress(e.target.value)}
              required
              placeholder="Enter your complete postal address"
            />
          </div>

          <div className="bg-muted/50 border border-muted rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> This form cannot be skipped. All fields are required to access the dashboard.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Completing Profile...' : 'Complete Profile'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
