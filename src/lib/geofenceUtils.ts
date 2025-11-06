/**
 * Geofence utilities for managing and analyzing geofence data
 */

import { calculateDistance } from './gpsUtils';

export interface GeofencePlace {
  id: string;
  name: string;
  place_type: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  address?: string;
  icon?: string;
  color: string;
  notes?: string;
  is_active: boolean;
}

export interface GeofenceEvent {
  id: string;
  elderly_person_id: string;
  place_id: string;
  event_type: 'entry' | 'exit';
  timestamp: string;
  latitude: number;
  longitude: number;
  duration_minutes?: number;
}

/**
 * Get color for place type
 * @param placeType Type of place
 * @returns HSL color string
 */
export function getPlaceTypeColor(placeType: string): string {
  const colors: Record<string, string> = {
    home: 'hsl(var(--chart-1))',
    work: 'hsl(var(--chart-2))',
    hospital: 'hsl(var(--destructive))',
    park: 'hsl(var(--chart-3))',
    relative: 'hsl(var(--chart-4))',
    other: 'hsl(var(--muted))',
  };
  return colors[placeType] || colors.other;
}

/**
 * Get icon for place type
 * @param placeType Type of place
 * @returns Icon name
 */
export function getPlaceTypeIcon(placeType: string): string {
  const icons: Record<string, string> = {
    home: 'Home',
    work: 'Briefcase',
    hospital: 'Hospital',
    park: 'Trees',
    relative: 'Users',
    other: 'MapPin',
  };
  return icons[placeType] || icons.other;
}

/**
 * Calculate time spent at a location
 * @param events Array of geofence events
 * @param placeId Place ID to calculate for
 * @returns Total time in minutes
 */
export function calculateTimeAtLocation(events: GeofenceEvent[], placeId: string): number {
  const placeEvents = events
    .filter(e => e.place_id === placeId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let totalMinutes = 0;
  let lastEntry: GeofenceEvent | null = null;

  for (const event of placeEvents) {
    if (event.event_type === 'entry') {
      lastEntry = event;
    } else if (event.event_type === 'exit' && lastEntry) {
      const entryTime = new Date(lastEntry.timestamp).getTime();
      const exitTime = new Date(event.timestamp).getTime();
      totalMinutes += (exitTime - entryTime) / (1000 * 60);
      lastEntry = null;
    }
  }

  return Math.round(totalMinutes);
}

/**
 * Get most visited places
 * @param events Array of geofence events
 * @param places Array of geofence places
 * @param limit Number of places to return
 * @returns Array of places with visit counts
 */
export function getMostVisitedPlaces(
  events: GeofenceEvent[],
  places: GeofencePlace[],
  limit = 5
): Array<{ place: GeofencePlace; visits: number; totalMinutes: number }> {
  const visitCounts = new Map<string, number>();
  const timeCounts = new Map<string, number>();

  // Count entries as visits
  events.forEach(event => {
    if (event.event_type === 'entry') {
      visitCounts.set(event.place_id, (visitCounts.get(event.place_id) || 0) + 1);
    }
  });

  // Calculate time at each location
  places.forEach(place => {
    const timeSpent = calculateTimeAtLocation(events, place.id);
    timeCounts.set(place.id, timeSpent);
  });

  return places
    .map(place => ({
      place,
      visits: visitCounts.get(place.id) || 0,
      totalMinutes: timeCounts.get(place.id) || 0,
    }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, limit);
}

/**
 * Format duration for display
 * @param minutes Duration in minutes
 * @returns Formatted string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Get place type options
 * @returns Array of place type options
 */
export function getPlaceTypeOptions(): Array<{ value: string; label: string }> {
  return [
    { value: 'home', label: 'Home' },
    { value: 'work', label: 'Work' },
    { value: 'hospital', label: 'Hospital' },
    { value: 'park', label: 'Park' },
    { value: 'relative', label: "Relative's Place" },
    { value: 'other', label: 'Other' },
  ];
}
