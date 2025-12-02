import { useAuth } from '@/contexts/AuthContext';
import DataSharing from '@/components/dashboard/DataSharing';
import Header from '@/components/layout/Header';
import { OnboardingTour, useShouldShowTour } from '@/components/help/OnboardingTour';
import { useTranslation } from 'react-i18next';

const DataSharingPage = () => {
  const { user } = useAuth();
  const shouldShowTour = useShouldShowTour();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <OnboardingTour runTour={shouldShowTour} />
      <Header showBackButton title={t('dataSharing.title')} subtitle={t('dataSharing.subtitle')} />

      <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        {user && <DataSharing userId={user.id} />}
      </main>
    </div>
  );
};

export default DataSharingPage;
