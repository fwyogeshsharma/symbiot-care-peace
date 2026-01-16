import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Activity, Eye, EyeOff, Info } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').regex(/^[0-9+\-\s()]*$/, 'Invalid phone number format'),
  role: z.enum(['elderly', 'caregiver', 'relative', 'admin']),
  yearOfBirth: z.number({
    required_error: "Year of birth is required",
    invalid_type_error: "Please enter a valid year",
  }).min(1900, 'Year must be at least 1900').max(new Date().getFullYear(), 'Year cannot be in the future'),
  postalAddress: z.string().min(5, 'Postal address must be at least 5 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<string>('caregiver');
  const [yearOfBirth, setYearOfBirth] = useState<string>('');
  const [postalAddress, setPostalAddress] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [pendingRole, setPendingRole] = useState<string>('');
  const { signUp, signIn, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement>(null);

  const playLogoSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0; // Reset to start
      audioRef.current.play().catch(err => console.log('Audio play failed:', err));
    }
  };

  const handleRoleChange = (newRole: string) => {
    // If user selects elderly or relative, show dialog
    if (newRole === 'elderly' || newRole === 'relative') {
      setPendingRole(newRole);
      setShowRoleDialog(true);
    } else {
      // For caregiver, just set it directly
      setRole(newRole);
    }
  };

  const handleConfirmRoleChange = () => {
    setRole(pendingRole);
    setShowRoleDialog(false);
  };

  const handleCancelRoleChange = () => {
    // Reset to caregiver role
    setRole('caregiver');
    setShowRoleDialog(false);
    setPendingRole('');
  };

  useEffect(() => {
    // Check if this is a password reset flow
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');

    if (accessToken && type === 'recovery') {
      setIsResetPassword(true);
      setIsLogin(false);
      setIsForgotPassword(false);
    }
  }, []);

  // Only redirect to dashboard if user is logged in AND NOT in password reset flow
  if (user && !isResetPassword) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = z.string().email('Invalid email address').safeParse(email);
      if (!validation.success) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Use VITE_APP_URL to ensure correct domain (symbiot.faberwork.com)
      const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/auth`,
      });

      if (error) {
        console.error("Password reset error:", error);
        let errorMessage = error.message;

        // Handle specific error cases
        if (error.message.includes("recovery email") ||
            error.message.includes("sending email") ||
            error.message.includes("unexpected_failure") ||
            error.status === 500) {
          errorMessage = "Email service is not configured. Please contact the administrator.\n\nTechnical details: SMTP settings need to be configured in Supabase Dashboard.\n\nFor immediate assistance, contact support@symbiot.faberwork.com";
        } else if (error.message.includes("not found") || error.message.includes("User not found")) {
          errorMessage = "No account found with this email address. Please check the email or sign up for a new account.";
        }

        toast({
          title: "Password Reset Failed",
          description: errorMessage,
          variant: "destructive",
          duration: 10000, // Show for 10 seconds
        });
      } else {
        toast({
          title: "Success!",
          description: "Password reset link has been sent to your email.",
        });
        setIsForgotPassword(false);
        setIsLogin(true);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate new password
      if (newPassword.length < 6) {
        toast({
          title: "Validation Error",
          description: "Password must be at least 6 characters",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (newPassword !== confirmNewPassword) {
        toast({
          title: "Validation Error",
          description: "Passwords don't match",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Password Updated!",
          description: "Your password has been updated successfully. Redirecting to dashboard...",
          duration: 3000,
        });

        // Clear password fields
        setNewPassword('');
        setConfirmNewPassword('');

        // Clear the hash from URL
        window.history.replaceState(null, '', window.location.pathname);

        // Redirect to dashboard after showing success message
        setTimeout(() => {
          setIsResetPassword(false);
          navigate('/dashboard', { replace: true });
        }, 1500);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const validation = loginSchema.safeParse({ email, password });
        if (!validation.success) {
          toast({
            title: "Validation Error",
            description: validation.error.errors[0].message,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Login Failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        const validation = signupSchema.safeParse({
          email,
          password,
          confirmPassword,
          fullName,
          phone,
          role,
          yearOfBirth: yearOfBirth ? parseInt(yearOfBirth) : undefined,
          postalAddress
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

        // First, check if there's an unconfirmed user with this email - update their data if so
        try {
          const cleanupResponse = await supabase.functions.invoke('cleanup-unconfirmed-user', {
            body: { 
              email,
              newMetadata: {
                full_name: fullName,
                phone: phone,
                role: role,
                year_of_birth: yearOfBirth ? parseInt(yearOfBirth) : undefined,
                postal_address: postalAddress
              },
              newPassword: password
            }
          });

          if (cleanupResponse.error) {
            console.error("Cleanup function error:", cleanupResponse.error);
            // Continue with signup anyway - the function might not be deployed yet
          } else if (cleanupResponse.data?.action === 'blocked') {
            // User is already confirmed, can't re-register
            toast({
              title: "Sign Up Failed",
              description: cleanupResponse.data.message,
              variant: "destructive",
            });
            setLoading(false);
            return;
          } else if (cleanupResponse.data?.action === 'updated') {
            // User data was updated and new verification email sent
            toast({
              title: "Registration Updated!",
              description: "Your data has been updated. A new verification email has been sent. Previous verification emails are no longer valid.",
            });
            // Clear signup form fields
            setPassword('');
            setConfirmPassword('');
            setFullName('');
            setPhone('');
            setRole('caregiver');
            setYearOfBirth('');
            setPostalAddress('');
            setIsLogin(true);
            setLoading(false);
            return;
          }
          // If action is 'proceed', continue with normal signup
        } catch (cleanupError) {
          console.error("Cleanup error:", cleanupError);
          // Continue with signup anyway
        }

        const { error, isDuplicate } = await signUp(email, password, fullName, phone, role, yearOfBirth ? parseInt(yearOfBirth) : undefined, postalAddress);
        
        if (isDuplicate) {
          // This shouldn't happen anymore since we handle unconfirmed users
          // But keep as fallback for confirmed users
          toast({
            title: "Sign Up Failed",
            description: "This email is already registered. Please sign in instead.",
            variant: "destructive",
          });
        } else if (error) {
          toast({
            title: "Sign Up Failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success!",
            description: "Please check your email to verify your account.",
          });
          // Clear signup form fields
          setPassword('');
          setConfirmPassword('');
          setFullName('');
          setPhone('');
          setRole('caregiver');
          setYearOfBirth('');
          setPostalAddress('');
          // Switch to login view after successful sign-up
          setIsLogin(true);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md p-8 shadow-healthcare">
        <button
          onClick={() => navigate('/')}
          onMouseEnter={playLogoSound}
          className="flex items-center justify-center mb-8 w-full hover:opacity-80 transition-opacity cursor-pointer"
          type="button"
        >
          <Activity className="w-8 h-8 text-primary" />
          <div className="ml-3">
            <h1 className="text-2xl font-bold text-foreground">{t('common.symbiot')}</h1>
            <p className="text-xs text-muted-foreground">{t('index.tagline')}</p>
          </div>
        </button>

        <audio ref={audioRef} src="/symbiotVoice.mp3" preload="auto" />

        <h2 className="text-xl font-semibold mb-6 text-center">
          {isResetPassword ? t('auth.newPassword') : isForgotPassword ? t('auth.resetPassword') : isLogin ? t('auth.welcome') : t('auth.welcomeNew')}
        </h2>

        {isResetPassword ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-md">
              <p className="text-sm text-muted-foreground text-center">
                {t('auth.validation.passwordMin')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">{t('auth.newPassword')}</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword">{t('auth.confirmNewPassword')}</Label>
              <div className="relative">
                <Input
                  id="confirmNewPassword"
                  type={showConfirmNewPassword ? "text" : "password"}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('common.loading') : t('auth.resetPassword')}
            </Button>
          </form>
        ) : isForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('common.loading') : t('auth.sendResetLink')}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setIsLogin(true);
                }}
                className="text-sm text-primary hover:underline"
              >
                {t('auth.backToLogin')}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="fullName">{t('auth.fullName')} *</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t('auth.phone')} *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
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
                  placeholder="Enter your full postal address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">{t('auth.selectRole')} *</Label>
                <Select value={role} onValueChange={handleRoleChange} required>
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
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')} *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.password')} *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setIsLogin(false);
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  {t('auth.forgotPassword')}
                </button>
              </div>
            )}
          </div>

          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('auth.confirmPassword')} *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('common.loading') : isLogin ? t('auth.signIn') : t('auth.createAccount')}
          </Button>
          </form>
        )}

        {!isForgotPassword && !isResetPassword && (
          <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-primary hover:underline"
          >
            {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
          </button>
          </div>
        )}
      </Card>

      {/* Role Selection Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              {t('auth.roleDialog.title', { defaultValue: 'Self-Monitoring Option' })}
            </DialogTitle>
            <DialogDescription>
              {t('auth.roleDialog.message', {
                defaultValue: 'By selecting elderly/family member, you can monitor yourself too. If you don\'t want to monitor yourself, select caregiver.'
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleCancelRoleChange}
              className="w-full sm:w-auto"
            >
              {t('auth.roleDialog.selectCaregiver', { defaultValue: 'Select Caregiver' })}
            </Button>
            <Button
              onClick={handleConfirmRoleChange}
              className="w-full sm:w-auto"
            >
              {t('auth.roleDialog.continue', { defaultValue: 'Continue with Selection' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;