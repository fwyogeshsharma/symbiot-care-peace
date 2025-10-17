import DeviceStatus from '@/components/dashboard/DeviceStatus';
import Header from '@/components/layout/Header';

const DeviceStatusPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header showBackButton title="Device Status" subtitle="Monitor your devices" />

      <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        <DeviceStatus />
      </main>
    </div>
  );
};

export default DeviceStatusPage;
