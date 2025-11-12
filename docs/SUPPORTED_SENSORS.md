# SymBIoT Platform - Supported Sensors and Devices

## Overview
This document provides a comprehensive list of all sensors, devices, and data types supported by the SymBIoT elderly care monitoring platform. It includes specifications, integration methods, data formats, and compatibility information.

---

## Table of Contents
1. [Health Monitoring Devices](#health-monitoring-devices)
2. [Wearable Devices](#wearable-devices)
3. [Environmental Sensors](#environmental-sensors)
4. [Location Tracking Devices](#location-tracking-devices)
5. [Emergency Alert Devices](#emergency-alert-devices)
6. [Integration Methods](#integration-methods)
7. [Data Formats](#data-formats)
8. [Calibration & Setup](#calibration--setup)

---

## Health Monitoring Devices

### 1. Blood Pressure Monitors

#### Supported Models
- **Omron Series**: 10, 7, 5, 3 Series
- **Withings BPM**: Core, Connect
- **iHealth**: Track, Clear, Feel
- **Qardio**: QardioArm

#### Data Points Collected
- Systolic Blood Pressure (mmHg)
- Diastolic Blood Pressure (mmHg)
- Pulse Rate (BPM)
- Timestamp
- Irregular Heartbeat Detection (if supported)

#### Connectivity
- Bluetooth Low Energy (BLE)
- Wi-Fi (select models)
- USB (for legacy devices)

#### Supported Protocols
- Bluetooth Health Device Profile (HDP)
- Bluetooth Generic Attribute Profile (GATT)
- Custom manufacturer APIs

#### Data Frequency
- On-demand measurements
- Scheduled measurements (configurable)
- Real-time transmission after each reading

---

### 2. Glucose Meters

#### Supported Models
- **Accu-Chek**: Guide, Aviva Connect
- **OneTouch**: Verio Reflect, Verio Flex
- **Contour**: Next One, Contour Diabetes
- **Dexcom**: G6, G7 Continuous Glucose Monitoring (CGM)
- **FreeStyle**: Libre 2, Libre 3

#### Data Points Collected
- Blood Glucose Level (mg/dL or mmol/L)
- Timestamp
- Meal Context (before/after meal)
- Notes/Comments
- Trend indicators (CGM only)

#### Connectivity
- Bluetooth Low Energy (BLE)
- NFC (FreeStyle Libre)
- Wi-Fi (Dexcom G7)

#### Data Frequency
- On-demand measurements (traditional meters)
- Continuous monitoring every 1-5 minutes (CGM)

---

### 3. Pulse Oximeters

#### Supported Models
- **Nonin**: Onyx, PalmSAT
- **Masimo**: MightySat, Rad-57
- **CMS**: CMS50D+, CMS50F
- **Beurer**: PO 60, PO 80

#### Data Points Collected
- Oxygen Saturation (SpO2 %)
- Heart Rate (BPM)
- Perfusion Index (PI)
- Plethysmograph Waveform
- Timestamp

#### Connectivity
- Bluetooth Low Energy (BLE)
- USB
- Serial (legacy devices)

#### Data Frequency
- Continuous monitoring (every 1-2 seconds)
- Spot-check measurements

---

### 4. Thermometers

#### Supported Models
- **Withings**: Thermo
- **Kinsa**: QuickCare, Smart Ear
- **iProven**: DMT-489
- **Braun**: ThermoScan 7

#### Data Points Collected
- Body Temperature (°F or °C)
- Measurement Location (oral, axillary, temporal, ear)
- Timestamp

#### Connectivity
- Bluetooth Low Energy (BLE)
- Wi-Fi (select models)

#### Data Frequency
- On-demand measurements

---

### 5. Weight Scales

#### Supported Models
- **Withings**: Body+, Body Comp
- **Fitbit**: Aria Air, Aria 2
- **Eufy**: Smart Scale P2
- **Renpho**: ES-26M

#### Data Points Collected
- Weight (kg or lbs)
- BMI
- Body Fat Percentage
- Muscle Mass
- Bone Mass
- Water Percentage
- Timestamp

#### Connectivity
- Bluetooth Low Energy (BLE)
- Wi-Fi

#### Data Frequency
- On-demand measurements (daily recommended)

---

## Wearable Devices

### 1. Fitness Trackers

#### Supported Models
- **Fitbit**: Charge 5, Charge 6, Inspire 3
- **Garmin**: Vivosmart 5, Vivofit 4
- **Samsung**: Galaxy Fit2
- **Xiaomi**: Mi Band 7, Mi Band 8

#### Data Points Collected
- Steps Count
- Distance Traveled (km/miles)
- Calories Burned
- Active Minutes
- Heart Rate (continuous)
- Sleep Duration and Quality
- Floors Climbed
- Timestamp

#### Connectivity
- Bluetooth Low Energy (BLE)
- Manufacturer cloud APIs

#### Data Frequency
- Real-time heart rate (every 5-10 seconds)
- Activity updates every 15 minutes
- Sleep analysis (nightly)

---

### 2. Smartwatches

#### Supported Models
- **Apple**: Watch Series 7, 8, 9, Ultra
- **Samsung**: Galaxy Watch 5, 6
- **Garmin**: Venu 2, Fenix 7
- **Fossil**: Gen 6

#### Data Points Collected
- Heart Rate (BPM)
- ECG (select models)
- Blood Oxygen (SpO2)
- Activity Metrics (steps, calories, distance)
- Fall Detection
- Emergency SOS
- GPS Location
- Sleep Tracking
- Timestamp

#### Connectivity
- Bluetooth Low Energy (BLE)
- Wi-Fi
- Cellular (select models)
- Manufacturer cloud APIs

#### Data Frequency
- Real-time heart rate (every 1-5 seconds)
- Continuous activity tracking
- Location updates every 30-60 seconds

---

### 3. Medical Alert Smartwatches

#### Supported Models
- **Apple Watch**: with Fall Detection
- **Samsung Galaxy Watch**: with SOS
- **Medical Guardian**: MGMove
- **Bay Alarm Medical**: SOS Smartwatch

#### Data Points Collected
- Heart Rate
- Fall Detection Events
- Emergency SOS Activation
- GPS Location
- Activity Level
- Timestamp

#### Connectivity
- Bluetooth Low Energy (BLE)
- Wi-Fi
- Cellular

#### Data Frequency
- Continuous monitoring
- Immediate alert transmission

---

## Environmental Sensors

### 1. Temperature & Humidity Sensors

#### Supported Models
- **SensorPush**: HT1, HT.w
- **Govee**: H5074, H5075
- **Temp Stick**: Remote Temperature Monitor
- **Xiaomi**: Mi Temperature and Humidity Monitor 2

#### Data Points Collected
- Ambient Temperature (°C or °F)
- Relative Humidity (%)
- Timestamp
- Battery Level

#### Connectivity
- Bluetooth Low Energy (BLE)
- Wi-Fi
- Zigbee

#### Data Frequency
- Continuous monitoring (every 1-5 minutes)

#### Recommended Placement
- Bedroom
- Living Room
- Bathroom

---

### 2. Motion Sensors

#### Supported Models
- **Philips Hue**: Motion Sensor
- **Samsung SmartThings**: Motion Sensor
- **Aqara**: Motion Sensor P1
- **Wyze**: Motion Sensor

#### Data Points Collected
- Motion Detection (binary: yes/no)
- Last Motion Timestamp
- Ambient Light Level (lux)
- Battery Level

#### Connectivity
- Zigbee
- Z-Wave
- Wi-Fi
- Bluetooth Low Energy (BLE)

#### Data Frequency
- Event-based (immediate on detection)
- Heartbeat every 5-10 minutes

#### Recommended Placement
- Hallways
- Bedrooms
- Bathrooms
- Entrances/Exits

---

### 3. Door/Window Sensors

#### Supported Models
- **Samsung SmartThings**: Multipurpose Sensor
- **Aqara**: Door and Window Sensor
- **Wyze**: Contact Sensor
- **Ring**: Alarm Contact Sensor

#### Data Points Collected
- Open/Closed State
- State Change Timestamp
- Battery Level

#### Connectivity
- Zigbee
- Z-Wave
- Wi-Fi

#### Data Frequency
- Event-based (immediate on state change)

#### Recommended Placement
- Main entrance doors
- Bedroom doors
- Medicine cabinets
- Refrigerator (nutrition monitoring)

---

### 4. Air Quality Sensors

#### Supported Models
- **Awair**: Element, Omni
- **AirThings**: Wave Plus, View Plus
- **Foobot**: Air Quality Monitor
- **Netatmo**: Smart Indoor Air Quality Monitor

#### Data Points Collected
- PM2.5 (particulate matter)
- PM10
- CO2 Level (ppm)
- VOC (volatile organic compounds)
- Temperature
- Humidity
- Timestamp

#### Connectivity
- Wi-Fi
- Bluetooth Low Energy (BLE)

#### Data Frequency
- Continuous monitoring (every 5 minutes)

---

## Location Tracking Devices

### 1. Indoor Positioning Systems

#### Supported Technologies
- **Bluetooth Beacons**: iBeacon, Eddystone
- **UWB (Ultra-Wideband)**: Apple U1 chip compatible
- **Wi-Fi Triangulation**
- **RFID Tags**

#### Data Points Collected
- X, Y coordinates (meters)
- Floor/Level
- Zone/Room identifier
- Accuracy estimate (meters)
- Timestamp

#### Connectivity
- Bluetooth Low Energy (BLE)
- UWB
- Wi-Fi

#### Data Frequency
- Real-time positioning (every 1-5 seconds)
- Event-based (zone transitions)

#### Required Infrastructure
- Beacon network (3-4 beacons per room)
- Access points (Wi-Fi triangulation)
- Floor plan calibration

---

### 2. GPS Trackers

#### Supported Models
- **Apple AirTag**: via Find My network
- **Tile**: Pro, Mate
- **Tracki**: GPS Tracker
- **AngelSense**: GPS + Voice
- **Jiobit**: Smart Tag

#### Data Points Collected
- Latitude
- Longitude
- Altitude (if available)
- Speed
- Heading/Direction
- Accuracy (meters)
- Timestamp

#### Connectivity
- GPS + Cellular
- GPS + Bluetooth
- GPS + Wi-Fi

#### Data Frequency
- Real-time (every 30-60 seconds)
- Power-saving mode (every 5-15 minutes)

#### Battery Life
- 1-7 days (active tracking)
- 1-6 months (passive tracking)

---

### 3. Geofencing Devices

#### Compatible With
- All GPS trackers listed above
- Smartphones with SymBIoT mobile app
- Smartwatches with cellular/GPS

#### Data Points Collected
- Geofence entry/exit events
- Timestamp
- Location coordinates
- Geofence identifier

#### Configuration
- Radius: 50m to 5km
- Multiple geofences per person
- Alert triggers: entry, exit, or both

---

## Emergency Alert Devices

### 1. Panic Buttons

#### Supported Models
- **Medical Guardian**: Mini Guardian
- **Life Alert**: Help Button
- **Philips Lifeline**: GoSafe
- **Bay Alarm Medical**: In-Home Landline

#### Data Points Collected
- Panic button press event
- Timestamp
- Location (if GPS-enabled)
- Battery level

#### Connectivity
- Cellular
- Bluetooth Low Energy (BLE)
- RF (Radio Frequency)
- Landline (legacy)

#### Response Time
- Instant alert transmission (<5 seconds)

---

### 2. Fall Detection Devices

#### Supported Models
- **Apple Watch**: Series 4 and newer
- **Samsung Galaxy Watch**: with fall detection
- **Philips Lifeline**: GoSafe 2
- **Medical Guardian**: Home Guardian

#### Data Points Collected
- Fall detection event
- Impact force/severity
- Pre-fall and post-fall activity
- Timestamp
- Location

#### Connectivity
- Cellular
- Wi-Fi
- Bluetooth

#### Detection Algorithm
- Accelerometer + Gyroscope
- Pattern recognition
- AI/ML-based classification

---

## Integration Methods

### 1. Direct Bluetooth Integration
**Supported Protocols**:
- Bluetooth Low Energy (BLE) 4.0+
- Bluetooth Classic (legacy devices)
- Bluetooth Health Device Profile (HDP)
- Bluetooth Generic Attribute Profile (GATT)

**Implementation**:
```javascript
// BLE scan and connect
navigator.bluetooth.requestDevice({
  acceptAllDevices: true,
  optionalServices: ['heart_rate', 'battery_service']
})
```

---

### 2. Manufacturer Cloud APIs
**Supported Platforms**:
- Fitbit Web API
- Apple HealthKit
- Google Fit API
- Samsung Health SDK
- Withings API
- Garmin Connect API
- Dexcom Share API

**Authentication**:
- OAuth 2.0
- API Keys
- JWT Tokens

---

### 3. IoT Hub Integration
**Protocols**:
- MQTT
- CoAP
- HTTP/HTTPS
- WebSocket

**Supported Hubs**:
- Samsung SmartThings
- Apple HomeKit
- Google Home
- Amazon Alexa
- Home Assistant

---

### 4. Custom Gateway Integration
**For Proprietary Devices**:
- Serial (RS-232, USB)
- Zigbee
- Z-Wave
- LoRaWAN
- Custom RF protocols

---

## Data Formats

### Standard Data Format (JSON)
```json
{
  "device_id": "ABC123",
  "device_type": "heart_rate_monitor",
  "data_type": "heart_rate",
  "value": {
    "bpm": 72,
    "unit": "beats per minute"
  },
  "timestamp": "2025-01-12T10:30:00Z",
  "accuracy": "high",
  "battery_level": 85,
  "metadata": {
    "firmware_version": "1.2.3",
    "measurement_location": "wrist"
  }
}
```

### Supported Data Types
- **Numeric**: heart_rate, blood_pressure, glucose, temperature, steps, etc.
- **Boolean**: motion_detected, door_open, panic_button, fall_detected
- **String**: medication_name, alert_message, zone_name
- **Object**: gps_location {lat, lon}, blood_pressure {systolic, diastolic}
- **Array**: activity_timeline, dwell_time_history

---

## Calibration & Setup

### Device Pairing Process
1. **Enable Bluetooth** on the device
2. **Power on** the sensor/device
3. **Open SymBIoT** device discovery
4. **Select device** from list
5. **Confirm pairing** code (if required)
6. **Assign to person** being monitored
7. **Test connection** and data transmission

### Calibration Requirements

#### Blood Pressure Monitors
- Use cuff size appropriate for arm circumference
- Calibrate against manual sphygmomanometer annually
- Perform 3 consecutive readings, use average

#### Glucose Meters
- Code meter with test strip lot (if required)
- Use control solution monthly
- Store strips properly (moisture-free)

#### Indoor Positioning
- Place beacons at known coordinates
- Perform room calibration walk
- Map zones to floor plan
- Verify accuracy (±2 meters acceptable)

#### GPS Trackers
- Perform outdoor GPS lock before first use
- Verify geofence boundaries
- Test alert transmission

---

## Device Compatibility Matrix

| Device Type | Bluetooth | Wi-Fi | Cellular | Cloud API | Battery Life |
|-------------|-----------|-------|----------|-----------|--------------|
| Blood Pressure Monitor | ✅ | ⚠️ | ❌ | ✅ | 6-12 months |
| Glucose Meter | ✅ | ❌ | ❌ | ✅ | 3-6 months |
| Pulse Oximeter | ✅ | ❌ | ❌ | ⚠️ | 1-3 months |
| Fitness Tracker | ✅ | ⚠️ | ❌ | ✅ | 5-7 days |
| Smartwatch | ✅ | ✅ | ✅ | ✅ | 1-2 days |
| Motion Sensor | ✅ | ⚠️ | ❌ | ⚠️ | 1-2 years |
| GPS Tracker | ✅ | ✅ | ✅ | ✅ | 1-7 days |
| Panic Button | ✅ | ❌ | ✅ | ❌ | 1-3 years |

Legend:
- ✅ Fully Supported
- ⚠️ Partially Supported (select models)
- ❌ Not Supported

---

## Minimum Requirements

### Device Requirements
- **Bluetooth**: BLE 4.0 or higher
- **Wi-Fi**: 802.11 b/g/n/ac
- **Cellular**: 3G, 4G LTE, or 5G
- **Battery**: Rechargeable or replaceable
- **Water Resistance**: IP67 minimum (for wearables)

### Gateway/Hub Requirements (Optional)
- Bluetooth 5.0+ support
- Wi-Fi 802.11ac
- Ethernet connection
- USB ports for wired devices
- Cloud connectivity

---

## Future Device Support (Planned)

### Coming Soon
- **ECG Monitors**: AliveCor KardiaMobile, Apple Watch ECG
- **Sleep Apnea Monitors**: ResMed AirSense, Philips DreamStation
- **Medication Dispensers**: MedMinder, Hero Health
- **Smart Beds**: Sleep Number, Eight Sleep
- **Voice Assistants**: Amazon Alexa, Google Assistant integration
- **Video Monitoring**: Integration with smart cameras

---

## Vendor Support & Partnerships

### Certified Partners
- Fitbit (Google)
- Apple HealthKit
- Samsung Health
- Withings
- Garmin
- Philips
- Omron

### Integration Support
For device integration requests or technical support:
- **Email**: device-support@symbiot.care
- **Developer Portal**: https://developers.symbiot.care
- **SDK Documentation**: https://docs.symbiot.care/sdk

---

## Compliance & Certifications

### Medical Device Certifications
- **FDA Clearance**: Class I, II medical devices
- **CE Mark**: European conformity
- **ISO 13485**: Medical device quality management
- **HIPAA Compliant**: Data handling and storage

### Wireless Certifications
- **FCC**: United States
- **CE**: European Union
- **IC**: Canada
- **Bluetooth SIG**: Qualified designs

---

## Troubleshooting

### Common Issues

**Device Not Connecting**
- Verify Bluetooth is enabled
- Ensure device is within range (10 meters)
- Check battery level
- Restart device and gateway

**Intermittent Data**
- Check wireless interference
- Verify gateway placement
- Update device firmware
- Replace batteries

**Inaccurate Readings**
- Recalibrate device
- Check sensor placement
- Verify user profile settings
- Clean sensors

---

## Contact & Support

**Technical Support**: support@symbiot.care
**Device Integration**: device-support@symbiot.care
**Documentation**: https://docs.symbiot.care
**Phone**: +1-800-SYMBIOT

---

*Last Updated: 2025-01-12*
*Version: 1.0.0*
