import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface PanicSosEventsProps {
  selectedPersonId?: string | null;
}

const PanicSosEvents = ({ selectedPersonId }: PanicSosEventsProps) => {
  const [showAll, setShowAll] = useState(false);

  const { data: panicEvents, isLoading } = useQuery({
    queryKey: ['panic-sos-events', selectedPersonId],
    queryFn: async () => {
      let query = supabase
        .from('device_data')
        .select(`
          id,
          recorded_at,
          value,
          device_id,
          devices!inner(
            device_name,
            device_type,
            elderly_person_id,
            elderly_persons(full_name)
          )
        `)
        .eq('devices.device_type', 'panic_sos')
        .order('recorded_at', { ascending: false });

      if (selectedPersonId) {
        query = query.eq('elderly_person_id', selectedPersonId);
      }

      if (!showAll) {
        query = query.limit(5);
      } else {
        query = query.limit(20);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const getSeverityColor = (value: any) => {
    const val = value as any;
    if (val?.status === 'critical') return 'border-destructive text-destructive';
    if (val?.status === 'emergency') return 'border-warning text-warning';
    return 'border-primary text-primary';
  };

  const getEventDescription = (value: any) => {
    const val = value as any;
    if (val?.message) return val.message;
    if (val?.type === 'fall_detected') return 'Fall detected';
    if (val?.button_pressed) return 'SOS button pressed';
    return 'Emergency alert';
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            Panic/SOS Events
          </h3>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          Loading events...
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-destructive" />
          Panic/SOS Events
        </h3>
        {panicEvents && panicEvents.length > 0 && (
          <Badge variant="outline" className="border-destructive text-destructive">
            {panicEvents.length} {panicEvents.length === 1 ? 'event' : 'events'}
          </Badge>
        )}
      </div>

      {!panicEvents || panicEvents.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            No panic/SOS events recorded
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Emergency button presses will appear here
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {panicEvents.map((event) => {
              const device = event.devices as any;
              const elderlyPerson = device?.elderly_persons as any;
              const eventValue = event.value as any;
              
              return (
                <div
                  key={event.id}
                  className="border rounded-lg p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-2 flex-1">
                      <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {getEventDescription(eventValue)}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span className="truncate">
                            {elderlyPerson?.full_name || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`${getSeverityColor(eventValue)} text-xs shrink-0`}
                    >
                      {eventValue?.status || 'Alert'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>
                      {formatDistanceToNow(new Date(event.recorded_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>

                  {device?.device_name && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      Device: {device.device_name}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {panicEvents.length >= 5 && (
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? 'Show Less' : 'Show More'}
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default PanicSosEvents;
