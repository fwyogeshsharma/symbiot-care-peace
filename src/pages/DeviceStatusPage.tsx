import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DeviceStatus from '@/components/dashboard/DeviceStatus';
import Header from '@/components/layout/Header';
import ElderlyList from '@/components/dashboard/ElderlyList';
import { Button } from '@/components/ui/button';
import { Settings, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InfoButton } from '@/components/help/InfoButton';
import { OnboardingTour, useShouldShowTour } from '@/components/help/OnboardingTour';
import { PairingApprovalPanel } from '@/components/pairing/PairingApprovalPanel';

const DeviceStatusPage = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const shouldShowTour = useShouldShowTour();

  const { data: elderlyPersons = [] } = useQuery({
    queryKey: ['elderly-persons', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .rpc('get_accessible_elderly_persons', { _user_id: user.id });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  useEffect(() => {
    if (elderlyPersons.length > 0 && !selectedPersonId) {
      setSelectedPersonId(elderlyPersons[0].id);
    }
  }, [elderlyPersons, selectedPersonId]);

  return (
    <div className="min-h-screen bg-background">
      <OnboardingTour runTour={shouldShowTour} />
      <Header showBackButton title="Devices" subtitle="Monitor your devices" />

      <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold">Devices</h1>
                <InfoButton
                  title="Device Status Guide"
                  content={
                    <div className="space-y-2">
                      <p>Monitor all connected devices and their real-time status.</p>
                      <div className="mt-2 space-y-1 text-xs">
                        <div><strong className="text-success">Online:</strong> Device is connected and transmitting</div>
                        <div><strong className="text-warning">Offline:</strong> No recent data received</div>
                        <div><strong className="text-muted-foreground">Inactive:</strong> Device not configured</div>
                      </div>
                      <p className="text-xs mt-2">Click on any device card to view detailed information and history.</p>
                    </div>
                  }
                  side="bottom"
                />
              </div>
              <p className="text-muted-foreground text-sm sm:text-base">
                Monitor and manage all connected devices
              </p>
            </div>

            {(userRole === 'admin' || userRole === 'super_admin') && (
              <div className="flex flex-col gap-2 sm:flex-row w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => navigate('/platform-metrics')}
                  className="w-full sm:w-auto"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  <span className="sm:inline">Platform Metrics</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/admin/device-types')}
                  className="w-full sm:w-auto"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  <span className="sm:inline">Device Types</span>
                </Button>
              </div>
            )}
          </div>
          
          <div data-tour="device-person-list">
            <ElderlyList 
              elderlyPersons={elderlyPersons}
              selectedPersonId={selectedPersonId}
              onSelectPerson={setSelectedPersonId}
            />
          </div>

          <div className="mb-6">
            <PairingApprovalPanel />
          </div>
          
          <div data-tour="device-status-cards">
            <DeviceStatus selectedPersonId={selectedPersonId} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DeviceStatusPage;
