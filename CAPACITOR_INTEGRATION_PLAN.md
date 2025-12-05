# Capacitor Integration Plan for Symbiot Care Peace

## Overview

This document outlines the step-by-step plan to integrate Capacitor into the Symbiot Care Peace React application, enabling native mobile features like push notifications, file handling, GPS tracking, camera access, and more.

---

## Phase 1: Initial Capacitor Setup

### 1.1 Install Capacitor Core

```bash
npm install @capacitor/core @capacitor/cli
npx cap init "Symbiot Care" "com.symbiot.care"
```

### 1.2 Add Platform Support

```bash
npm install @capacitor/android @capacitor/ios
npx cap add android
npx cap add ios
```

### 1.3 Configure capacitor.config.ts

```typescript
const config: CapacitorConfig = {
  appId: 'com.symbiot.care',
  appName: 'Symbiot Care',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    // Plugin configs will be added here
  }
};
```

### 1.4 Update package.json Scripts

```json
{
  "scripts": {
    "cap:build": "npm run build && npx cap sync",
    "cap:android": "npx cap open android",
    "cap:ios": "npx cap open ios",
    "cap:sync": "npx cap sync"
  }
}
```

---

## Phase 2: Essential Capacitor Plugins

### 2.1 Required Plugins Installation

```bash
# Core functionality
npm install @capacitor/app
npm install @capacitor/device
npm install @capacitor/network
npm install @capacitor/storage
npm install @capacitor/preferences

# Notifications
npm install @capacitor/push-notifications
npm install @capacitor/local-notifications

# Location & GPS
npm install @capacitor/geolocation

# File handling
npm install @capacitor/filesystem
npm install @capacitor-community/file-picker

# Camera
npm install @capacitor/camera

# Auth & Security
npm install @capacitor-community/biometric-auth

# Device features
npm install @capacitor/haptics
npm install @capacitor/status-bar
npm install @capacitor/splash-screen

# Bluetooth (for device pairing)
npm install @capacitor-community/bluetooth-le

# Share functionality
npm install @capacitor/share
```

---

## Phase 3: Page-by-Page Integration Plan

### 3.1 Auth.tsx (Authentication)

**Current Features:**
- Email/password login
- User session management

**Capacitor Integration:**

| Feature | Plugin | Implementation |
|---------|--------|----------------|
| Biometric Login | `@capacitor-community/biometric-auth` | Add fingerprint/Face ID option |
| Secure Storage | `@capacitor/preferences` | Store auth tokens securely |
| App State | `@capacitor/app` | Handle app resume/background for session |

**New File:** `src/lib/capacitor/auth.ts`
```typescript
// Biometric authentication wrapper
// Secure token storage
// Session persistence
```

---

### 3.2 Dashboard.tsx (Main Dashboard)

**Current Features:**
- Vital metrics display
- Alert summary
- Medication overview
- Environmental sensors
- Panic SOS events
- ILQ widget

**Capacitor Integration:**

| Feature | Plugin | Implementation |
|---------|--------|----------------|
| Push Notifications | `@capacitor/push-notifications` | Real-time alert delivery |
| Haptic Feedback | `@capacitor/haptics` | Vibrate on critical alerts |
| Background Sync | `@capacitor/app` | Sync data when app resumes |
| Network Status | `@capacitor/network` | Show offline indicator |

**New File:** `src/lib/capacitor/dashboard-notifications.ts`
```typescript
// Push notification registration
// Haptic feedback for alerts
// Background data sync handler
```

---

### 3.3 Alerts.tsx (Alert Management)

**Current Features:**
- Alert list with filtering
- Alert trending/statistics
- Browser notifications

**Capacitor Integration:**

| Feature | Plugin | Implementation |
|---------|--------|----------------|
| Push Notifications | `@capacitor/push-notifications` | Remote alert notifications |
| Local Notifications | `@capacitor/local-notifications` | Scheduled alert reminders |
| Haptics | `@capacitor/haptics` | Vibration by severity level |
| Deep Linking | `@capacitor/app` | Open specific alert from notification |

**New Files:**
- `src/lib/capacitor/notifications.ts` - Unified notification service
- `src/hooks/useCapacitorNotifications.ts` - React hook for notifications

**Notification Channels (Android):**
```typescript
const channels = [
  { id: 'critical', name: 'Critical Alerts', importance: 5, vibration: true, sound: 'critical.wav' },
  { id: 'high', name: 'High Priority', importance: 4, vibration: true },
  { id: 'medium', name: 'Medium Priority', importance: 3 },
  { id: 'low', name: 'Low Priority', importance: 2 }
];
```

---

### 3.4 Tracking.tsx (Movement Tracking)

**Current Features:**
- Indoor tracking (floor plan grid)
- Outdoor GPS tracking (Google Maps)
- Camera feeds
- Geofencing

**Capacitor Integration:**

| Feature | Plugin | Implementation |
|---------|--------|----------------|
| GPS Location | `@capacitor/geolocation` | Native GPS tracking |
| Background Location | Custom native plugin | Track when app backgrounded |
| Camera Access | `@capacitor/camera` | Native camera streams |
| Geofence Alerts | `@capacitor/local-notifications` | Entry/exit notifications |

**New Files:**
- `src/lib/capacitor/geolocation.ts` - GPS tracking service
- `src/lib/capacitor/camera.ts` - Camera access service
- `src/hooks/useNativeLocation.ts` - Location hook

**Background Location Configuration:**
```typescript
// capacitor.config.ts
plugins: {
  Geolocation: {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  }
}
```

**Critical Implementation Notes:**
- Implement background location tracking for elderly safety
- Battery optimization with smart polling intervals
- Geofence detection with native accuracy

---

### 3.5 MovementDashboard.tsx (Movement Analysis)

**Current Features:**
- Heatmaps
- Dwell time analysis
- Ideal profile comparison

**Capacitor Integration:**

| Feature | Plugin | Implementation |
|---------|--------|----------------|
| Data Export | `@capacitor/filesystem` | Save movement reports |
| Share Reports | `@capacitor/share` | Share analysis with caregivers |
| Offline Storage | `@capacitor/preferences` | Cache movement data |

---

### 3.6 MedicationConfig.tsx (Medication Management)

**Current Features:**
- Medication schedule
- Adherence tracking
- Medication CRUD

**Capacitor Integration:**

| Feature | Plugin | Implementation |
|---------|--------|----------------|
| Medication Reminders | `@capacitor/local-notifications` | Scheduled dose reminders |
| Recurring Notifications | `@capacitor/local-notifications` | Daily/weekly schedules |
| Haptic Feedback | `@capacitor/haptics` | Confirm medication taken |

**New File:** `src/lib/capacitor/medication-reminders.ts`
```typescript
// Schedule medication notifications
// Handle missed dose alerts
// Snooze functionality
```

**Notification Schedule Example:**
```typescript
LocalNotifications.schedule({
  notifications: [
    {
      id: 1,
      title: "Medication Reminder",
      body: "Time to take Aspirin 100mg",
      schedule: {
        at: new Date(Date.now() + 1000 * 60 * 60 * 8), // 8 hours
        repeats: true,
        every: "day"
      },
      sound: "medication_reminder.wav",
      actionTypeId: "MEDICATION_REMINDER"
    }
  ]
});
```

---

### 3.7 DeviceStatusPage.tsx (Device Management)

**Current Features:**
- Device status overview
- Pairing approval panel
- Device discovery

**Capacitor Integration:**

| Feature | Plugin | Implementation |
|---------|--------|----------------|
| Bluetooth Scanning | `@capacitor-community/bluetooth-le` | Discover nearby devices |
| Device Pairing | `@capacitor-community/bluetooth-le` | BLE device pairing |
| Device Info | `@capacitor/device` | Get mobile device info |

**New Files:**
- `src/lib/capacitor/bluetooth.ts` - Bluetooth service
- `src/hooks/useBluetoothDevices.ts` - Device discovery hook

---

### 3.8 FloorPlanEditor.tsx & FloorPlanManagement.tsx

**Current Features:**
- Canvas-based floor plan editor (Fabric.js)
- Furniture/zone placement
- Floor plan CRUD

**Capacitor Integration:**

| Feature | Plugin | Implementation |
|---------|--------|----------------|
| Image Import | `@capacitor/camera` | Import floor plan photos |
| File Picker | `@capacitor-community/file-picker` | Select floor plan files |
| Export Plans | `@capacitor/filesystem` | Save floor plans locally |
| Share Plans | `@capacitor/share` | Share with family/caregivers |

---

### 3.9 Profile.tsx (User Settings)

**Current Features:**
- Profile management
- Language settings
- Data sharing preferences

**Capacitor Integration:**

| Feature | Plugin | Implementation |
|---------|--------|----------------|
| Settings Storage | `@capacitor/preferences` | Persist user preferences |
| Biometric Settings | `@capacitor-community/biometric-auth` | Enable/disable biometric |
| Export Data | `@capacitor/filesystem` | Download personal data |

---

### 3.10 ILQAnalytics.tsx (Analytics)

**Current Features:**
- ILQ score history
- Real-time computation
- Trend analysis

**Capacitor Integration:**

| Feature | Plugin | Implementation |
|---------|--------|----------------|
| Report Download | `@capacitor/filesystem` | Save PDF/CSV reports |
| Share Analytics | `@capacitor/share` | Share with healthcare providers |
| Offline Caching | `@capacitor/preferences` | Cache analytics data |

---

### 3.11 DataSharingPage.tsx

**Current Features:**
- Data sharing preferences
- Access management

**Capacitor Integration:**

| Feature | Plugin | Implementation |
|---------|--------|----------------|
| Export Data | `@capacitor/filesystem` | Export all user data |
| Share Data | `@capacitor/share` | Send data packages |
| QR Code Scanning | `@capacitor-community/barcode-scanner` | Scan caregiver QR codes |

---

## Phase 4: Core Service Files to Create

### 4.1 Capacitor Service Layer

```
src/lib/capacitor/
├── index.ts              # Main exports
├── platform.ts           # Platform detection utilities
├── notifications.ts      # Push & local notifications
├── geolocation.ts        # GPS tracking service
├── camera.ts             # Camera access
├── filesystem.ts         # File operations
├── bluetooth.ts          # BLE device management
├── auth.ts               # Biometric auth
├── haptics.ts            # Vibration feedback
└── storage.ts            # Persistent storage
```

### 4.2 React Hooks for Capacitor

```
src/hooks/
├── useCapacitorNotifications.ts
├── useNativeLocation.ts
├── useBluetoothDevices.ts
├── useBiometricAuth.ts
├── useFileSystem.ts
├── useNetworkStatus.ts
├── usePlatform.ts
└── useAppState.ts
```

---

## Phase 5: Platform-Specific Configuration

### 5.1 Android Configuration

**android/app/src/main/AndroidManifest.xml:**
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

**Firebase Cloud Messaging Setup:**
- Add `google-services.json` to `android/app/`
- Configure FCM in Firebase Console

### 5.2 iOS Configuration

**ios/App/App/Info.plist:**
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need location access to track movement for safety monitoring</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Background location is needed for continuous safety monitoring</string>
<key>NSCameraUsageDescription</key>
<string>Camera access is needed for floor plan photos</string>
<key>NSFaceIDUsageDescription</key>
<string>Face ID is used for secure authentication</string>
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Bluetooth is needed to connect monitoring devices</string>
```

**Apple Push Notification Service (APNs):**
- Enable Push Notifications capability
- Add APNs certificate to Firebase

---

## Phase 6: Implementation Priority

### Priority 1: Critical (Week 1-2)

| Task | Components Affected |
|------|---------------------|
| Push Notifications Setup | Alerts, Dashboard |
| Local Notifications | MedicationConfig, Alerts |
| GPS Geolocation | Tracking |
| Network Status | All pages |
| App Lifecycle | All pages |

### Priority 2: High (Week 3-4)

| Task | Components Affected |
|------|---------------------|
| Background Location | Tracking (geofencing) |
| File Download/Export | Analytics, Reports |
| Haptic Feedback | Alerts, Notifications |
| Biometric Auth | Auth |

### Priority 3: Medium (Week 5-6)

| Task | Components Affected |
|------|---------------------|
| Camera Access | Tracking, FloorPlan |
| Bluetooth/BLE | DeviceStatus |
| Share Functionality | All reports/analytics |
| File Picker | FloorPlan |

### Priority 4: Low (Week 7+)

| Task | Components Affected |
|------|---------------------|
| Splash Screen | App startup |
| Status Bar Styling | All pages |
| Deep Linking | Notifications |
| QR Code Scanner | DataSharing |

---

## Phase 7: Testing Strategy

### 7.1 Device Testing Matrix

| Platform | Versions | Devices |
|----------|----------|---------|
| Android | 10, 11, 12, 13, 14 | Samsung, Pixel, Xiaomi |
| iOS | 14, 15, 16, 17 | iPhone 11+, iPad |

### 7.2 Feature Testing Checklist

- [ ] Push notifications receive in foreground
- [ ] Push notifications receive in background
- [ ] Push notifications receive when app killed
- [ ] Local notification scheduling works
- [ ] GPS tracking accuracy
- [ ] Background location updates
- [ ] Geofence entry/exit detection
- [ ] Camera capture works
- [ ] File download to device
- [ ] Biometric authentication
- [ ] Bluetooth device discovery
- [ ] Offline mode functionality
- [ ] App resume state restoration

---

## Phase 8: Migration Checklist

### 8.1 Code Changes Summary

| File/Area | Changes Required |
|-----------|------------------|
| `src/lib/capacitor/*` | New - All Capacitor services |
| `src/hooks/use*.ts` | New - Capacitor React hooks |
| `src/contexts/NotificationContext.tsx` | Modify - Add Capacitor notifications |
| `src/components/AlertNotificationDialog.tsx` | Modify - Use native notifications |
| `src/pages/Tracking.tsx` | Modify - Use native GPS |
| `src/pages/MedicationConfig.tsx` | Modify - Schedule native reminders |
| `src/pages/Auth.tsx` | Modify - Add biometric option |
| `capacitor.config.ts` | New - Capacitor configuration |
| `android/*` | New - Android project |
| `ios/*` | New - iOS project |

### 8.2 Environment Variables

```env
# .env.production
VITE_FIREBASE_CONFIG=...
VITE_GOOGLE_MAPS_API_KEY=...
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

---

## Appendix A: Capacitor Plugin Compatibility Matrix

| Plugin | Web | Android | iOS |
|--------|-----|---------|-----|
| Push Notifications | - | Yes | Yes |
| Local Notifications | Yes | Yes | Yes |
| Geolocation | Yes | Yes | Yes |
| Camera | Yes | Yes | Yes |
| Filesystem | Yes | Yes | Yes |
| Biometric | - | Yes | Yes |
| Bluetooth LE | - | Yes | Yes |
| Haptics | - | Yes | Yes |
| Share | Yes | Yes | Yes |

---

## Appendix B: Estimated Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1: Setup | 2 days | Capacitor initialized, platforms added |
| Phase 2: Plugins | 2 days | All plugins installed and configured |
| Phase 3: Services | 5 days | Core Capacitor service layer complete |
| Phase 4: Notifications | 3 days | Push & local notifications working |
| Phase 5: Location | 4 days | GPS & geofencing implemented |
| Phase 6: Files | 2 days | Download/upload/share working |
| Phase 7: Device Features | 3 days | Camera, Bluetooth, biometrics |
| Phase 8: Testing | 5 days | All platforms tested |
| **Total** | **~26 days** | Production-ready mobile apps |

---

## Next Steps

1. Review and approve this plan
2. Set up Firebase project for FCM/APNs
3. Obtain Apple Developer account (for iOS)
4. Begin Phase 1 implementation
