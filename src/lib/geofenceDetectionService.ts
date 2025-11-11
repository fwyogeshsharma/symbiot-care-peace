/**
 * Geofence Detection Service
 * Handles detection of geofence entry/exit events and creates geofence events
 */

import { supabase } from '@/integrations/supabase/client';
import { GPSCoordinate, calculateDistance } from './gpsUtils';
import { GeofencePlace } from './geofenceUtils';

// In-memory state tracking to avoid database dependencies
const geofenceStates = new Map<string, {
  placeId: string;
  entryTime: Date;
  entryTimestamp: string; // Timestamp from GPS data when entry was detected
  lastSeenTimestamp: string; // Latest GPS timestamp while at this place (for accurate exit time)
  latitude: number;
  longitude: number;
}>();

/**
 * Check if a GPS point is within a geofence
 */
export function isPointInGeofence(
  point: GPSCoordinate,
  center: GPSCoordinate,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(point, center);
  return distance <= radiusMeters;
}

/**
 * Get the geofence place that contains a GPS point (if any)
 */
export function getContainingGeofence(
  point: GPSCoordinate,
  places: GeofencePlace[]
): GeofencePlace | null {
  for (const place of places) {
    if (isPointInGeofence(point, {
      latitude: place.latitude,
      longitude: place.longitude,
      accuracy: 0
    }, place.radius_meters)) {
      return place;
    }
  }
  return null;
}

/**
 * Track geofence state changes and create events
 * This function should be called whenever new GPS data arrives
 */
export async function detectGeofenceEvents(
  elderlyPersonId: string,
  gpsData: GPSCoordinate,
  geofencePlaces: GeofencePlace[],
  deviceId?: string
): Promise<void> {
  try {
    if (!geofencePlaces || geofencePlaces.length === 0) {
      return; // No geofences to check
    }

    // Check which geofence (if any) contains the current GPS point
    const currentPlace = getContainingGeofence(gpsData, geofencePlaces);

    // Get previous geofence state from memory
    const stateKey = elderlyPersonId;
    const previousState = geofenceStates.get(stateKey);
    const previousPlaceId = previousState ? previousState.placeId : null;
    const currentPlaceId = currentPlace ? currentPlace.id : null;

    // Get current GPS timestamp
    const gpsTimestamp = gpsData.timestamp ? new Date(gpsData.timestamp).toISOString() : new Date().toISOString();

    // Detect state change
    if (previousPlaceId !== currentPlaceId) {
      console.log(`🔄 State change detected: ${previousPlaceId || 'null'} → ${currentPlaceId || 'null'}`);

      // Exit event: person left a place
      if (previousPlaceId && previousState) {
        console.log(`📤 Creating exit event from ${previousPlaceId}`);
        console.log(`   Entry time: ${previousState.entryTimestamp}`);
        console.log(`   Exit time will be: entry + 4 minutes`);
        // Calculate exit time to be BEFORE entry to next location
        // Exit = entry time + (GPS_interval - 1 minute)
        // This ensures exit and entry show as different minutes in UI
        // e.g., Entry at 09:27, Exit at 09:31, Entry to next at 09:32
        const entryTimeMs = new Date(previousState.entryTimestamp).getTime();
        const GPS_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
        const ONE_MINUTE_MS = 60 * 1000; // 1 minute
        const exitTimeMs = entryTimeMs + GPS_INTERVAL_MS - ONE_MINUTE_MS; // Entry + 4 minutes
        const exitTimestamp = new Date(exitTimeMs).toISOString();

        await createGeofenceEvent(
          elderlyPersonId,
          previousPlaceId,
          'exit',
          gpsData.latitude,
          gpsData.longitude,
          previousState.entryTimestamp, // When they entered the previous place
          deviceId,
          exitTimestamp // Estimated exit time: entry + 4 minutes (1 min before next GPS reading)
        );

        // Remove from memory
        geofenceStates.delete(stateKey);
      }

      // Entry event: person entered a new place
      if (currentPlaceId) {
        await createGeofenceEvent(
          elderlyPersonId,
          currentPlaceId,
          'entry',
          gpsData.latitude,
          gpsData.longitude,
          null,
          deviceId,
          gpsTimestamp // Entry timestamp is when GPS data shows them there
        );

        // Store new state in memory
        geofenceStates.set(stateKey, {
          placeId: currentPlaceId,
          entryTime: new Date(),
          entryTimestamp: gpsTimestamp, // When they first entered this place
          lastSeenTimestamp: gpsTimestamp, // When they were last seen at this place (for exit timestamp)
          latitude: gpsData.latitude,
          longitude: gpsData.longitude
        });
      }
    } else if (currentPlaceId && previousState) {
      // Still in the same place, update position and last seen timestamp
      previousState.latitude = gpsData.latitude;
      previousState.longitude = gpsData.longitude;
      previousState.lastSeenTimestamp = gpsTimestamp; // Update to latest GPS timestamp while at this place
    }
  } catch (error) {
    console.error('Error detecting geofence events:', error);
  }
}

/**
 * Create a geofence event record in the database
 */
async function createGeofenceEvent(
  elderlyPersonId: string,
  placeId: string,
  eventType: 'entry' | 'exit',
  latitude: number,
  longitude: number,
  entryTimestamp: string | null,
  deviceId?: string,
  eventTimestamp?: string // Timestamp from GPS data
): Promise<void> {
  try {
    // Use GPS data timestamp if provided, otherwise use current time
    const timestamp = eventTimestamp || new Date().toISOString();
    let durationMinutes = null;

    console.log(`📍 Creating ${eventType} event at ${timestamp}`);

    // Calculate duration for exit events
    if (eventType === 'exit' && entryTimestamp) {
      const entryTime = new Date(entryTimestamp).getTime();
      const exitTime = new Date(timestamp).getTime();
      const calculatedDuration = Math.round((exitTime - entryTime) / (1000 * 60));
      // Ensure minimum 1 minute if person was at location for any time
      durationMinutes = Math.max(1, calculatedDuration);
      console.log(`   Duration: ${durationMinutes} minutes (from ${entryTimestamp} to ${timestamp})`);
    }

    const { error } = await supabase
      .from('geofence_events' as any)
      .insert({
        elderly_person_id: elderlyPersonId,
        place_id: placeId,
        device_id: deviceId || 'unknown', // Include device_id (required by NOT NULL constraint)
        event_type: eventType,
        timestamp: timestamp,
        latitude,
        longitude,
        duration_minutes: durationMinutes
      });

    if (error) {
      console.error(`❌ Error creating ${eventType} event:`, error);
    } else {
      console.log(`✅ Geofence ${eventType} event created!`);
    }
  } catch (error) {
    console.error('❌ Error in createGeofenceEvent:', error);
  }
}

/**
 * Reset geofence state for fresh simulation
 * Call this when starting a new simulation to clear in-memory state
 */
export function resetGeofenceState(): void {
  geofenceStates.clear();
  console.log('✓ Geofence state cleared for fresh simulation');
}
