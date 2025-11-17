/**
 * Unit conversion utilities for temperature and distance
 */

/**
 * Convert Celsius to Fahrenheit
 * Formula: F = (C × 9/5) + 32
 */
export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9/5) + 32;
}

/**
 * Convert Fahrenheit to Celsius
 * Formula: C = (F - 32) × 5/9
 */
export function fahrenheitToCelsius(fahrenheit: number): number {
  return (fahrenheit - 32) * 5/9;
}

/**
 * Convert kilometers to miles
 * Formula: miles = km × 0.621371
 */
export function kilometersToMiles(kilometers: number): number {
  return kilometers * 0.621371;
}

/**
 * Convert miles to kilometers
 * Formula: km = miles × 1.60934
 */
export function milesToKilometers(miles: number): number {
  return miles * 1.60934;
}

/**
 * Convert meters to feet
 * Formula: feet = meters × 3.28084
 */
export function metersToFeet(meters: number): number {
  return meters * 3.28084;
}

/**
 * Convert feet to meters
 * Formula: meters = feet × 0.3048
 */
export function feetToMeters(feet: number): number {
  return feet * 0.3048;
}

/**
 * Format temperature in Fahrenheit with degree symbol
 */
export function formatTemperatureFahrenheit(celsius: number, decimals: number = 1): string {
  const fahrenheit = celsiusToFahrenheit(celsius);
  return `${fahrenheit.toFixed(decimals)}°F`;
}

/**
 * Format distance in miles
 */
export function formatDistanceMiles(kilometers: number, decimals: number = 2): string {
  const miles = kilometersToMiles(kilometers);
  return `${miles.toFixed(decimals)} mi`;
}

/**
 * Format radius in feet (for geofences)
 */
export function formatRadiusFeet(meters: number, decimals: number = 0): string {
  const feet = metersToFeet(meters);
  return `${feet.toFixed(decimals)} ft`;
}
