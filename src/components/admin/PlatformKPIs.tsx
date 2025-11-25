import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users,
  UserCheck,
  Wifi,
  AlertTriangle,
  Activity,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Clock,
  Shield,
} from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  iconBgColor?: string;
}

function KPICard({ title, value, subtitle, icon, trend, trendLabel, iconBgColor = 'bg-primary/10' }: KPICardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend !== undefined && (
              <div className="flex items-center gap-1 text-xs">
                {trend > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : trend < 0 ? (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                ) : null}
                <span className={trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-muted-foreground'}>
                  {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                </span>
                {trendLabel && <span className="text-muted-foreground">{trendLabel}</span>}
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg ${iconBgColor}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PlatformKPIs() {
  const { data: kpiData, isLoading } = useQuery({
    queryKey: ['platform-kpis'],
    refetchInterval: 10000, // Auto-refresh every 10 seconds
    queryFn: async () => {
      // Parallel fetch all KPI data
      const [
        profilesResult,
        elderlyResult,
        devicesResult,
        alertsResult,
        rolesResult,
      ] = await Promise.all([
        supabase.from('profiles').select('id, created_at, blocked_at'),
        supabase.from('elderly_persons').select('id, created_at'),
        supabase.from('devices').select('id, status, created_at'),
        supabase.from('alerts').select('id, status, created_at'),
        supabase.from('user_roles').select('user_id, role'),
      ]);

      const profiles = profilesResult.data || [];
      const elderly = elderlyResult.data || [];
      const devices = devicesResult.data || [];
      const alerts = alertsResult.data || [];
      const roles = rolesResult.data || [];

      // Calculate metrics
      const totalUsers = profiles.length;
      const activeUsers = profiles.filter(p => !p.blocked_at).length;
      const totalSubscribers = elderly.length;
      const totalDevices = devices.length;
      const activeDevices = devices.filter(d => d.status === 'active').length;
      const activeAlerts = alerts.filter(a => a.status === 'active').length;

      // Device health percentage
      const deviceHealth = totalDevices > 0 ? (activeDevices / totalDevices) * 100 : 0;

      // Calculate caregivers count
      const caregiverCount = roles.filter(r => r.role === 'caregiver').length;

      // Calculate 30-day trends
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const recentUsers = profiles.filter(p => new Date(p.created_at) >= thirtyDaysAgo).length;
      const previousUsers = profiles.filter(p => {
        const date = new Date(p.created_at);
        return date >= sixtyDaysAgo && date < thirtyDaysAgo;
      }).length;
      const userTrend = previousUsers > 0 ? ((recentUsers - previousUsers) / previousUsers) * 100 : recentUsers > 0 ? 100 : 0;

      const recentSubscribers = elderly.filter(p => new Date(p.created_at) >= thirtyDaysAgo).length;
      const previousSubscribers = elderly.filter(p => {
        const date = new Date(p.created_at);
        return date >= sixtyDaysAgo && date < thirtyDaysAgo;
      }).length;
      const subscriberTrend = previousSubscribers > 0 ? ((recentSubscribers - previousSubscribers) / previousSubscribers) * 100 : recentSubscribers > 0 ? 100 : 0;

      const recentDevices = devices.filter(d => new Date(d.created_at) >= thirtyDaysAgo).length;
      const previousDevices = devices.filter(d => {
        const date = new Date(d.created_at);
        return date >= sixtyDaysAgo && date < thirtyDaysAgo;
      }).length;
      const deviceTrend = previousDevices > 0 ? ((recentDevices - previousDevices) / previousDevices) * 100 : recentDevices > 0 ? 100 : 0;

      // Estimated MRR (assuming $50/subscriber)
      const estimatedMRR = totalSubscribers * 50;

      return {
        totalUsers,
        activeUsers,
        totalSubscribers,
        totalDevices,
        activeDevices,
        activeAlerts,
        deviceHealth,
        caregiverCount,
        userTrend,
        subscriberTrend,
        deviceTrend,
        estimatedMRR,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-24" />
                <div className="h-8 bg-muted rounded w-16" />
                <div className="h-3 bg-muted rounded w-32" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title="Total Users"
        value={kpiData?.totalUsers.toLocaleString() || '0'}
        subtitle={`${kpiData?.activeUsers} active`}
        icon={<Users className="h-6 w-6 text-primary" />}
        trend={kpiData?.userTrend}
        trendLabel="vs last 30d"
        iconBgColor="bg-primary/10"
      />

      <KPICard
        title="Billable Subscribers"
        value={kpiData?.totalSubscribers.toLocaleString() || '0'}
        subtitle="Monitored persons"
        icon={<CreditCard className="h-6 w-6 text-green-600" />}
        trend={kpiData?.subscriberTrend}
        trendLabel="vs last 30d"
        iconBgColor="bg-green-100 dark:bg-green-900/20"
      />

      <KPICard
        title="Estimated MRR"
        value={`$${kpiData?.estimatedMRR.toLocaleString() || '0'}`}
        subtitle="Monthly recurring revenue"
        icon={<TrendingUp className="h-6 w-6 text-emerald-600" />}
        iconBgColor="bg-emerald-100 dark:bg-emerald-900/20"
      />

      <KPICard
        title="Active Caregivers"
        value={kpiData?.caregiverCount.toLocaleString() || '0'}
        subtitle="Registered caregivers"
        icon={<UserCheck className="h-6 w-6 text-blue-600" />}
        iconBgColor="bg-blue-100 dark:bg-blue-900/20"
      />

      <KPICard
        title="Total Devices"
        value={kpiData?.totalDevices.toLocaleString() || '0'}
        subtitle={`${kpiData?.activeDevices} online`}
        icon={<Wifi className="h-6 w-6 text-cyan-600" />}
        trend={kpiData?.deviceTrend}
        trendLabel="vs last 30d"
        iconBgColor="bg-cyan-100 dark:bg-cyan-900/20"
      />

      <KPICard
        title="Device Health"
        value={`${kpiData?.deviceHealth.toFixed(1) || '0'}%`}
        subtitle="Devices online"
        icon={<Activity className="h-6 w-6 text-purple-600" />}
        iconBgColor="bg-purple-100 dark:bg-purple-900/20"
      />

      <KPICard
        title="Active Alerts"
        value={kpiData?.activeAlerts.toLocaleString() || '0'}
        subtitle="Requiring attention"
        icon={<AlertTriangle className="h-6 w-6 text-orange-600" />}
        iconBgColor="bg-orange-100 dark:bg-orange-900/20"
      />

      <KPICard
        title="Platform Status"
        value="Healthy"
        subtitle="All systems operational"
        icon={<Shield className="h-6 w-6 text-green-600" />}
        iconBgColor="bg-green-100 dark:bg-green-900/20"
      />
    </div>
  );
}
