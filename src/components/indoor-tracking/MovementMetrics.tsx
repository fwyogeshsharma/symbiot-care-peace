import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProcessedPositionData } from '@/lib/positionUtils';
import { MapPin, Activity, Clock, TrendingUp } from 'lucide-react';

interface MovementMetricsProps {
  data: ProcessedPositionData;
}

export const MovementMetrics = ({ data }: MovementMetricsProps) => {
  const totalVisits = Object.values(data.zoneStats).reduce((sum, stat) => sum + stat.visits, 0);
  const totalDuration = Object.values(data.zoneStats).reduce((sum, stat) => sum + stat.duration, 0);
  const mostVisitedZone = Object.entries(data.zoneStats).sort((a, b) => b[1].visits - a[1].visits)[0];

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isNaN(data.totalDistance) || !isFinite(data.totalDistance)
              ? '0.0'
              : data.totalDistance.toFixed(1)}m
          </div>
          <p className="text-xs text-muted-foreground">
            {isNaN(data.totalDistance) || !isFinite(data.totalDistance)
              ? '0.00'
              : (data.totalDistance / 1000).toFixed(2)}km traveled
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Speed</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isNaN(data.averageSpeed) || !isFinite(data.averageSpeed)
              ? '0.00'
              : data.averageSpeed.toFixed(2)} m/s
          </div>
          <p className="text-xs text-muted-foreground">
            {isNaN(data.averageSpeed) || !isFinite(data.averageSpeed)
              ? '0.0'
              : (data.averageSpeed * 3.6).toFixed(1)} km/h
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Zone Visits</CardTitle>
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalVisits}</div>
          <p className="text-xs text-muted-foreground">
            {mostVisitedZone ? `Most: ${mostVisitedZone[0]}` : 'No data'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatDuration(totalDuration)}
          </div>
          <p className="text-xs text-muted-foreground">
            Across {Object.keys(data.zoneStats).length} zones
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle>Zone Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(data.zoneStats)
              .sort((a, b) => b[1].duration - a[1].duration)
              .map(([zone, stats]) => (
                <div key={zone} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{zone}</span>
                    <span className="text-muted-foreground">
                      {stats.visits} visits • {formatDuration(stats.duration)}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: totalDuration > 0 ? `${(stats.duration / totalDuration) * 100}%` : '0%'
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
