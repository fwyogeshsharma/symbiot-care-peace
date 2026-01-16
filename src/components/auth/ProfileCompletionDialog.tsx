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
  yearOfBirth: z.number({
    required_error: "Year of birth is required",
    invalid_type_error: "Please enter a valid year",
  }).min(1900, 'Year must be at least 1900').max(new Date().getFullYear(), 'Year cannot be in the future'),
  postalAddress: z.string().min(5, 'Postal address must be at least 5 characters'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State/Province is required'),
  zone: z.string().optional(),
  country: z.string().min(2, 'Country is required'),
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
  const [yearOfBirth, setYearOfBirth] = useState<string>('');
  const [postalAddress, setPostalAddress] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [zone, setZone] = useState<string>('');
  const [country, setCountry] = useState<string>('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

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

  const fetchGeolocation = async () => {
    if (!postalAddress || !city || !state || !country) {
      return;
    }

    try {
      const fullAddress = `${postalAddress}, ${city}, ${state}, ${country}`;
      const encodedAddress = encodeURIComponent(fullAddress);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
        {
          headers: {
            'User-Agent': 'Symbiot Care Peace App',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          setLatitude(parseFloat(lat));
          setLongitude(parseFloat(lon));
        }
      }
    } catch (error) {
      console.error('Error fetching geolocation:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Fetch geolocation
      await fetchGeolocation();

      // Validate form
      const validation = profileSchema.safeParse({
        fullName,
        role,
        phone,
        yearOfBirth: yearOfBirth ? parseInt(yearOfBirth) : undefined,
        postalAddress,
        city,
        state,
        zone: zone || undefined,
        country,
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
          year_of_birth: parseInt(yearOfBirth),
          postal_address: postalAddress,
          city,
          state,
          zone,
          country,
          latitude,
          longitude,
          profile_completed: true,
        },
      });

      if (updateError) throw updateError;

      // Insert user role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('user_roles').insert({
          user_id: user.id,
          role: role,
        });
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Please provide additional information to complete your registration
          </DialogDescription>
        </DialogHeader>

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
            <Label htmlFor="yearOfBirth">Year of Birth *</Label>
            <Input
              id="yearOfBirth"
              type="number"
              value={yearOfBirth}
              onChange={(e) => setYearOfBirth(e.target.value)}
              required
              min="1900"
              max={new Date().getFullYear()}
              placeholder={`e.g., ${new Date().getFullYear() - 30}`}
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
              placeholder="Enter your street address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                placeholder="City"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State/Province *</Label>
              <Input
                id="state"
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
                placeholder="State or Province"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zone">Zone (Optional)</Label>
              <Input
                id="zone"
                type="text"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                placeholder="Zone or District"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
                placeholder="Country"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Completing Profile...' : 'Complete Profile'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
