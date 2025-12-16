import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProcessedMovementData } from "@/lib/movementUtils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useTranslation } from "react-i18next";

interface MovementHeatmapProps {
  data: ProcessedMovementData;
}

export const MovementHeatmap = ({ data }: MovementHeatmapProps) => {
  const { t } = useTranslation();
  // Prepare data for location activity bar chart
  const locationData = Object.entries(data.locationStats).map(([location, count]) => ({
    location,
    count,
  })).sort((a, b) => b.count - a.count);

  // Prepare data for hourly activity
  const hourlyData = Object.entries(data.hourlyActivity)
    .map(([hour, count]) => ({
      hour,
      count,
    }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  const getBarColor = (index: number) => {
    const colors = [
      'hsl(var(--primary))',
      'hsl(var(--secondary))',
      'hsl(var(--accent))',
      'hsl(210 100% 60%)',
      'hsl(var(--muted))',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>{t('movement.heatmap.activityByLocation')}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 pt-6">
          {locationData.length > 0 ? (
            <div className="h-full flex flex-col">
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%" minHeight={330}>
                  <BarChart
                    data={locationData}
                    margin={{ top: 10, right: 20, left: 20, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="location"
                      tick={false}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      height={50}
                    />
                    <YAxis
                      label={{ value: t('movement.heatmap.events'), angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                      tick={{ fontSize: 11 }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      wrapperStyle={{
                        zIndex: 1000,
                        pointerEvents: 'none',
                      }}
                      cursor={{ fill: 'hsl(var(--muted) / 0.2)' }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {locationData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Custom Legend */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 px-2 pt-4 min-h-[80px]">
                {locationData.map((item, index) => (
                  <div key={item.location} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: getBarColor(index) }}
                    />
                    <span className="text-xs text-muted-foreground truncate" title={item.location}>
                      {item.location} ({item.count})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              {t('movement.heatmap.noLocationData')}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>{t('movement.heatmap.activityByHour')}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 pt-6">
          {hourlyData.length > 0 ? (
            <div className="h-full flex flex-col">
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%" minHeight={280}>
                  <BarChart
                    data={hourlyData}
                    margin={{ top: 10, right: 20, left: 20, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="hour"
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                      height={50}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis
                      label={{ value: t('movement.heatmap.events'), angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                      tick={{ fontSize: 11 }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      wrapperStyle={{
                        zIndex: 1000,
                        pointerEvents: 'none',
                      }}
                      cursor={{ fill: 'hsl(var(--muted) / 0.2)' }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3 px-2 pt-4 min-h-[80px]">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">{t('movement.heatmap.peakHour')}</p>
                  <p className="text-sm font-semibold">
                    {hourlyData.reduce((max, item) => item.count > max.count ? item : max, hourlyData[0]).hour}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">{t('movement.heatmap.totalEvents')}</p>
                  <p className="text-sm font-semibold">
                    {hourlyData.reduce((sum, item) => sum + item.count, 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">{t('movement.heatmap.activeHours')}</p>
                  <p className="text-sm font-semibold">
                    {hourlyData.filter(item => item.count > 0).length}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              {t('movement.heatmap.noHourlyData')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
