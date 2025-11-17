import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Activity, LogOut, User, Wifi, Menu, ArrowLeft, MapPin, Settings, Shield, AlertTriangle, HelpCircle, Heart } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { HelpPanel } from '@/components/help/HelpPanel';

interface HeaderProps {
  showBackButton?: boolean;
  title?: string;
  subtitle?: string;
}

const Header = ({ showBackButton = false, title, subtitle }: HeaderProps) => {
  const { userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [helpPanelOpen, setHelpPanelOpen] = useState(false);

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
        return 'bg-secondary';
      case 'relative':
        return 'bg-accent';
      default:
        return 'bg-muted';
    }
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
        <Heart className="w-4 h-4 mr-2" />
        Health
      </Button>
      <Button
        data-tour="nav-activity"
        variant={isActive('/movement-dashboard') ? 'default' : 'ghost'}
        size={isMobile ? 'default' : 'sm'}
        onClick={() => navigate('/movement-dashboard')}
        className={cn(isMobile && 'w-full justify-start')}
      >
        <Activity className="w-4 h-4 mr-2" />
        Activity
      </Button>
      <Button
        data-tour="nav-alerts"
        variant={isActive('/alerts') ? 'default' : 'ghost'}
        size={isMobile ? 'default' : 'sm'}
        onClick={() => navigate('/alerts')}
        className={cn(isMobile && 'w-full justify-start')}
      >
        <AlertTriangle className="w-4 h-4 mr-2" />
        Alerts
      </Button>
      <Button
        data-tour="nav-tracking"
        variant={isActive('/tracking') ? 'default' : 'ghost'}
        size={isMobile ? 'default' : 'sm'}
        onClick={() => navigate('/tracking')}
        className={cn(isMobile && 'w-full justify-start')}
      >
        <MapPin className="w-4 h-4 mr-2" />
        Tracking
      </Button>
      <Button
        data-tour="nav-devices"
        variant={isActive('/device-status') ? 'default' : 'ghost'}
        size={isMobile ? 'default' : 'sm'}
        onClick={() => navigate('/device-status')}
        className={cn(isMobile && 'w-full justify-start')}
      >
        <Wifi className="w-4 h-4 mr-2" />
        Devices
      </Button>
      <Button
        data-tour="user-menu"
        variant={isActive('/profile') ? 'default' : 'ghost'}
        size={isMobile ? 'default' : 'sm'}
        onClick={() => navigate('/profile')}
        className={cn(isMobile && 'w-full justify-start')}
      >
        <User className="w-4 h-4 mr-2" />
        Profile
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
                <span className="hidden sm:inline ml-2">Back</span>
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
                  {title || 'SymBIoT'}
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block truncate">
                  {subtitle || 'Peace of Mind'}
                </p>
              </div>
            </Button>
          </div>

          {/* Right side - Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-3">
            {userRole && (
              <Badge className={`${getRoleColor(userRole)} capitalize`}>
                {userRole}
              </Badge>
            )}
            <NavButtons />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHelpPanelOpen(true)}
              className="gap-2"
              title="Help & Support (F1)"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden xl:inline">Help</span>
            </Button>
          </div>

          {/* Right side - Mobile/Tablet */}
          <div className="flex lg:hidden items-center gap-2">
            {userRole && (
              <Badge className={`${getRoleColor(userRole)} capitalize text-xs hidden sm:flex`}>
                {userRole}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHelpPanelOpen(true)}
              title="Help & Support"
            >
              <HelpCircle className="w-5 h-5" />
            </Button>
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
                      <Badge className={`${getRoleColor(userRole)} capitalize`}>
                        {userRole}
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
