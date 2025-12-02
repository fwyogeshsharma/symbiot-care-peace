import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { MovementEvent, getLocationColor } from "@/lib/movementUtils";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

interface MovementTimelineProps {
  events: MovementEvent[];
}

export const MovementTimeline = ({ events }: MovementTimelineProps) => {
  const { t } = useTranslation();

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('movement.timeline.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            {t('movement.timeline.noData')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('movement.timeline.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {events.map((event, index) => {
              const isLastInLocation =
                index === events.length - 1 ||
                events[index + 1].location !== event.location;
              
              return (
                <div key={event.id} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-3 h-3 rounded-full ring-4 ring-background"
                      style={{ backgroundColor: getLocationColor(event.location) }}
                    />
                    {!isLastInLocation && (
                      <div
                        className="w-0.5 h-12 mt-1"
                        style={{ backgroundColor: getLocationColor(event.location) }}
                      />
                    )}
                  </div>
                  
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{event.location}</span>
                        <Badge variant="outline" className="text-xs">
                          {event.deviceType}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {format(event.timestamp, 'HH:mm:ss')}
                      </span>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      {event.deviceName} - {event.status}
                      {event.duration && (
                        <span className="ml-2">
                          ({Math.round(event.duration / 60000)} {t('movement.timeline.min')})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
