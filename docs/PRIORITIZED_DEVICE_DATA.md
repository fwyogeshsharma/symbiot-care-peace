# Prioritized Device Data Implementation

## Overview

The activity page (SmartPhoneCard component) now uses a **priority-based data source system** that prioritizes real-time mobile device data over database stored data.

## Priority Logic

```
┌─────────────────────────────────────┐
│ Is user logged in from mobile app?  │
│ (Android/iOS via Capacitor)         │
└────────────┬────────────────────────┘
             │
     ┌───────┴────────┐
     │ YES            │ NO
     ▼                ▼
┌─────────────┐  ┌──────────────┐
│ PRIMARY:    │  │ FALLBACK:    │
│ Real-time   │  │ Database     │
│ Capacitor   │  │ device_data  │
│ device data │  │ table        │
└─────────────┘  └──────────────┘
```

## Data Sources

### 1. **Primary Source: Mobile Device (via Capacitor)**

When the user is logged in from a mobile device (Android/iOS), the app retrieves **real-time data** directly from the device:

#### Battery Information
- **Source**: Capacitor Device Plugin (`@capacitor/device`)
- **Data**:
  - Battery level (percentage)
  - Charging status
- **Update Frequency**: Every 60 seconds
- **Location**: `src/lib/capacitor/device.ts:76-100`

```typescript
const batteryInfo = await getBatteryInfo();
// Returns: { batteryLevel: 0.85, isCharging: false }
```

#### GPS Location
- **Source**: Capacitor Geolocation Plugin (`@capacitor/geolocation`)
- **Data**:
  - Latitude & Longitude
  - Accuracy (in meters)
  - Altitude, Heading, Speed (optional)
- **Update Frequency**: Configurable (default: 30 seconds)
- **Location**: `src/lib/capacitor/geolocation.ts:94-119`

```typescript
const position = await getCurrentPosition(true); // high accuracy
// Returns: { latitude, longitude, accuracy, altitude, heading, speed, timestamp }
```

### 2. **Fallback Source: Database**

When the user is **NOT** logged in from a mobile device (or mobile data is unavailable), the app falls back to the `device_data` table in Supabase:

#### Query Details
```sql
SELECT * FROM device_data
INNER JOIN devices ON devices.id = device_data.device_id
WHERE elderly_person_id = ?
  AND devices.device_type = 'smart_phone'
ORDER BY recorded_at DESC
LIMIT 20
```

## Implementation Files

### 1. Custom Hook: `usePrioritizedDeviceData`
**Location**: `src/hooks/usePrioritizedDeviceData.ts`

This hook encapsulates the priority logic and provides a unified interface:

```typescript
const {
  battery,      // Prioritized battery data
  gps,          // Prioritized GPS data
  isFromMobile, // Boolean: true if using mobile data
  allData,      // All device data from database
  isLoading     // Loading state
} = usePrioritizedDeviceData({
  selectedPersonId: "user-id",
  enableGPSTracking: true,
  gpsUpdateInterval: 30000 // 30 seconds
});
```

**Key Features**:
- Automatic platform detection (mobile vs web)
- Real-time battery monitoring (60s intervals)
- Real-time GPS tracking (configurable intervals)
- Automatic fallback to database
- TypeScript type safety

### 2. Updated Component: `SmartPhoneCard`
**Location**: `src/components/dashboard/SmartPhoneCard.tsx:72-79`

The SmartPhoneCard component now uses the prioritized hook:

```typescript
const { battery, gps, isFromMobile, allData, isLoading } = usePrioritizedDeviceData({
  selectedPersonId,
  enableGPSTracking: true,
  gpsUpdateInterval: 30000,
});
```

## Visual Indicators

### "Live" Badge
When data comes from the mobile device, a green "Live" badge appears:

1. **Device Information Section**: Shows `[Live]` badge when using mobile battery data
2. **GPS Location Section**: Shows `[Live GPS]` badge when using mobile GPS data

These badges help users distinguish between real-time mobile data and historical database data.

## Data Structure

### Battery Data
```typescript
{
  level: number | null,           // 0-100 percentage
  isCharging?: boolean,          // Only available from mobile
  source: 'mobile' | 'database', // Data source indicator
  timestamp: Date                // When data was captured
}
```

### GPS Data
```typescript
{
  latitude: number,
  longitude: number,
  accuracy: number,              // Accuracy in meters
  altitude?: number | null,
  heading?: number | null,       // Direction in degrees (0-360)
  speed?: number | null,         // Speed in m/s
  source: 'mobile' | 'database',
  timestamp: Date
}
```

## Configuration Options

### GPS Update Interval
Control how often GPS is updated from the mobile device:

```typescript
gpsUpdateInterval: 30000  // 30 seconds (default)
gpsUpdateInterval: 60000  // 1 minute (battery saving)
gpsUpdateInterval: 10000  // 10 seconds (high frequency)
```

### GPS Tracking Mode
Two modes available in `src/lib/capacitor/geolocation.ts`:

1. **High Accuracy Mode** (default)
   - Uses GPS + network + sensors
   - Higher battery consumption
   - Better accuracy (typically 5-10 meters)

2. **Battery Saving Mode**
   - Uses network + WiFi only
   - Lower battery consumption
   - Lower accuracy (typically 20-50 meters)

## Permissions

### Required Permissions

1. **Android** (`android/app/src/main/AndroidManifest.xml`)
```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

2. **iOS** (`ios/App/App/Info.plist`)
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app needs access to location for elderly monitoring.</string>
```

The hook automatically requests permissions when GPS tracking is enabled.

## Testing

### Test on Mobile Device
1. Build and deploy to Android/iOS
2. Login to the app
3. Navigate to Dashboard → Smart Phone Card
4. Verify "Live" badges appear
5. Check battery percentage updates
6. Check GPS location updates

### Test Fallback (Web)
1. Open app in web browser
2. Login to the app
3. Navigate to Dashboard → Smart Phone Card
4. Verify NO "Live" badges appear
5. Data should come from database

## Performance Considerations

### Battery Impact
- Battery monitoring: **Minimal** (checks every 60s)
- GPS tracking: **Moderate** (configurable, default 30s)
- Use `enableGPSTracking: false` to disable GPS when not needed

### Network Impact
- Mobile data fetches happen locally (no network)
- Database fallback queries: ~20 records (~2KB)
- Real-time subscriptions: Minimal overhead

## Future Enhancements

Potential improvements:

1. **Adaptive GPS Intervals**
   - Increase frequency when moving
   - Decrease when stationary

2. **Battery-Aware Tracking**
   - Reduce GPS frequency when battery < 20%
   - Pause tracking when battery < 10%

3. **Background Tracking**
   - Continue tracking when app is in background
   - Requires additional permissions

4. **Data Sync**
   - Upload mobile data to database
   - Hybrid mode: show mobile + recent database

## Troubleshooting

### GPS Not Working
1. Check permissions: `checkLocationPermission()`
2. Verify `enableGPSTracking: true` in hook options
3. Check device location services enabled
4. Test with `getCurrentPosition()` directly

### Battery Info Not Showing
1. Verify running on mobile device (not web)
2. Check Capacitor Device plugin installed
3. Check battery permission (Android)
4. Test with `getBatteryInfo()` directly

### Data Not Updating
1. Check `isFromMobile` flag in component
2. Verify update intervals not too long
3. Check component not unmounting/remounting
4. Check network connectivity

## Related Files

- `src/hooks/usePrioritizedDeviceData.ts` - Main hook
- `src/components/dashboard/SmartPhoneCard.tsx` - UI component
- `src/lib/capacitor/device.ts` - Device plugin wrapper
- `src/lib/capacitor/geolocation.ts` - GPS plugin wrapper
- `src/contexts/CapacitorContext.tsx` - Capacitor context provider

## Summary

This implementation provides a seamless experience where:
- **Mobile users** get real-time, accurate device data
- **Web users** still see historical data from the database
- The transition is automatic with clear visual indicators
- Battery and performance impact is minimized
- The system gracefully handles fallbacks
