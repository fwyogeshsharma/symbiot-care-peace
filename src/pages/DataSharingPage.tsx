import { useAuth } from '@/contexts/AuthContext';
import DataSharing from '@/components/dashboard/DataSharing';
import Header from '@/components/layout/Header';
import { OnboardingTour, useShouldShowTour } from '@/components/help/OnboardingTour';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';
import { Footer } from '@/components/Footer';

const DataSharingPage = () => {
  const { user, userRole } = useAuth();
  const shouldShowTour = useShouldShowTour();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Redirect caregivers to dashboard
  useEffect(() => {
    if (userRole === 'caregiver') {
      navigate('/dashboard', { replace: true });
    }
  }, [userRole, navigate]);

  // Show access denied message if somehow accessed by caregiver
  if (userRole === 'caregiver') {
    return (
      <div className="min-h-screen bg-background">
        <Header showBackButton title={t('dataSharing.title')} subtitle={t('dataSharing.subtitle')} />
        <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-destructive" />
                Access Denied
              </CardTitle>
              <CardDescription>
                Caregivers do not have access to data sharing features.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <OnboardingTour runTour={shouldShowTour} />
      <Header showBackButton title={t('dataSharing.title')} subtitle={t('dataSharing.subtitle')} />

      <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        {user && <DataSharing userId={user.id} />}
      </main>
      <Footer />
    </div>
  );
};

export default DataSharingPage;
