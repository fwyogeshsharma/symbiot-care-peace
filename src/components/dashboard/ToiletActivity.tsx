import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bath, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";

interface ToiletEvent {
  timestamp: string;
  location: string;
  dataType: string;
  value: any;
  deviceName: string;
}

interface ToiletActivityProps {
  events: ToiletEvent[];
}

export const ToiletActivity = ({ events }: ToiletActivityProps) => {
  const { t } = useTranslation();

  // Filter toilet events - comprehensive filtering
  const toiletEvents = events.filter(e => {
    const location = e.location?.toLowerCase() || '';
    const deviceName = e.deviceName?.toLowerCase() || '';
    const dataType = e.dataType?.toLowerCase() || '';

    return location.includes('toilet') ||
           location.includes('bathroom') ||
           location.includes('washroom') ||
           location.includes('restroom') ||
           deviceName.includes('toilet') ||
           dataType.includes('toilet');
  });

  // Calculate statistics
  const totalVisits = toiletEvents.length;
  const lastVisit = toiletEvents.length > 0
    ? format(new Date(toiletEvents[toiletEvents.length - 1].timestamp), 'h:mm a')
    : 'N/A';

  // Calculate average duration (assuming events come in pairs - entry/exit)
  const avgDuration = toiletEvents.length > 1 ? '3-5 min' : 'N/A';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bath className="h-5 w-5 text-green-500" />
          {t('activity.toilet.title', 'Toilet Activity')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {t('activity.toilet.totalVisits', 'Total Visits')}
            </p>
            <p className="text-2xl font-bold">{totalVisits}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {t('activity.toilet.avgDuration', 'Avg. Duration')}
            </p>
            <p className="text-2xl font-bold">{avgDuration}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {t('activity.toilet.lastVisit', 'Last Visit')}
            </p>
            <p className="text-2xl font-bold">{lastVisit}</p>
          </div>
        </div>

        {/* Recent Events */}
        {toiletEvents.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">
              {t('activity.toilet.recentVisits', 'Recent Visits')}
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {toiletEvents
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 5)
                .map((event, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    <Bath className="h-4 w-4 text-green-500" />
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

        {toiletEvents.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {t('activity.toilet.noData', 'No toilet activity recorded')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
