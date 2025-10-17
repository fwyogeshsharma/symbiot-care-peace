import { useAuth } from '@/contexts/AuthContext';
import DataSharing from '@/components/dashboard/DataSharing';
import Header from '@/components/layout/Header';

const DataSharingPage = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Header showBackButton title="Data Sharing" subtitle="Manage data access" />

      <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        {user && <DataSharing userId={user.id} />}
      </main>
    </div>
  );
};

export default DataSharingPage;
