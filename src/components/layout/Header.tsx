import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Activity, LogOut, User, Wifi, Menu, ArrowLeft, MapPin, Settings, Shield, AlertTriangle, HelpCircle, HeartPulse, FileText } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { HelpPanel } from '@/components/help/HelpPanel';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface HeaderProps {
  showBackButton?: boolean;
  title?: string;
  subtitle?: string;
}

const Header = ({ showBackButton = false, title, subtitle }: HeaderProps) => {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [helpPanelOpen, setHelpPanelOpen] = useState(false);
  const { t } = useTranslation();

  // Fetch user profile data
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Keyboard shortcut to open help panel (F1)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setHelpPanelOpen(true);
      }
      // Ctrl+? or Cmd+? to open help
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setHelpPanelOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getRoleColor = (role: string | null) => {
    switch (role) {
      case 'super_admin':
        return 'bg-destructive';
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

  const isActive = (path: string) => location.pathname === path;

  const NavButtons = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      <Button
        data-tour="nav-health"
        variant={isActive('/dashboard') ? 'default' : 'ghost'}
        size={isMobile ? 'default' : 'sm'}
        onClick={() => navigate('/dashboard')}
        className={cn(isMobile && 'w-full justify-start')}
      >
        <HeartPulse className="w-4 h-4 mr-2" />
        {t('nav.health')}
      </Button>
      <Button
        data-tour="nav-activity"
        variant={isActive('/movement-dashboard') ? 'default' : 'ghost'}
        size={isMobile ? 'default' : 'sm'}
        onClick={() => navigate('/movement-dashboard')}
        className={cn(isMobile && 'w-full justify-start')}
      >
        <Activity className="w-4 h-4 mr-2" />
        {t('nav.movement')}
      </Button>
      <Button
        data-tour="nav-tracking"
        variant={isActive('/tracking') ? 'default' : 'ghost'}
        size={isMobile ? 'default' : 'sm'}
        onClick={() => navigate('/tracking')}
        className={cn(isMobile && 'w-full justify-start')}
      >
        <MapPin className="w-4 h-4 mr-2" />
        {t('nav.tracking')}
      </Button>
      <Button
        data-tour="nav-devices"
        variant={isActive('/device-status') ? 'default' : 'ghost'}
        size={isMobile ? 'default' : 'sm'}
        onClick={() => navigate('/device-status')}
        className={cn(isMobile && 'w-full justify-start')}
      >
        <Wifi className="w-4 h-4 mr-2" />
        {t('nav.devices')}
      </Button>
      <Button
        data-tour="nav-reports"
        variant={isActive('/reports') ? 'default' : 'ghost'}
        size={isMobile ? 'default' : 'sm'}
        onClick={() => navigate('/reports')}
        className={cn(isMobile && 'w-full justify-start')}
      >
        <FileText className="w-4 h-4 mr-2" />
        {t('nav.reports')}
      </Button>
      <Button
        data-tour="nav-alerts"
        variant={isActive('/alerts') ? 'default' : 'ghost'}
        size={isMobile ? 'default' : 'sm'}
        onClick={() => navigate('/alerts')}
        className={cn(isMobile && 'w-full justify-start')}
      >
        <AlertTriangle className="w-4 h-4 mr-2" />
        {t('nav.alerts')}
      </Button>
      <Button
        variant="ghost"
        size={isMobile ? 'default' : 'sm'}
        onClick={() => setHelpPanelOpen(true)}
        className={cn(isMobile ? 'w-full justify-start' : 'gap-2')}
        title="Help & Support (F1)"
      >
        <HelpCircle className="w-4 h-4 mr-2" />
        {isMobile ? (
          <span>{t('nav.help')}</span>
        ) : (
          <span className="hidden xl:inline">{t('nav.help')}</span>
        )}
      </Button>
      <Button
        data-tour="user-menu"
        variant={isActive('/profile') ? 'default' : 'ghost'}
        size={isMobile ? 'default' : 'sm'}
        onClick={() => navigate('/profile')}
        className={cn(isMobile ? 'w-full justify-start' : 'gap-2')}
      >
        <Avatar className={cn("w-6 h-6", isMobile && "mr-2")}>
          <AvatarImage src={userProfile?.avatar_url || undefined} alt={userProfile?.full_name || 'User'} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {getInitials(userProfile?.full_name)}
          </AvatarFallback>
        </Avatar>
        {isMobile ? (
          <span>{userProfile?.full_name || t('nav.profile')}</span>
        ) : (
          <span className="hidden xl:inline">{userProfile?.full_name || t('nav.profile')}</span>
        )}
      </Button>
    </>
  );

  return (
    <header className="border-b bg-card shadow-sm sticky top-0 z-10">
      <HelpPanel open={helpPanelOpen} onOpenChange={setHelpPanelOpen} />
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left side - Logo/Title */}
          <div className="flex items-center gap-2 min-w-0">
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">{t('profile.back')}</span>
              </Button>
            )}
            <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-primary shrink-0" />
            <Button
              data-tour="nav-dashboard"
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="min-w-0 p-0 hover:bg-transparent"
            >
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold text-foreground truncate">
                  {title || t('common.symbiot')}
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block truncate">
                  {subtitle || t('index.tagline')}
                </p>
              </div>
            </Button>
          </div>

          {/* Right side - Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-3">
            {userRole && (
              <Badge className={`${getRoleColor(userRole)}`} style={getRoleStyle(userRole)}>
                {t(`auth.roles.${userRole}`, { defaultValue: userRole })}
              </Badge>
            )}
            <NavButtons />
          </div>

          {/* Right side - Mobile/Tablet */}
          <div className="flex lg:hidden items-center gap-2">
            {userRole && (
              <Badge className={`${getRoleColor(userRole)} text-xs hidden sm:flex`} style={getRoleStyle(userRole)}>
                {t(`auth.roles.${userRole}`, { defaultValue: userRole })}
              </Badge>
            )}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[250px] sm:w-[300px]">
                <div className="flex flex-col gap-4 mt-8">
                  {userRole && (
                    <div className="pb-4 border-b">
                      <Badge className={`${getRoleColor(userRole)}`} style={getRoleStyle(userRole)}>
                        {t(`auth.roles.${userRole}`, { defaultValue: userRole })}
                      </Badge>
                    </div>
                  )}
                  <NavButtons isMobile />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
