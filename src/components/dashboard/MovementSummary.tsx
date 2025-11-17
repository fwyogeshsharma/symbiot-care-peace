import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, MapPin, Clock, TrendingUp, DoorOpen } from "lucide-react";
import { ProcessedMovementData } from "@/lib/movementUtils";

interface MovementSummaryProps {
  data: ProcessedMovementData;
}

export const MovementSummary = ({ data }: MovementSummaryProps) => {
  const totalEvents = data.events.length;
  const mostActiveLocation = Object.entries(data.locationStats).sort(
    ([, a], [, b]) => b - a
  )[0];

  const uniqueLocations = Object.keys(data.locationStats).length;

  const recentActivity = data.events.length > 0
    ? new Date(data.events[data.events.length - 1].timestamp).toLocaleTimeString()
    : 'No activity';

  return (
    <div className="grid gap-4 md:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">Total Movements</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">{totalEvents}</div>
          <p className="text-xs text-muted-foreground">Sensor events detected</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">Most Active Location</CardTitle>
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">
            {mostActiveLocation?.[0] || 'N/A'}
          </div>
          <p className="text-xs text-muted-foreground">
            {mostActiveLocation?.[1] || 0} events
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">Locations Visited</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">{uniqueLocations}</div>
          <p className="text-xs text-muted-foreground">Different areas</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">Last Activity</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-sm font-medium">{recentActivity}</div>
          <p className="text-xs text-muted-foreground">Most recent event</p>
        </CardContent>
      </Card>

      {data.doorStats && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Door Activity</CardTitle>
            <DoorOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{data.doorStats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">
              Open: {data.doorStats.openCount} | Closed: {data.doorStats.closedCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Ratio: {(data.doorStats.openRatio * 100).toFixed(0)}% open
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
