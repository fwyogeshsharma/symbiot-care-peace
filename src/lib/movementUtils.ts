import { format, startOfDay, endOfDay, subDays } from 'date-fns';

export interface MovementEvent {
  id: string;
  timestamp: Date;
  location: string;
  deviceName: string;
  deviceType: string;
  status: string;
  duration?: number;
}

export interface ProcessedMovementData {
  events: MovementEvent[];
  locationStats: Record<string, number>;
  hourlyActivity: Record<string, number>;
}

export const LOCATION_COLORS: Record<string, string> = {
  'Living Room': 'hsl(var(--primary))',
  'Bedroom': 'hsl(var(--secondary))',
  'Kitchen': 'hsl(var(--accent))',
  'Bathroom': 'hsl(210 100% 60%)',
  'Hallway': 'hsl(var(--muted))',
  'Other': 'hsl(var(--muted-foreground))',
};

export const getLocationColor = (location: string): string => {
  return LOCATION_COLORS[location] || LOCATION_COLORS['Other'];
};

export const processMovementData = (rawData: any[]): ProcessedMovementData => {
  const events: MovementEvent[] = [];
  const locationStats: Record<string, number> = {};
  const hourlyActivity: Record<string, number> = {};

  rawData?.forEach((item) => {
    const location = item.devices?.location || 'Unknown';
    const timestamp = new Date(item.recorded_at);
    const hour = format(timestamp, 'HH:00');
    
    events.push({
      id: item.id,
      timestamp,
      location,
      deviceName: item.devices?.device_name || '',
      deviceType: item.devices?.device_type || '',
      status: item.value?.status || 'active',
      duration: item.value?.duration,
    });

    // Count events per location
    locationStats[location] = (locationStats[location] || 0) + 1;

    // Count events per hour
    hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
  });

  // Sort events by timestamp
  events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return { events, locationStats, hourlyActivity };
};

export const getDefaultDateRange = () => ({
  start: startOfDay(new Date()).toISOString(),
  end: endOfDay(new Date()).toISOString(),
});

export const getDateRangePreset = (preset: 'today' | 'last7days' | 'last30days') => {
  const end = endOfDay(new Date());
  let start: Date;

  switch (preset) {
    case 'today':
      start = startOfDay(new Date());
      break;
    case 'last7days':
      start = startOfDay(subDays(new Date(), 7));
      break;
    case 'last30days':
      start = startOfDay(subDays(new Date(), 30));
      break;
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
};

// Calculate dwell time per location
export const calculateDwellTimes = (events: MovementEvent[]): Record<string, number> => {
  const dwellTimes: Record<string, number> = {};
  
  // Sort events by timestamp
  const sortedEvents = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  for (let i = 0; i < sortedEvents.length - 1; i++) {
    const currentEvent = sortedEvents[i];
    const nextEvent = sortedEvents[i + 1];
    
    // Calculate time spent at this location (until next event)
    const duration = (nextEvent.timestamp.getTime() - currentEvent.timestamp.getTime()) / 60000; // Convert to minutes
    
    const location = currentEvent.location;
    dwellTimes[location] = (dwellTimes[location] || 0) + duration;
  }
  
  // Handle the last event (assume 5 minute dwell if no next event)
  if (sortedEvents.length > 0) {
    const lastEvent = sortedEvents[sortedEvents.length - 1];
    const location = lastEvent.location;
    dwellTimes[location] = (dwellTimes[location] || 0) + 5;
  }
  
  return dwellTimes;
};
