import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(var(--accent))',
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  caregiver: 'Caregiver',
  elderly: 'Elderly',
  relative: 'Relative',
};

export function UserProfilesCard() {
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['user-profiles-by-role'],
    refetchInterval: 10000, // Auto-refresh every 10 seconds
    queryFn: async () => {
      // Get all user roles
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (error) throw error;

      // Count users by role
      const roleCounts: Record<string, number> = {};
      const uniqueUsers = new Set<string>();

      roles?.forEach(r => {
        uniqueUsers.add(r.user_id);
        roleCounts[r.role] = (roleCounts[r.role] || 0) + 1;
      });

      // Convert to chart format
      const chartData = Object.entries(roleCounts).map(([role, count]) => ({
        name: ROLE_LABELS[role] || role,
        value: count,
        role,
      }));

      // Sort by count descending
      chartData.sort((a, b) => b.value - a.value);

      return {
        totalProfiles: uniqueUsers.size,
        chartData,
        roleCounts,
      };
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            User Profiles by Role
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-md p-2 shadow-md">
          <p className="text-sm font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.value} users ({((data.value / (profileData?.totalProfiles || 1)) * 100).toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Don't show label for small slices

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCircle className="h-5 w-5 text-orange-500" />
          User Profiles by Role
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main Metric */}
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-foreground">
              {profileData?.totalProfiles.toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground">total profiles</span>
          </div>

          {/* Chart */}
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={profileData?.chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {profileData?.chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Role breakdown */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {profileData?.chartData.slice(0, 4).map((item, index) => (
              <div key={item.role} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-muted-foreground">{item.name}:</span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
