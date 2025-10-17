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

interface MovementHeatmapProps {
  data: ProcessedMovementData;
}

export const MovementHeatmap = ({ data }: MovementHeatmapProps) => {
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
      <Card>
        <CardHeader>
          <CardTitle>Activity by Location</CardTitle>
        </CardHeader>
        <CardContent>
          {locationData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={locationData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="location" 
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {locationData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No location data available
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity by Hour</CardTitle>
        </CardHeader>
        <CardContent>
          {hourlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="hour" 
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No hourly data available
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
