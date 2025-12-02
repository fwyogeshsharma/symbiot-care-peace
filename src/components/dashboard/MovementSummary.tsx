import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, MapPin, Clock, TrendingUp } from "lucide-react";
import { ProcessedMovementData } from "@/lib/movementUtils";
import { useTranslation } from "react-i18next";

interface MovementSummaryProps {
  data: ProcessedMovementData;
}

export const MovementSummary = ({ data }: MovementSummaryProps) => {
  const { t } = useTranslation();
  const totalEvents = data.events.length;
  const mostActiveLocation = Object.entries(data.locationStats).sort(
    ([, a], [, b]) => b - a
  )[0];

  const uniqueLocations = Object.keys(data.locationStats).length;

  const recentActivity = data.events.length > 0
    ? new Date(data.events[data.events.length - 1].timestamp).toLocaleTimeString()
    : t('movement.summary.noActivity');

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">{t('movement.summary.totalMovements')}</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">{totalEvents}</div>
          <p className="text-xs text-muted-foreground">{t('movement.summary.sensorEventsDetected')}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">{t('movement.summary.mostActiveLocation')}</CardTitle>
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">
            {mostActiveLocation?.[0] || 'N/A'}
          </div>
          <p className="text-xs text-muted-foreground">
            {mostActiveLocation?.[1] || 0} {t('movement.summary.events')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">{t('movement.summary.locationsVisited')}</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">{uniqueLocations}</div>
          <p className="text-xs text-muted-foreground">{t('movement.summary.differentAreas')}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">{t('movement.summary.lastActivity')}</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-sm font-medium">{recentActivity}</div>
          <p className="text-xs text-muted-foreground">{t('movement.summary.mostRecentEvent')}</p>
        </CardContent>
      </Card>
    </div>
  );
};
