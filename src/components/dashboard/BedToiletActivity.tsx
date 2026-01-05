import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bed, Bath, Clock, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";

interface BedToiletEvent {
  timestamp: string;
  location: string;
  dataType: string;
  value: any;
  deviceName: string;
}

interface BedToiletActivityProps {
  events: BedToiletEvent[];
}

export const BedToiletActivity = ({ events }: BedToiletActivityProps) => {
  const { t } = useTranslation();

  // Filter bed and toilet events
  const bedEvents = events.filter(e =>
    e.location?.toLowerCase().includes('bed') ||
    e.dataType === 'bed_occupancy' ||
    e.dataType === 'bed_presence' ||
    e.deviceName?.toLowerCase().includes('bed')
  );

  const toiletEvents = events.filter(e =>
    e.location?.toLowerCase().includes('toilet') ||
    e.location?.toLowerCase().includes('bathroom') ||
    e.dataType === 'toilet_usage' ||
    e.dataType === 'toilet_occupancy' ||
    e.deviceName?.toLowerCase().includes('toilet')
  );

  // Calculate statistics
  const totalBedTime = bedEvents.length * 5; // Approximate minutes
  const totalToiletVisits = toiletEvents.length;

  const lastBedActivity = bedEvents.length > 0
    ? format(new Date(bedEvents[bedEvents.length - 1].timestamp), 'h:mm a')
    : 'N/A';

  const lastToiletVisit = toiletEvents.length > 0
    ? format(new Date(toiletEvents[toiletEvents.length - 1].timestamp), 'h:mm a')
    : 'N/A';

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{t('activity.bedToilet.title', 'Bed & Toilet Activity')}</h3>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('activity.bedToilet.bedTime', 'Bed Time')}
            </CardTitle>
            <Bed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBedTime}m</div>
            <p className="text-xs text-muted-foreground">
              {bedEvents.length} {t('activity.bedToilet.bedEvents', 'bed events')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('activity.bedToilet.lastBedActivity', 'Last Bed Activity')}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lastBedActivity}</div>
            <p className="text-xs text-muted-foreground">
              {t('activity.bedToilet.mostRecent', 'Most recent')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('activity.bedToilet.toiletVisits', 'Toilet Visits')}
            </CardTitle>
            <Bath className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalToiletVisits}</div>
            <p className="text-xs text-muted-foreground">
              {t('activity.bedToilet.totalVisits', 'total visits')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('activity.bedToilet.lastToilet', 'Last Toilet Visit')}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lastToiletVisit}</div>
            <p className="text-xs text-muted-foreground">
              {t('activity.bedToilet.mostRecent', 'Most recent')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Events Timeline */}
      {(bedEvents.length > 0 || toiletEvents.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('activity.bedToilet.recentActivity', 'Recent Bed & Toilet Activity')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {[...bedEvents, ...toiletEvents]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 10)
                .map((event, index) => {
                  const isBed = bedEvents.includes(event);
                  return (
                    <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                      {isBed ? (
                        <Bed className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Bath className="h-4 w-4 text-green-500" />
                      )}
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
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
