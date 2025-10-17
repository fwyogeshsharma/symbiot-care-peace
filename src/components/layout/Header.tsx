import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Activity, LogOut, User, Wifi, Share2, Menu, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface HeaderProps {
  showBackButton?: boolean;
  title?: string;
  subtitle?: string;
}

const Header = ({ showBackButton = false, title, subtitle }: HeaderProps) => {
  const { userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  const isActive = (path: string) => location.pathname === path;

  const NavButtons = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      <Button
        variant={isActive('/movement-dashboard') ? 'default' : 'ghost'}
        size={isMobile ? 'default' : 'sm'}
        onClick={() => navigate('/movement-dashboard')}
        className={cn(isMobile && 'w-full justify-start')}
      >
        <Activity className="w-4 h-4 mr-2" />
        Activity
      </Button>
      <Button
        variant={isActive('/device-status') ? 'default' : 'ghost'}
        size={isMobile ? 'default' : 'sm'}
        onClick={() => navigate('/device-status')}
        className={cn(isMobile && 'w-full justify-start')}
      >
        <Wifi className="w-4 h-4 mr-2" />
        Device Status
      </Button>
      <Button
        variant={isActive('/data-sharing') ? 'default' : 'ghost'}
        size={isMobile ? 'default' : 'sm'}
        onClick={() => navigate('/data-sharing')}
        className={cn(isMobile && 'w-full justify-start')}
      >
        <Share2 className="w-4 h-4 mr-2" />
        Data Sharing
      </Button>
      <Button
        variant={isActive('/profile') ? 'default' : 'ghost'}
        size={isMobile ? 'default' : 'sm'}
        onClick={() => navigate('/profile')}
        className={cn(isMobile && 'w-full justify-start')}
      >
        <User className="w-4 h-4 mr-2" />
        Profile
      </Button>
      <Button
        variant="outline"
        size={isMobile ? 'default' : 'sm'}
        onClick={signOut}
        className={cn(isMobile && 'w-full justify-start')}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>
    </>
  );

  return (
    <header className="border-b bg-card shadow-sm sticky top-0 z-10">
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
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-foreground truncate">
                {title || 'SymBIoT'}
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block truncate">
                {subtitle || 'Peace of Mind'}
              </p>
            </div>
          </div>

          {/* Right side - Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-3">
            {userRole && (
              <Badge className={`${getRoleColor(userRole)} capitalize`}>
                {userRole}
              </Badge>
            )}
            <NavButtons />
          </div>

          {/* Right side - Mobile/Tablet */}
          <div className="flex lg:hidden items-center gap-2">
            {userRole && (
              <Badge className={`${getRoleColor(userRole)} capitalize text-xs hidden sm:flex`}>
                {userRole}
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
