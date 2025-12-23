import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Activity, Menu, ArrowLeft, AlertTriangle, HeartPulse, FileText, Home, Wifi, LifeBuoy, ChevronDown, MapPin } from 'lucide-react';
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

  // Fetch elderly people for "Caring for" dropdown
  const { data: elderlyPeople } = useQuery({
    queryKey: ['elderly-list', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get elderly people based on user role
      if (userRole === 'caregiver' || userRole === 'relative') {
        const { data, error } = await supabase
          .from('data_sharing')
          .select(`
            elderly_id,
            profiles:elderly_id (
              id,
              full_name,
              avatar_url
            )
          `)
          .eq('caregiver_id', user.id)
          .eq('status', 'approved');

        if (error) throw error;
        return data?.map(item => item.profiles).filter(Boolean) || [];
      }

      return [];
    },
    enabled: !!user?.id && (userRole === 'caregiver' || userRole === 'relative'),
  });

  const [selectedElderly, setSelectedElderly] = useState<any>(null);

  // Set first elderly person as selected by default
  useEffect(() => {
    if (elderlyPeople && elderlyPeople.length > 0 && !selectedElderly) {
      setSelectedElderly(elderlyPeople[0]);
    }
  }, [elderlyPeople, selectedElderly]);

  // Fetch active alerts count for badge
  const { data: activeAlertsCount } = useQuery({
    queryKey: ['active-alerts-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
    refetchInterval: 10000, // Refresh every 10 seconds
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

  // Simplified navigation for mobile
  const MobileNavButtons = () => (
    <>
      <Button
        data-tour="nav-overview"
        variant={isActive('/dashboard') ? 'default' : 'ghost'}
        size="default"
        onClick={() => navigate('/dashboard')}
        className="w-full justify-start"
      >
        <Home className="w-4 h-4 mr-2" />
        Overview
      </Button>
      <Button
        data-tour="nav-alerts"
        variant={isActive('/alerts') ? 'default' : 'ghost'}
        size="default"
        onClick={() => navigate('/alerts')}
        className="w-full justify-start relative"
      >
        <AlertTriangle className="w-4 h-4 mr-2" />
        Alerts
        {activeAlertsCount && activeAlertsCount > 0 && (
          <Badge variant="destructive" className="ml-auto">
            {activeAlertsCount}
          </Badge>
        )}
      </Button>
      <Button
        data-tour="nav-health"
        variant={isActive('/health') ? 'default' : 'ghost'}
        size="default"
        onClick={() => navigate('/health')}
        className="w-full justify-start"
      >
        <HeartPulse className="w-4 h-4 mr-2" />
        Health
      </Button>
      <Button
        data-tour="nav-movement"
        variant={isActive('/movement-dashboard') ? 'default' : 'ghost'}
        size="default"
        onClick={() => navigate('/movement-dashboard')}
        className="w-full justify-start"
      >
        <Activity className="w-4 h-4 mr-2" />
        Movement
      </Button>
      <Button
        data-tour="nav-tracking"
        variant={isActive('/tracking') ? 'default' : 'ghost'}
        size="default"
        onClick={() => navigate('/tracking')}
        className="w-full justify-start"
      >
        <MapPin className="w-4 h-4 mr-2" />
        Tracking
      </Button>
      <Button
        data-tour="nav-devices"
        variant={isActive('/device-status') ? 'default' : 'ghost'}
        size="default"
        onClick={() => navigate('/device-status')}
        className="w-full justify-start"
      >
        <Wifi className="w-4 h-4 mr-2" />
        Devices
      </Button>
      <Button
        data-tour="nav-reports"
        variant={isActive('/reports') ? 'default' : 'ghost'}
        size="default"
        onClick={() => navigate('/reports')}
        className="w-full justify-start"
      >
        <FileText className="w-4 h-4 mr-2" />
        Reports
      </Button>
      <Button
        variant="ghost"
        size="default"
        onClick={() => setHelpPanelOpen(true)}
        className="w-full justify-start"
      >
        <LifeBuoy className="w-4 h-4 mr-2" />
        Support
      </Button>
      <div className="border-t my-2" />
      <Button
        data-tour="user-menu"
        variant={isActive('/profile') ? 'default' : 'ghost'}
        size="default"
        onClick={() => navigate('/profile')}
        className="w-full justify-start"
      >
        <Avatar className="w-6 h-6 mr-2">
          <AvatarImage src={userProfile?.avatar_url || undefined} alt={userProfile?.full_name || 'User'} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {getInitials(userProfile?.full_name)}
          </AvatarFallback>
        </Avatar>
        {userProfile?.full_name || t('nav.profile')}
      </Button>
    </>
  );

  return (
    <header className="border-b bg-card shadow-sm sticky top-0 z-10">
      <HelpPanel open={helpPanelOpen} onOpenChange={setHelpPanelOpen} />

      {/* Desktop Navigation - UX Optimized */}
      <div className="hidden lg:block">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-6">
            {/* Left - Logo */}
            <div className="flex items-center gap-3 min-w-fit">
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              <Activity
                className="w-8 h-8 text-primary cursor-pointer shrink-0"
                onMouseEnter={() => {
                  const audio = new Audio('/symbiotVoice.mp3');
                  audio.play().catch(err => console.log('Audio play failed:', err));
                }}
              />
              <div>
                <h1 className="text-lg font-bold text-foreground leading-tight">
                  SymBIoT
                </h1>
                <p className="text-xs text-muted-foreground">
                  Healthcare Monitoring
                </p>
              </div>
            </div>

            {/* Center - Main Navigation (8 Core Tabs) */}
            <nav className="flex items-center gap-0.5 flex-1 justify-center">
              <Button
                data-tour="nav-overview"
                variant={isActive('/dashboard') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="font-medium"
              >
                <Home className="w-4 h-4 mr-1.5" />
                Overview
              </Button>
              <Button
                data-tour="nav-alerts"
                variant={isActive('/alerts') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/alerts')}
                className="font-medium relative"
              >
                <AlertTriangle className="w-4 h-4 mr-1.5" />
                Alerts
                {activeAlertsCount && activeAlertsCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-1.5 px-1.5 py-0 text-xs min-w-[1.25rem] h-5"
                  >
                    {activeAlertsCount}
                  </Badge>
                )}
              </Button>
              <Button
                data-tour="nav-health"
                variant={isActive('/health') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/health')}
                className="font-medium"
              >
                <HeartPulse className="w-4 h-4 mr-1.5" />
                Health
              </Button>
              <Button
                data-tour="nav-movement"
                variant={isActive('/movement-dashboard') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/movement-dashboard')}
                className="font-medium"
              >
                <Activity className="w-4 h-4 mr-1.5" />
                Movement
              </Button>
              <Button
                data-tour="nav-tracking"
                variant={isActive('/tracking') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/tracking')}
                className="font-medium"
              >
                <MapPin className="w-4 h-4 mr-1.5" />
                Tracking
              </Button>
              <Button
                data-tour="nav-devices"
                variant={isActive('/device-status') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/device-status')}
                className="font-medium"
              >
                <Wifi className="w-4 h-4 mr-1.5" />
                Devices
              </Button>
              <Button
                data-tour="nav-reports"
                variant={isActive('/reports') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/reports')}
                className="font-medium"
              >
                <FileText className="w-4 h-4 mr-1.5" />
                Reports
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHelpPanelOpen(true)}
                className="font-medium"
              >
                <LifeBuoy className="w-4 h-4 mr-1.5" />
                Support
              </Button>
            </nav>

            {/* Right - Caring For + Profile */}
            <div className="flex items-center gap-3 min-w-fit">
              {/* Caring For Dropdown (Caregivers/Relatives only) */}
              {(userRole === 'caregiver' || userRole === 'relative') && elderlyPeople && elderlyPeople.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <span className="text-xs text-muted-foreground">Caring for:</span>
                      <span className="font-medium max-w-[120px] truncate">
                        {selectedElderly?.full_name || 'Select'}
                      </span>
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {elderlyPeople.map((elderly: any) => (
                      <DropdownMenuItem
                        key={elderly.id}
                        onClick={() => setSelectedElderly(elderly)}
                        className="cursor-pointer"
                      >
                        <Avatar className="w-6 h-6 mr-2">
                          <AvatarImage src={elderly.avatar_url} />
                          <AvatarFallback>{getInitials(elderly.full_name)}</AvatarFallback>
                        </Avatar>
                        {elderly.full_name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Profile */}
              <Button
                data-tour="user-menu"
                variant={isActive('/profile') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/profile')}
                className="gap-2"
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src={userProfile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInitials(userProfile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden xl:inline font-medium">
                  {userProfile?.full_name || 'Profile'}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Navigation */}
      <div className="lg:hidden">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2">
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <Activity
                className="w-6 h-6 sm:w-8 sm:h-8 text-primary cursor-pointer"
                onMouseEnter={() => {
                  const audio = new Audio('/symbiotVoice.mp3');
                  audio.play().catch(err => console.log('Audio play failed:', err));
                }}
              />
              <h1 className="text-base sm:text-xl font-bold">SymBIoT</h1>
            </div>

            {/* Burger Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                  <Menu className="w-5 h-5" />
                  {activeAlertsCount && activeAlertsCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 px-1 py-0 text-xs min-w-[1rem] h-4"
                    >
                      {activeAlertsCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px]">
                <div className="flex flex-col gap-3 mt-8">
                  {/* Role Badge */}
                  {userRole && (
                    <div className="pb-3 border-b">
                      <Badge className={`${getRoleColor(userRole)}`} style={getRoleStyle(userRole)}>
                        {t(`auth.roles.${userRole}`, { defaultValue: userRole })}
                      </Badge>
                    </div>
                  )}

                  {/* Caring For Selector (Mobile) */}
                  {(userRole === 'caregiver' || userRole === 'relative') && elderlyPeople && elderlyPeople.length > 0 && (
                    <div className="pb-3 border-b">
                      <p className="text-xs text-muted-foreground mb-2">Caring for:</p>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full justify-between">
                            {selectedElderly?.full_name || 'Select person'}
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[240px]">
                          {elderlyPeople.map((elderly: any) => (
                            <DropdownMenuItem
                              key={elderly.id}
                              onClick={() => setSelectedElderly(elderly)}
                            >
                              <Avatar className="w-6 h-6 mr-2">
                                <AvatarImage src={elderly.avatar_url} />
                                <AvatarFallback>{getInitials(elderly.full_name)}</AvatarFallback>
                              </Avatar>
                              {elderly.full_name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <MobileNavButtons />
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
