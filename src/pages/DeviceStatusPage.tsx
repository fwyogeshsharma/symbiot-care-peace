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
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { OnboardingTour, useShouldShowTour } from '@/components/help/OnboardingTour';
import { PairingApprovalPanel } from '@/components/pairing/PairingApprovalPanel';
import { useTranslation } from 'react-i18next';
import { Footer } from '@/components/Footer';

const DeviceStatusPage = () => {
  const { t } = useTranslation();
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
      <Header showBackButton title={t('devices.title')} subtitle={t('devices.subtitle')} />

      <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">{t('devices.pageTitle')}</h1>
                <HelpTooltip
                  title={t('devices.guide.title')}
                  content={
                    <div className="space-y-2">
                      <p>{t('devices.guide.description')}</p>
                      <div className="mt-2 space-y-1 text-xs">
                        <div><strong className="text-success">{t('devices.online')}:</strong> {t('devices.guide.onlineDesc')}</div>
                        <div><strong className="text-warning">{t('devices.offline')}:</strong> {t('devices.guide.offlineDesc')}</div>
                        <div><strong className="text-muted-foreground">{t('devices.inactive')}:</strong> {t('devices.guide.inactiveDesc')}</div>
                      </div>
                      <p className="text-xs mt-2">{t('devices.guide.clickTip')}</p>
                    </div>
                  }
                />
              </div>
              <p className="text-muted-foreground">
                {t('devices.pageDescription')}
              </p>
            </div>

            {(userRole === 'admin' || userRole === 'super_admin') && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate('/platform-metrics')}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  {t('devices.platformMetrics')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/admin/device-types')}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {t('devices.deviceTypes')}
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
            <PairingApprovalPanel selectedPersonId={selectedPersonId} />
          </div>

          <div data-tour="device-status-cards">
            <DeviceStatus selectedPersonId={selectedPersonId} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DeviceStatusPage;
