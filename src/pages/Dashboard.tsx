import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LogOut, Heart, Activity, Bell, Users, AlertTriangle, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import VitalMetrics from '@/components/dashboard/VitalMetrics';
import AlertsList from '@/components/dashboard/AlertsList';
import ElderlyList from '@/components/dashboard/ElderlyList';
import DeviceStatus from '@/components/dashboard/DeviceStatus';
import DataSharing from '@/components/dashboard/DataSharing';

const Dashboard = () => {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const [realtimeData, setRealtimeData] = useState<any[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // Fetch elderly persons based on role
  const { data: elderlyPersons, isLoading: elderlyLoading } = useQuery({
    queryKey: ['elderly-persons', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elderly_persons')
        .select('*');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch active alerts
  const { data: alerts, refetch: refetchAlerts } = useQuery({
    queryKey: ['alerts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*, elderly_persons(full_name)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'device_data'
        },
        (payload) => {
          console.log('New device data:', payload);
          setRealtimeData(prev => [payload.new, ...prev.slice(0, 9)]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts'
        },
        (payload) => {
          console.log('New alert:', payload);
          refetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetchAlerts]);

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

  if (elderlyLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">SymBIoT</h1>
              <p className="text-xs text-muted-foreground">Peace of Mind</p>
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
        {/* Stats Overview */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monitored Persons</p>
                <p className="text-3xl font-bold">{elderlyPersons?.length || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
                <p className="text-3xl font-bold">{alerts?.length || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-warning" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Heart Rate</p>
                <p className="text-3xl font-bold">72</p>
                <p className="text-xs text-muted-foreground">bpm</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <Heart className="w-6 h-6 text-success" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Activity Level</p>
                <p className="text-3xl font-bold">Good</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Activity className="w-6 h-6 text-secondary" />
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Elderly Persons & Devices */}
          <div className="lg:col-span-2 space-y-6">
            <ElderlyList 
              elderlyPersons={elderlyPersons || []} 
              selectedPersonId={selectedPersonId}
              onSelectPerson={setSelectedPersonId}
            />
            <VitalMetrics selectedPersonId={selectedPersonId} />
          </div>

          {/* Right Column - Alerts & Device Status */}
          <div className="space-y-6">
            <AlertsList alerts={alerts || []} selectedPersonId={selectedPersonId} />
            <DeviceStatus />
            {user && <DataSharing userId={user.id} />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;