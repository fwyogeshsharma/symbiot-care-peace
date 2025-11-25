import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import { PlatformUsersCard } from '@/components/admin/PlatformUsersCard';
import { BillableSubscribersCard } from '@/components/admin/BillableSubscribersCard';
import { UserProfilesCard } from '@/components/admin/UserProfilesCard';
import { ActiveSensorsCard } from '@/components/admin/ActiveSensorsCard';
import { PlatformKPIs } from '@/components/admin/PlatformKPIs';
import { PlatformMetricsCard } from '@/components/admin/PlatformMetricsCard';
import { SensorMetricsCard } from '@/components/admin/SensorMetricsCard';
import { PerformanceMetricsCard } from '@/components/admin/PerformanceMetricsCard';
import { LayoutDashboard } from 'lucide-react';

export default function AdminDashboard() {
  const { userRole } = useAuth();
  const navigate = useNavigate();

  // Redirect if not admin or super admin
  useEffect(() => {
    if (userRole && userRole !== 'super_admin' && userRole !== 'admin') {
      navigate('/dashboard');
    }
  }, [userRole, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="flex items-center gap-3 mb-8">
          <LayoutDashboard className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Platform overview and key metrics</p>
          </div>
        </div>

        {/* Platform KPIs - Value Cards */}
        <PlatformKPIs />

        {/* Main Dashboard Grid - Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <PlatformUsersCard />
          <BillableSubscribersCard />
          <UserProfilesCard />
          <ActiveSensorsCard />
        </div>

        {/* Performance & Session Metrics */}
        <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">Platform Performance</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <PlatformMetricsCard />
          <SensorMetricsCard />
          <PerformanceMetricsCard />
        </div>
      </main>
    </div>
  );
}
