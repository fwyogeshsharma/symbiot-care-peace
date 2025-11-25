import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wifi, WifiOff, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export function ActiveSensorsCard() {
  const { data: sensorData, isLoading } = useQuery({
    queryKey: ['active-sensors-stats'],
    refetchInterval: 10000, // Auto-refresh every 10 seconds
    queryFn: async () => {
      // Get all devices with their types and status
      const { data: devices, error: devicesError } = await supabase
        .from('devices')
        .select(`
          id,
          device_name,
          status,
          created_at,
          device_types(name, category)
        `);

      if (devicesError) throw devicesError;

      const totalDevices = devices?.length || 0;
      const activeDevices = devices?.filter(d => d.status === 'active').length || 0;
      const inactiveDevices = totalDevices - activeDevices;

      // Group devices by category
      const categoryCount: Record<string, { active: number; inactive: number }> = {};
      devices?.forEach(device => {
        const category = (device.device_types as any)?.category || 'Unknown';
        if (!categoryCount[category]) {
          categoryCount[category] = { active: 0, inactive: 0 };
        }
        if (device.status === 'active') {
          categoryCount[category].active++;
        } else {
          categoryCount[category].inactive++;
        }
      });

      // Convert to chart format
      const chartData = Object.entries(categoryCount)
        .map(([category, counts]) => ({
          category: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          active: counts.active,
          inactive: counts.inactive,
          total: counts.active + counts.inactive,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 6); // Top 6 categories

      // Calculate health percentage
      const healthPercentage = totalDevices > 0 ? (activeDevices / totalDevices) * 100 : 0;

      return {
        totalDevices,
        activeDevices,
        inactiveDevices,
        chartData,
        healthPercentage,
      };
    },
  });

  const getHealthColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Active Sensors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-blue-500" />
            Active Sensors
          </span>
          <div className={`text-sm font-medium ${getHealthColor(sensorData?.healthPercentage || 0)}`}>
            {sensorData?.healthPercentage.toFixed(1)}% Online
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-3xl font-bold text-foreground">
                {sensorData?.totalDevices.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">
                {sensorData?.activeDevices.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Wifi className="h-3 w-3" /> Active
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-red-600">
                {sensorData?.inactiveDevices.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <WifiOff className="h-3 w-3" /> Offline
              </div>
            </div>
          </div>

          {/* Chart by Category */}
          <div className="h-48 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sensorData?.chartData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="active" stackId="a" fill="hsl(var(--success))" name="Active" />
                <Bar dataKey="inactive" stackId="a" fill="hsl(var(--destructive))" name="Inactive" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-muted-foreground">Inactive</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
