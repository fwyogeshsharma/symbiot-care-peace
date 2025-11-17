/**
 * GPS Utilities for processing GPS data and calculating distances
 */

import { metersToFeet, kilometersToMiles } from './unitConversions';

export interface GPSCoordinate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param coord1 First coordinate
 * @param coord2 Second coordinate
 * @returns Distance in meters
 */
export function calculateDistance(coord1: GPSCoordinate, coord2: GPSCoordinate): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (coord1.latitude * Math.PI) / 180;
  const φ2 = (coord2.latitude * Math.PI) / 180;
  const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate total distance traveled along a path
 * @param coordinates Array of GPS coordinates
 * @returns Total distance in meters
 */
export function calculateTotalDistance(coordinates: GPSCoordinate[]): number {
  if (coordinates.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < coordinates.length; i++) {
    totalDistance += calculateDistance(coordinates[i - 1], coordinates[i]);
  }
  return totalDistance;
}

/**
 * Format distance for display (in imperial units)
 * @param meters Distance in meters
 * @returns Formatted string in feet or miles
 */
export function formatDistance(meters: number): string {
  const feet = metersToFeet(meters);
  if (feet < 528) { // Less than 0.1 miles (528 feet)
    return `${Math.round(feet)} ft`;
  }
  const miles = kilometersToMiles(meters / 1000);
  return `${miles.toFixed(2)} mi`;
}

/**
 * Format GPS coordinates for display
 * @param latitude Latitude value
 * @param longitude Longitude value
 * @returns Formatted string
 */
export function formatCoordinates(latitude: number, longitude: number): string {
  const latDir = latitude >= 0 ? 'N' : 'S';
  const lonDir = longitude >= 0 ? 'E' : 'W';
  return `${Math.abs(latitude).toFixed(6)}°${latDir}, ${Math.abs(longitude).toFixed(6)}°${lonDir}`;
}

/**
 * Check if a point is within a circular geofence
 * @param point GPS coordinate to check
 * @param center Center of the geofence
 * @param radiusMeters Radius of the geofence in meters
 * @returns True if point is within geofence
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
 * Process GPS trail data for visualization
 * @param coordinates Array of GPS coordinates
 * @returns Processed trail data
 */
export function processGPSTrail(coordinates: GPSCoordinate[]): [number, number][] {
  return coordinates.map(coord => [coord.latitude, coord.longitude]);
}
