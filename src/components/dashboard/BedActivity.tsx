import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bed, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";

interface BedEvent {
  timestamp: string;
  location: string;
  dataType: string;
  value: any;
  deviceName: string;
}

interface BedActivityProps {
  events: BedEvent[];
}

export const BedActivity = ({ events }: BedActivityProps) => {
  const { t } = useTranslation();

  // Filter bed events - comprehensive filtering
  const bedEvents = events.filter(e => {
    const location = e.location?.toLowerCase() || '';
    const deviceName = e.deviceName?.toLowerCase() || '';
    const dataType = e.dataType?.toLowerCase() || '';

    return location.includes('bed') ||
           location.includes('bedroom') ||
           deviceName.includes('bed') ||
           dataType.includes('bed') ||
           dataType.includes('pressure') ||
           dataType.includes('mat');
  });

  // Calculate statistics
  const totalBedTime = bedEvents.length * 5; // Approximate minutes
  const hours = Math.floor(totalBedTime / 60);
  const minutes = totalBedTime % 60;

  const lastBedActivity = bedEvents.length > 0
    ? format(new Date(bedEvents[bedEvents.length - 1].timestamp), 'h:mm a')
    : 'N/A';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bed className="h-5 w-5 text-blue-500" />
          {t('activity.bed.title', 'Bed Activity')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {t('activity.bed.totalTime', 'Total Time in Bed')}
            </p>
            <p className="text-2xl font-bold">
              {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {t('activity.bed.events', 'Bed Events')}
            </p>
            <p className="text-2xl font-bold">{bedEvents.length}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {t('activity.bed.lastActivity', 'Last Activity')}
            </p>
            <p className="text-2xl font-bold">{lastBedActivity}</p>
          </div>
        </div>

        {/* Recent Events */}
        {bedEvents.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">
              {t('activity.bed.recentEvents', 'Recent Events')}
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {bedEvents
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 5)
                .map((event, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    <Bed className="h-4 w-4 text-blue-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {event.location || event.deviceName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.timestamp), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {event.dataType}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {bedEvents.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {t('activity.bed.noData', 'No bed activity recorded')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
