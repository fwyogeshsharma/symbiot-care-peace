import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Activity, LogOut, User, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import DeviceStatus from '@/components/dashboard/DeviceStatus';

const DeviceStatusPage = () => {
  const { userRole, signOut } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Activity className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Device Status</h1>
              <p className="text-xs text-muted-foreground">Monitor your devices</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {userRole && (
              <Badge className={`${getRoleColor(userRole)} capitalize`}>
                {userRole}
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>
              <User className="w-4 h-4 mr-2" />
              Profile
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <DeviceStatus />
      </main>
    </div>
  );
};

export default DeviceStatusPage;
