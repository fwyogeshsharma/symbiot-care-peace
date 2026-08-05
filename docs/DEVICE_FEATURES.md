# Device Features & Health Connect Data Pipeline

Internal engineering reference for how wearable/health devices get data into the app and
what caretakers can see on the web dashboard. This reflects what is **actually wired up in
code today** (verified against source as of 2026-08-02) — for the aspirational/roadmap
device list, see `docs/SUPPORTED_SENSORS.md`, which is marketing language, not as-built fact.

## Contents

1. [Overview](#1-overview)
2. [Devices & Data Sources](#2-devices--data-sources)
3. [Data Flow Architecture](#3-data-flow-architecture)
4. [Device Attribution: `health_source` + `dataOriginFilter`](#4-device-attribution-health_source--dataoriginfilter)
5. [Database Schema](#5-database-schema)
6. [Edge Functions](#6-edge-functions)
7. [Caretaker Web Dashboard — What's Visualized](#7-caretaker-web-dashboard--whats-visualized)
8. [Reports](#8-reports)
9. [Key Files Reference](#9-key-files-reference)
10. [Known Gaps & Caveats](#10-known-gaps--caveats)

---

## 1. Overview

There are **four independent ways** data reaches the `device_data` table, all converging on
the same schema so the dashboard/reports layer doesn't need to know where a reading came from:

| Path | Transport | Example devices |
|---|---|---|
| Android Health Connect | Native read (WorkManager) + web read (Capacitor plugin) | Withings, Samsung Health, Fitbit, Garmin, Zepp, Oura, WHOOP, Mi Fitness, etc. — anything that publishes to Health Connect |
| Direct Bluetooth LE | GATT Heart Rate + Battery services | Generic BLE heart-rate straps/bands |
| Generic API-key ingestion | REST POST with per-device Bearer token | Non-Health-Connect hardware (door/motion/toilet/bed/env sensors, panic buttons); also drives the sample-data simulator |
| Native smartphone sensors | Capacitor plugins, not stored via sync | Battery %, GPS — shown live, falls back to `device_data` on web |

**Withings is not a separate integration.** There is no Withings OAuth/REST client in this
codebase — Withings Health Mate publishes into Android Health Connect like any other app, and
this app reads it exactly the same way it reads Samsung Health or Fitbit data. It is
recognized as a known source (package `com.withings.wiscale2`) purely for labeling in the
device-picker UI.

---

## 2. Devices & Data Sources

### 2a. Android Health Connect (primary path)

The native reader (`HealthConnectReader.kt`) covers the **full 30-record-type catalogue**
Health Connect exposes, deliberately excluding reproductive-health and nutrition records.
Each record becomes one `device_data` row (`data_type`, `value` JSONB, `unit`, `recorded_at`).

| Category | Data types |
|---|---|
| Vitals | `heart_rate` {bpm}, `resting_heart_rate` {bpm}, `heart_rate_variability` {rmssd_ms}, `oxygen_saturation` {%}, `respiratory_rate` {breaths/min}, `blood_pressure` {systolic, diastolic, body_position, measurement_location}, `blood_glucose` {value, unit, meal_type, specimen_source, relation_to_meal}, `body_temperature` {°C}, `basal_body_temperature` {°C} |
| Activity | `steps` {count}, `steps_cadence` {rpm}, `cycling_pedaling_cadence` {rpm}, `distance` {m}, `elevation_gained` {m}, `floors_climbed`, `active_calories`/`total_calories` {kcal}, `speed` {m/s}, `power` {W}, `wheelchair_pushes`, `exercise_session` {type, title, duration}, `hydration` {L} |
| Body composition | `weight`, `height`, `body_fat`, `lean_body_mass`, `bone_mass`, `body_water_mass`, `basal_metabolic_rate` |
| Sleep | `sleep` (nightly summary: duration, `sleep_efficiency_percentage`, `time_asleep_minutes`, `awakenings_count`, per-stage `stage_minutes`, raw `stages` timeline) + `sleep_stage` (one row per stage: awake/light/deep/REM) |

Known writing apps labeled in the device-source picker
(`src/components/pairing/HealthSourcePicker.tsx`): Google Fit, Health Connect, Samsung
Health, Zepp / Zepp Life (Amazfit), Notify for Amazfit, Mi Fitness (Xiaomi), Huawei Health,
OPPO/OnePlus Health, Fitbit, Garmin Connect, **Withings Health Mate**, Polar Flow, Oura,
WHOOP.

Permissions: 28 `android.permission.health.READ_*` entries + 1 background-read permission,
declared in `android/app/src/main/AndroidManifest.xml:98-127` and mirrored in
`src/lib/healthMetrics.ts` (`METRIC_PERMISSIONS`).

### 2b. Direct Bluetooth Low Energy (BLE)

Standard GATT Heart Rate + Battery services. Scanned/connected/read from
`src/lib/capacitor/bluetooth.ts` (foreground, via `useDeviceSync.ts`) and `BleReader.kt`
(background, inside `DeviceSyncWorker.kt`). Produces `heart_rate` readings and updates
`devices.battery_level`. Requires a stored `devices.ble_device_id`, matched by device-name
scan on first pairing.

### 2c. Generic API-key ingestion (`device-ingest` edge function)

For hardware that doesn't publish to Health Connect. The device presents its per-row
`devices.api_key` as a Bearer token to `supabase/functions/device-ingest`. This endpoint also
has a **sample-data simulator** (`generate_sample_data` action, driven by
`device_models.specifications` / `device_type_data_configs`) used for devices without real
hardware wired up yet.

Data types supported: `heart_rate`, `blood_pressure`, `blood_oxygen`/`spo2`, `temperature`,
`steps`, `sleep` (Health-Connect-shaped), `activity`, `calories`, `distance`, `weight`,
`glucose`/`blood_glucose`, `location`/`gps`, `fall_detected`, `respiratory_rate`, `hydration`,
plus environmental/air-quality types: `air_quality`/`purpleair`, `pm1_0`, `pm2_5`, `pm10`,
`humidity`, `pressure`, `aqi`, `co2`, `voc`, `noise`, `light`.

This is also where **alert rules fire** (`checkAlertConditions`) — heart rate, blood pressure,
fall detection, temperature, blood oxygen, and glucose thresholds — writing into the `alerts`
table.

### 2d. Native smartphone sensors (not synced through `device_data` on mobile)

`src/lib/capacitor/device.ts` (battery %, charging status) and `geolocation.ts`
(lat/lon/accuracy/speed/heading), surfaced live on the "Smart Phone" dashboard card via
`usePrioritizedDeviceData` (see `docs/PRIORITIZED_DEVICE_DATA.md`): live Capacitor data when
on the mobile app, falls back to `device_data` (`device_type = 'smart_phone'`) on web.

### 2e. Other device categories (non-Health-Connect)

The admin-managed device catalog (`device_companies` / `device_types` / `device_models`)
also covers categories that ingest via the generic API-key path or the simulator, not Health
Connect: door/motion sensors, cameras, toilet-seat and bed-pad occupancy/pressure sensors,
environmental sensors (temp/humidity/air quality, e.g. PurpleAir), GPS trackers,
emergency/panic buttons, medication dispensers, smart home hubs.

---

## 3. Data Flow Architecture

Two Health Connect sync paths run in parallel and **must stay in lock-step** — both write to
the same table with the same JSONB shape.

### Path A — Foreground (web/JS), runs while the app is open

1. `src/lib/capacitor/healthConnect.ts` reads Health Connect (native bridge preferred, web
   plugin fallback) and normalizes units.
2. `src/hooks/useDeviceSync.ts` (`syncOneViaHealthConnect`) computes the read window
   (stored watermark, or start of today — whichever is later), calls
   `readRecentHealthRecords(since, [device.health_source])`, dedupes by `dataType|time`, and
   **upserts** into `device_data` (`onConflict: 'device_id,data_type,recorded_at'`).
3. Updates `devices.last_sync`, advances the local watermark
   (`StorageKeys.HEALTH_CONNECT_WATERMARK:{deviceId}`), and invalidates the dashboard's React
   Query caches (`vital-metrics`, `steps-today`, `activity-health-metrics`, `device-history`,
   `health-metrics-charts`, `all-health-metrics`).

### Path B — Background (native), runs even when the app is backgrounded

1. `BackgroundSyncPlugin.kt` (Capacitor plugin `BackgroundSync`) receives the Supabase session
   (access + refresh token) and device list from JS via `configure()`; `enable()` schedules
   `DeviceSyncWorker` as periodic `WorkManager` work (minimum 15 min, network-required,
   exponential backoff).
2. `DeviceSyncWorker.kt`, per configured device: reads Health Connect via
   `HealthConnectReader.read()` scoped to that device's `health_source`, reads BLE heart
   rate/battery via `BleReader.kt` if `ble_device_id` is known, builds rows, upserts via
   `SupabaseRest.upsertDeviceData()` (raw PostgREST, `on_conflict=device_id,data_type,recorded_at`,
   `Prefer: resolution=merge-duplicates`), then PATCHes `devices.last_sync`/`battery_level`.
3. `SyncStore.kt` is an `EncryptedSharedPreferences`-backed store for the Supabase session,
   device list, per-device watermark, and enable/last-run/last-result state (surfaced to JS
   via `getStatus()`).
4. `SupabaseRest.kt` auto-refreshes the access token, since the worker can outlive the 1-hour
   token by weeks.

---

## 4. Device Attribution: `health_source` + `dataOriginFilter`

Health Connect is a **single shared store per phone with no per-device identifier** — the
only attribution signal available is `Metadata.dataOrigin`, the package name of the app that
wrote the record. This has real consequences:

- `devices.health_source TEXT` (migration `20260728120000_add_health_source_to_devices.sql`)
  stores the writing-app package name a given `devices` row is bound to (e.g.
  `com.withings.wiscale2`).
- A partial unique index `devices_person_health_source_key` on
  `(elderly_person_id, health_source) WHERE health_source IS NOT NULL` prevents two devices
  for the *same person* claiming the same source. Two different people each using an Amazfit
  is fine — same package, different `elderly_person_id`.
- Every read path passes `health_source` as Health Connect's `dataOriginFilter`. **An empty
  filter is treated by Health Connect as "read all sources"** — both the native and web/JS
  readers explicitly reject/short-circuit on an empty or null filter rather than silently
  reading everything. This was the root cause of readings getting duplicated/misattributed
  across a person's devices before this scheme existed (see comments in
  `HealthConnectReader.kt:46-61`).
- **Discovery**: `dataOrigins()` in `HealthConnectReader.kt` (native, full 30-type scan) and
  `listHealthDataOrigins()` (web, 14-type scan) enumerate packages that have written data in
  the last 30 days, with a record count per source.
- **UI**: `HealthSourcePicker.tsx` shows a per-device dropdown of discovered sources. Sources
  already claimed by the person's other devices are shown disabled ("used by {{device}}"); a
  `23505` unique-violation on save surfaces as "already assigned to another device."
- If a device has no `health_source` mapped, **both sync paths skip Health Connect entirely**
  for it (BLE-only sync still runs) rather than guessing which source it should read.

> Do not read Health Connect with an empty/unset `dataOriginFilter` anywhere in this codebase
> — see `[[health-connect-device-attribution]]` in project memory.

---

## 5. Database Schema

| Table / object | Purpose |
|---|---|
| `devices` | `id, elderly_person_id, device_type, device_name, device_id (unique), location, status, last_sync, battery_level`, plus `company_id`, `model_id`, `ble_device_id`, `health_source` |
| `device_data` | `device_id, elderly_person_id, data_type (CHECK-constrained), value JSONB, unit, recorded_at, created_at` |
| `device_data_device_type_recorded_at_key` | Unique index on `(device_id, data_type, recorded_at)` — the upsert conflict target every sync path relies on; an `UPDATE` RLS policy exists because `ON CONFLICT DO UPDATE` needs it |
| `device_companies` / `device_models` / `device_type_data_configs` | Admin-managed device catalog (`device_models.specifications JSONB`, `supported_data_types TEXT[]`) used by the simulator and `SupportedDevices` page; Withings is a seeded `device_companies` row |
| `device_metric_summary(p_person_id, p_since)` RPC | One exact row per `data_type` (count + latest value/unit/timestamp), computed server-side — added because a capped, newest-first client pull could let a high-frequency metric (heart rate) crowd out a low-frequency one (weight), making it falsely appear "never recorded" |
| Realtime | Enabled (`REPLICA IDENTITY FULL` + `supabase_realtime` publication) on `device_data`, `devices`, `alerts` — `src/pages/Health.tsx` subscribes to `device_data` inserts to raise toast alerts for panic-button presses |

Key migrations: `20251007145703_...` (base schema) →
`20251125100000_add_device_companies.sql` / `20251125110000_add_device_models.sql` (catalog)
→ `20260726090000_add_ble_device_id_to_devices.sql` →
`20260727130000_device_sync_schema.sql` (upsert index/RLS) →
`20260727140000_expand_device_data_types.sql` (full `data_type` CHECK list + JSONB shape
docs) → `20260728120000_add_health_source_to_devices.sql` (attribution) →
`20260728140000_device_metric_summary.sql` (summary RPC).

An untracked `supabase/scripts/insert_sleep_2026-07-21.sql` seeds one realistic sleep session
in the exact `HealthConnectReader.kt`-produced shape, for testing/demoing the sleep pipeline.

---

## 6. Edge Functions (`supabase/functions/`)

| Function | Role |
|---|---|
| `device-ingest` | Generic API-key ingestion, sample-data simulator, alert-condition checks |
| `device-discovery` | BLE/manual device pairing handshake (pairing code, approval flow) |
| `populate-device-configs` | Seeds `device_type_data_configs` |
| `ilq-compute` / `ilq-trend-analyzer` / `ilq-report-generator` | Independent Living Quality score computation, trend analysis, report generation |
| `medication-analytics` | Medication adherence/timing analytics |
| `send-push-notification` / `send-scheduled-report` | Notification and scheduled-report delivery |
| `platform-metrics`, `manage-users`, `nvidia-chat`, `cleanup-unconfirmed-user` | Platform/admin utilities |

---

## 7. Caretaker Web Dashboard — What's Visualized

### Pages

- **`src/pages/Dashboard.tsx`** — customizable caretaker dashboard (widget layout stored in
  `dashboard_layouts`): `VitalMetrics`, `AllHealthMetrics`, `HealthMetricsCharts` (modal),
  `ILQWidget`, `MovementSummary` / `MovementTimeline` / `MovementHeatmap`,
  `DwellTimeAnalysis`, `EnvironmentalSensors`, `MedicationManagement`, `PanicSosEvents`,
  `AlertsList`, `ElderlyList`.
- **`src/pages/Health.tsx`** — stats overview (monitored persons, active alerts, avg heart
  rate, activity level) + `VitalMetrics`, `ToiletHealthInsights`, `MedicationManagement`,
  `EnvironmentalSensors`, `PanicSosEvents`, `AlertsList`. Realtime toast alerts on panic-SOS.
- **`src/pages/DeviceStatusPage.tsx`** — `DeviceSyncPanel` (own profile: HC permissions,
  background sync settings, per-device sync, `HealthSourcePicker`) or
  `PairingApprovalPanel` (viewing someone else), plus `DeviceStatus` (device list, records,
  battery, edit/delete, API key).
- **`src/pages/Reports.tsx`** — 8 report categories, ~19 reports, date-range picker,
  per-person filter, PDF export, scheduled-report subscriptions.
- **`src/pages/SupportedDevices.tsx`** — marketing table of companies/device
  types/pricing/links (Apple, Fitbit, Ring, Withings, Philips, PurpleAir).
- **`src/pages/admin/*`** — `DeviceTypesManagement`, `DeviceModelsManagement`,
  `DeviceTypeDataConfigs` (admin CRUD over the device catalog).

### Key dashboard components (`src/components/dashboard/`)

| Component | What it shows |
|---|---|
| `VitalMetrics.tsx` | Live tile list of the most recent reading per `data_type` — heart rate, blood pressure, SpO2, temperature, glucose, steps (summed for today), sleep (duration + efficiency %), weight, BMI, body fat, humidity, AQI/PM2.5/PM10/CO2/VOC/noise/light, fall detection, medication taken — color-coded by clinical thresholds, refetches every 10s. Opens `HealthMetricsCharts`. |
| `HealthMetricsCharts.tsx` | Modal with Recharts line charts (heart rate, oxygen, temperature °F, sleep-efficiency %, humidity), a dual-line blood-pressure chart (systolic/diastolic), and a bar chart of panic/SOS presses over time. Date-range presets 24h/7d/30d/all with daily or monthly aggregation. |
| `AllHealthMetrics.tsx` | Full catalogue of all 31 Health-Connect-derived metrics, grouped into Vitals/Activity/Sleep/Body/Environment/Other; each tile shows latest value, reading-count badge, a sparkline, and distinguishes "not recorded" from "permission needed." Backed by the `device_metric_summary` RPC. |
| `ActivityHealthMetrics.tsx` | 5 summary cards for a date range: avg heart rate, avg temperature, avg SpO2, total steps, latest BP. |
| `ToiletHealthInsights.tsx` | Restroom-sensor analytics: daily-avg visits, avg duration, night-visit %, extended-session count, auto-generated insights, duration-trend line chart. |
| `DeviceStatus.tsx` / `DeviceManagement.tsx` / `DeviceHistory.tsx` | Device CRUD, API key display/copy, per-device data-point counts, chronological reading history by day. |
| Others | `SmartPhoneCard`, `BedActivity` / `BedActivityGraph`, `BedToiletActivity`, `EnvironmentalSensors`, `ILQWidget` / `ILQHistoryChart` / `ILQInfoDialog`, `MedicationManagement`, `MovementHeatmap` / `MovementSummary` / `MovementTimeline`, `PanicSosCharts` / `PanicSosEvents`, `DwellTimeAnalysis`, `HomeHubCard` |

---

## 8. Reports

`src/pages/Reports.tsx` → `src/components/reports/`

| Category | Reports |
|---|---|
| Daily Summary | End of Day Summary |
| Health Summary | Vital Signs Trends, Health Anomalies (out-of-range HR/BP/SpO2/temp/glucose with severity scoring), Blood Sugar Analysis |
| Activity & Mobility | Daily Activity, Movement Patterns, Fall Incidents |
| Sleep Analysis | Sleep Quality (quality %, duration, disturbances), Sleep Patterns (per-night stage breakdown: deep/light/REM/awake stacked-area chart, sleep-cycle count, avg bedtime) |
| Medication Adherence | Adherence, Timing Analysis |
| Alert Summary | Alert History, Emergency Events, Response Time Analysis |
| Wellness Score | ILQ Score Trends (composite Independent-Living-Quality score), Contributing Factors |
| Comparative Analysis | Week-over-Week, Month-over-Month |

Also present but outside the category list: `AirQualityReport`,
`EnvironmentalComfortReport`, `EnvironmentalSafetyReport`, `BedPadActivity`,
`ToiletSeatActivity`, `ReportViewer` (PDF export), `ReportSubscriptionManager` (scheduled
email reports).

All reports query `device_data` directly with `.in('data_type', [...])` filters and their own
local JSONB-unwrapping helper rather than uniformly using `src/lib/valueExtractor.ts` — this
per-report duplication was the source of the sleep-field drift fixed in commit `e0bfbd2`
("withings added with all the reports"), which moved 7 report components off a synthetic
`sleep_quality`/`quality` field onto the real `sleep_efficiency_percentage` field.

---

## 9. Key Files Reference

**Android native sync**
- `android/app/src/main/java/com/symbiot/care/sync/HealthConnectReader.kt` — full 30-type reader/mapper (source of truth for value shapes)
- `android/app/src/main/java/com/symbiot/care/sync/BackgroundSyncPlugin.kt` — Capacitor bridge
- `android/app/src/main/java/com/symbiot/care/sync/DeviceSyncWorker.kt` — WorkManager periodic job
- `android/app/src/main/java/com/symbiot/care/sync/SyncStore.kt` — encrypted session/device/watermark store
- `android/app/src/main/java/com/symbiot/care/sync/SupabaseRest.kt` — raw PostgREST client with token refresh
- `android/app/src/main/java/com/symbiot/care/sync/BleReader.kt` — BLE heart-rate/battery reader
- `android/app/src/main/AndroidManifest.xml:90-128` — Health Connect permission declarations

**Web/Capacitor bridge**
- `src/lib/capacitor/healthConnect.ts` — web Health Connect plugin wrapper (14-type fallback) + `listHealthDataOrigins`
- `src/lib/capacitor/backgroundSync.ts` — JS↔native `BackgroundSync` plugin wrapper
- `src/hooks/useDeviceSync.ts` — foreground BLE + Health Connect sync orchestration
- `src/components/pairing/HealthSourcePicker.tsx` — per-device source picker UI
- `src/components/pairing/HealthPermissionsPanel.tsx` — HC permission grant/status UI
- `src/components/pairing/DeviceSyncPanel.tsx` — device sync settings screen
- `src/components/pairing/DeviceDiscovery.tsx` — BLE/manual pairing flow
- `src/lib/healthMetrics.ts` — `METRIC_REGISTRY`, `SYNCED_METRICS` (31 types), `METRIC_PERMISSIONS`
- `src/lib/valueExtractor.ts`, `src/lib/deviceDataMapping.ts` — JSONB value extraction & categorization

**Supabase backend**
- `supabase/functions/device-ingest/index.ts` — generic ingestion + simulator + alerting
- `supabase/functions/device-discovery/index.ts`, `populate-device-configs/index.ts`
- `supabase/migrations/20251007145703_...sql` — base `devices`/`device_data` schema
- `supabase/migrations/20260727130000_device_sync_schema.sql` — upsert index, dedupe, RLS
- `supabase/migrations/20260727140000_expand_device_data_types.sql` — full `data_type` CHECK list
- `supabase/migrations/20260728120000_add_health_source_to_devices.sql` — attribution column + unique index
- `supabase/migrations/20260728140000_device_metric_summary.sql` — per-metric summary RPC
- `supabase/migrations/20251125100000_add_device_companies.sql`, `20251125110000_add_device_models.sql` — device catalog
- `supabase/scripts/insert_sleep_2026-07-21.sql` (untracked) — manual sleep-session seed script

**Web dashboard/reports**
- `src/pages/Dashboard.tsx`, `Health.tsx`, `DeviceStatusPage.tsx`, `Reports.tsx`, `SupportedDevices.tsx`
- `src/components/dashboard/VitalMetrics.tsx`, `AllHealthMetrics.tsx`, `HealthMetricsCharts.tsx`, `ActivityHealthMetrics.tsx`, `ToiletHealthInsights.tsx`, `DeviceStatus.tsx`, `DeviceManagement.tsx`, `DeviceHistory.tsx`
- `src/components/reports/` — all report components listed in §8

---

## 10. Known Gaps & Caveats

- **Web Capacitor plugin lags the native reader.** `@pianissimoproject/capacitor-health-connect`
  (used in `src/lib/capacitor/healthConnect.ts`) only models **14 of the 30** record types —
  no sleep, distance, HRV, total calories, exercise sessions, cadence, power, hydration, or
  most body-composition types. The native path (`BackgroundSyncPlugin` / `HealthConnectReader`)
  is preferred whenever available; the web plugin is a fallback only. Don't assume web-only
  testing exercises the full data surface.
- **`docs/SUPPORTED_SENSORS.md` is aspirational**, listing devices (Omron, iHealth, Qardio,
  Dexcom, FreeStyle Libre, Nonin, Masimo, Apple Watch, Philips Lifeline, SmartThings, Aqara,
  Awair, AirThings, AirTag, Tile, etc.) that are not wired into code today. Cross-check any
  device name against this document before citing it as "supported."
- **Report components each roll their own JSONB extraction** instead of uniformly using
  `src/lib/valueExtractor.ts`. When adding a new report or data type, prefer the shared
  extractor to avoid repeating the sleep-field drift bug fixed in `e0bfbd2`.
- **Never read Health Connect with an empty `health_source` / `dataOriginFilter`.** Both sync
  paths intentionally skip a device rather than fall back to reading all sources — see §4.
