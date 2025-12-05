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
  doorStats?: {
    totalEvents: number;
    openCount: number;
    closedCount: number;
    openRatio: number;
  };
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
  let doorOpenCount = 0;
  let doorClosedCount = 0;

  rawData?.forEach((item) => {
    const location = item.devices?.location || 'Unknown';
    const timestamp = new Date(item.recorded_at);
    const hour = format(timestamp, 'HH:00');

    // Handle different data types specially
    let status = 'active';
    let duration;

    if (item.data_type === 'motion_detected') {
      // motion_detected values can be boolean or numeric
      const value = item.value?.value !== undefined ? item.value.value : item.value;
      status = value ? 'Motion Detected' : 'No Motion';
    } else if (item.data_type === 'door_status') {
      // door_status has values "open" or "closed"
      const value = item.value?.value !== undefined ? item.value.value : item.value;
      if (typeof value === 'string') {
        status = value === 'open' ? 'Door Opened' : 'Door Closed';
        if (value === 'open') doorOpenCount++;
        else doorClosedCount++;
      } else {
        status = value ? 'Door Opened' : 'Door Closed';
        if (value) doorOpenCount++;
        else doorClosedCount++;
      }
      duration = item.value?.duration;
    } else {
      // For other activity types, use status field if available
      status = item.value?.status || 'active';
      duration = item.value?.duration;
    }

    events.push({
      id: item.id,
      timestamp,
      location,
      deviceName: item.devices?.device_name || '',
      deviceType: item.devices?.device_type || '',
      status,
      duration,
    });

    // Count events per location
    locationStats[location] = (locationStats[location] || 0) + 1;

    // Count events per hour
    hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
  });

  // Sort events by timestamp
  events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Calculate door statistics
  const totalDoorEvents = doorOpenCount + doorClosedCount;
  const doorStats = totalDoorEvents > 0 ? {
    totalEvents: totalDoorEvents,
    openCount: doorOpenCount,
    closedCount: doorClosedCount,
    openRatio: doorOpenCount / totalDoorEvents,
  } : undefined;

  return { events, locationStats, hourlyActivity, doorStats };
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
