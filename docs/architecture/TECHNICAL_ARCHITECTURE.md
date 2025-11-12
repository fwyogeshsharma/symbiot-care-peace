# SymBIoT Platform - Technical Architecture Documentation

## Document Information
- **Version**: 1.0.0
- **Last Updated**: 2025-01-12
- **Status**: Active
- **Audience**: Developers, System Architects, DevOps Engineers

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architecture Principles](#architecture-principles)
4. [Technology Stack](#technology-stack)
5. [System Architecture](#system-architecture)
6. [Component Details](#component-details)
7. [Data Architecture](#data-architecture)
8. [Security Architecture](#security-architecture)
9. [Integration Architecture](#integration-architecture)
10. [Deployment Architecture](#deployment-architecture)
11. [Performance & Scalability](#performance--scalability)
12. [Monitoring & Observability](#monitoring--observability)

---

## Executive Summary

### Purpose
SymBIoT is a comprehensive elderly care monitoring platform that provides real-time health monitoring, activity tracking, location services, and alert management for elderly persons and their caregivers.

### Key Capabilities
- Real-time vital signs monitoring (heart rate, blood pressure, oxygen saturation, etc.)
- Indoor positioning with floor plans and outdoor GPS tracking
- Activity pattern analysis and dwell time monitoring
- Intelligent alert system with multiple severity levels
- Multi-device support and integration
- Role-based access control and data sharing
- Advanced analytics and reporting

### Architecture Approach
- **Frontend**: Modern React-based Single Page Application (SPA)
- **Backend**: Supabase (PostgreSQL + REST API + Real-time subscriptions)
- **Infrastructure**: Cloud-native, serverless architecture
- **Integration**: RESTful APIs, WebSocket, Bluetooth, IoT protocols

---

## System Overview

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Client Layer                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Web App    │  │  Mobile App  │  │   Tablet     │             │
│  │  (React/TS)  │  │  (Planned)   │  │   (React)    │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│         │                  │                  │                      │
└─────────┼──────────────────┼──────────────────┼──────────────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                            │
┌───────────────────────────┼───────────────────────────────────────────┐
│                    API Gateway Layer                                  │
├───────────────────────────┼───────────────────────────────────────────┤
│                           │                                           │
│               ┌───────────▼──────────┐                               │
│               │   Supabase API       │                               │
│               │  (Auto-generated)    │                               │
│               └──────────┬───────────┘                               │
│                          │                                           │
└──────────────────────────┼───────────────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────────────┐
│                  Application Layer                                    │
├──────────────────────────┼───────────────────────────────────────────┤
│                          │                                           │
│  ┌──────────────────┐   │   ┌──────────────────┐                   │
│  │  Auth Service    │◄──┴──►│  Query Service   │                   │
│  │  (Supabase Auth) │       │  (React Query)   │                   │
│  └──────────────────┘       └──────────────────┘                   │
│                                                                      │
│  ┌──────────────────┐       ┌──────────────────┐                   │
│  │  Real-time Subs  │       │  File Storage    │                   │
│  │  (WebSocket)     │       │  (Supabase)      │                   │
│  └──────────────────┘       └──────────────────┘                   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────────────┐
│                   Data Layer                                          │
├──────────────────────────┼───────────────────────────────────────────┤
│                          │                                           │
│               ┌──────────▼──────────┐                               │
│               │   PostgreSQL DB     │                               │
│               │   (Supabase)        │                               │
│               └─────────────────────┘                               │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────────────┐
│                 Device/IoT Layer                                      │
├──────────────────────────┼───────────────────────────────────────────┤
│                          │                                           │
│  ┌──────────┐  ┌─────────┐  ┌──────────┐  ┌──────────┐            │
│  │ Wearables│  │ Health  │  │ Environ. │  │  GPS     │            │
│  │ (BLE)    │  │ Monitors│  │ Sensors  │  │ Trackers │            │
│  └──────────┘  └─────────┘  └──────────┘  └──────────┘            │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Architecture Principles

### 1. Modularity
- Loosely coupled components
- Clear separation of concerns
- Reusable modules and components

### 2. Scalability
- Horizontal scaling capability
- Stateless application design
- Database optimization and indexing

### 3. Security
- Defense in depth approach
- End-to-end encryption
- Role-based access control (RBAC)
- HIPAA compliance considerations

### 4. Reliability
- High availability (99.9% uptime target)
- Graceful degradation
- Comprehensive error handling
- Data redundancy and backups

### 5. Performance
- Sub-second response times
- Efficient data queries
- Client-side caching
- CDN for static assets

### 6. Maintainability
- Clean code practices
- Comprehensive documentation
- Automated testing
- Continuous integration/deployment

---

## Technology Stack

### Frontend
```json
{
  "framework": "React 18.3.1",
  "language": "TypeScript 5.8.3",
  "build_tool": "Vite 5.4.19",
  "ui_library": "Radix UI + shadcn/ui",
  "styling": "Tailwind CSS 3.4.17",
  "state_management": "React Query (TanStack Query 5.83.0)",
  "routing": "React Router DOM 6.30.1",
  "forms": "React Hook Form 7.61.1 + Zod 3.25.76",
  "charts": "Recharts 2.15.4",
  "maps": "@react-google-maps/api 2.20.7",
  "canvas": "Fabric.js 6.7.1",
  "notifications": "Sonner 1.7.4",
  "tours": "React Joyride 2.9.3"
}
```

### Backend / BaaS
```json
{
  "provider": "Supabase",
  "database": "PostgreSQL 15+",
  "auth": "Supabase Auth (JWT)",
  "api": "Auto-generated REST API + GraphQL",
  "realtime": "WebSocket (Phoenix Channels)",
  "storage": "Supabase Storage (S3-compatible)",
  "functions": "Edge Functions (Deno)"
}
```

### Development Tools
```json
{
  "package_manager": "npm",
  "linter": "ESLint 9.32.0",
  "code_formatter": "Prettier (via ESLint)",
  "version_control": "Git",
  "ci_cd": "GitHub Actions / Supabase CLI"
}
```

### Third-Party Integrations
```json
{
  "maps": "Google Maps API",
  "device_apis": [
    "Fitbit Web API",
    "Apple HealthKit",
    "Google Fit API",
    "Samsung Health SDK"
  ],
  "notifications": "Browser Push Notifications API",
  "analytics": "Supabase Analytics"
}
```

---

## System Architecture

### 1. Client Architecture (Frontend)

#### Component Structure
```
src/
├── components/
│   ├── ui/                  # Base UI components (shadcn)
│   ├── dashboard/           # Dashboard-specific components
│   ├── floor-plan/          # Floor plan editor components
│   ├── indoor-tracking/     # Indoor positioning components
│   ├── outdoor-tracking/    # GPS and geofence components
│   ├── help/                # Help system components
│   ├── layout/              # Layout components (Header, etc.)
│   └── pairing/             # Device pairing components
├── pages/                   # Page-level components (routes)
├── contexts/                # React Context providers
├── hooks/                   # Custom React hooks
├── lib/                     # Utility functions and helpers
├── data/                    # Static data (help content, tours)
├── integrations/            # External service integrations
│   └── supabase/            # Supabase client & types
└── App.tsx                  # Root application component
```

#### State Management Strategy
- **Server State**: React Query for data fetching, caching, synchronization
- **UI State**: React useState, useReducer for local component state
- **Global State**: React Context for auth, theme, user preferences
- **Form State**: React Hook Form with Zod validation

#### Routing Structure
```typescript
/                          → Landing/Login
/dashboard                 → Main Dashboard
/activity                  → Activity Monitoring (legacy redirect)
/movement-dashboard        → Movement Dashboard (dwell time, ideal profiles)
/tracking                  → Indoor/Outdoor Tracking
/floor-plan-management     → Floor Plan CRUD
/floor-plan-editor/:personId/:planId  → Floor Plan Editor
/alerts                    → Alert Management
/device-status             → Device Monitoring
/data-sharing              → Data Sharing Management
/profile                   → User Profile & Settings
/admin/users               → User Management (admin only)
/admin/device-types        → Device Type Configuration (admin only)
```

---

### 2. API Architecture

#### REST API Endpoints (Auto-generated by Supabase)

**Authentication**
```
POST   /auth/v1/signup           - User registration
POST   /auth/v1/token            - Login (get JWT)
POST   /auth/v1/logout           - Logout
GET    /auth/v1/user             - Get current user
PUT    /auth/v1/user             - Update user profile
POST   /auth/v1/recover          - Password recovery
```

**Data Tables**
```
GET    /rest/v1/elderly_persons          - List elderly persons
POST   /rest/v1/elderly_persons          - Create elderly person
GET    /rest/v1/elderly_persons/{id}     - Get elderly person
PATCH  /rest/v1/elderly_persons/{id}     - Update elderly person
DELETE /rest/v1/elderly_persons/{id}     - Delete elderly person

GET    /rest/v1/devices                  - List devices
POST   /rest/v1/devices                  - Register device
GET    /rest/v1/devices/{id}             - Get device
PATCH  /rest/v1/devices/{id}             - Update device
DELETE /rest/v1/devices/{id}             - Delete device

GET    /rest/v1/device_data              - Query device data
POST   /rest/v1/device_data              - Insert device data (bulk)

GET    /rest/v1/alerts                   - List alerts
POST   /rest/v1/alerts                   - Create alert
PATCH  /rest/v1/alerts/{id}              - Acknowledge/update alert

GET    /rest/v1/floor_plans              - List floor plans
POST   /rest/v1/floor_plans              - Create floor plan
PATCH  /rest/v1/floor_plans/{id}         - Update floor plan
DELETE /rest/v1/floor_plans/{id}         - Delete floor plan

GET    /rest/v1/geofence_places          - List geofence places
POST   /rest/v1/geofence_places          - Create geofence
PATCH  /rest/v1/geofence_places/{id}     - Update geofence
DELETE /rest/v1/geofence_places/{id}     - Delete geofence

GET    /rest/v1/geofence_events          - List geofence events
POST   /rest/v1/geofence_events          - Log geofence event
```

**RPC Functions**
```
POST   /rest/v1/rpc/get_accessible_elderly_persons  - Get persons user can access
POST   /rest/v1/rpc/check_user_access              - Check access to specific person
POST   /rest/v1/rpc/get_device_history             - Get device data history
POST   /rest/v1/rpc/get_alert_statistics           - Get alert analytics
POST   /rest/v1/rpc/calculate_dwell_time           - Calculate dwell time for zones
```

#### Real-time Subscriptions (WebSocket)
```typescript
// Subscribe to device data updates
supabase
  .channel('device-data-changes')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'device_data',
    filter: `elderly_person_id=eq.${personId}`
  }, (payload) => {
    // Handle real-time data update
  })
  .subscribe();

// Subscribe to alert updates
supabase
  .channel('alert-changes')
  .on('postgres_changes', {
    event: '*',  // INSERT, UPDATE, DELETE
    schema: 'public',
    table: 'alerts'
  }, (payload) => {
    // Handle alert update
  })
  .subscribe();
```

---

### 3. Data Architecture

#### Database Schema

**Core Tables**

```sql
-- Users (managed by Supabase Auth)
auth.users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  encrypted_password TEXT,
  email_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- User profiles and roles
public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  role TEXT CHECK (role IN ('administrator', 'family_member', 'healthcare_provider')),
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- Elderly persons being monitored
public.elderly_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- Access control (who can view which elderly person)
public.elderly_person_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_person_id UUID REFERENCES elderly_persons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship TEXT,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  UNIQUE(elderly_person_id, user_id)
)

-- Devices
public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_person_id UUID REFERENCES elderly_persons(id) ON DELETE CASCADE,
  device_identifier TEXT NOT NULL,
  device_name TEXT,
  device_type TEXT NOT NULL,  -- 'wearable', 'health_monitor', 'sensor', 'gps', 'panic_button'
  manufacturer TEXT,
  model TEXT,
  firmware_version TEXT,
  battery_level INTEGER CHECK (battery_level BETWEEN 0 AND 100),
  status TEXT CHECK (status IN ('online', 'offline', 'pairing', 'error')),
  last_seen_at TIMESTAMPTZ,
  paired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- Device data (time-series data)
public.device_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  elderly_person_id UUID REFERENCES elderly_persons(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL,  -- 'heart_rate', 'blood_pressure', 'steps', 'position', 'gps', etc.
  value JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_device_data_person_type_time (elderly_person_id, data_type, recorded_at DESC),
  INDEX idx_device_data_device_time (device_id, recorded_at DESC)
)

-- Alerts
public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_person_id UUID REFERENCES elderly_persons(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,  -- 'vital_signs', 'panic_sos', 'device_offline', 'geofence', 'inactivity', 'dwell_time'
  severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('active', 'acknowledged', 'resolved')),
  triggered_at TIMESTAMPTZ NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_alerts_person_status (elderly_person_id, status),
  INDEX idx_alerts_severity (severity, triggered_at DESC)
)

-- Floor plans for indoor tracking
public.floor_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_person_id UUID REFERENCES elderly_persons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  width NUMERIC NOT NULL,  -- in meters
  height NUMERIC NOT NULL,  -- in meters
  grid_size NUMERIC DEFAULT 1.0,
  zones JSONB DEFAULT '[]',  -- Array of zone definitions
  furniture JSONB DEFAULT '[]',  -- Array of furniture items
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- Geofence places for outdoor tracking
public.geofence_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_person_id UUID REFERENCES elderly_persons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  radius NUMERIC NOT NULL,  -- in meters
  is_active BOOLEAN DEFAULT TRUE,
  alert_on_entry BOOLEAN DEFAULT FALSE,
  alert_on_exit BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- Geofence events (entry/exit logs)
public.geofence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_person_id UUID REFERENCES elderly_persons(id) ON DELETE CASCADE,
  geofence_place_id UUID REFERENCES geofence_places(id) ON DELETE CASCADE,
  event_type TEXT CHECK (event_type IN ('entry', 'exit')),
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_geofence_events_person_time (elderly_person_id, timestamp DESC)
)

-- Medications
public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_person_id UUID REFERENCES elderly_persons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  start_date DATE,
  end_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- Ideal activity profiles
public.ideal_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elderly_person_id UUID REFERENCES elderly_persons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  profile_data JSONB NOT NULL,  -- Zone dwell times with min/max thresholds
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- Device type configurations (for admin)
public.device_type_data_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_type TEXT UNIQUE NOT NULL,
  supported_data_types JSONB NOT NULL,  -- Array of data type configurations
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

#### Data Access Patterns

**Row Level Security (RLS) Policies**
```sql
-- Example: Users can only access elderly persons they have been granted access to
CREATE POLICY "Users can view accessible elderly persons"
  ON elderly_persons FOR SELECT
  USING (
    id IN (
      SELECT elderly_person_id
      FROM elderly_person_access
      WHERE user_id = auth.uid()
    )
  );

-- Example: Only administrators can manage all users
CREATE POLICY "Admins can manage users"
  ON user_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'administrator'
    )
  );
```

#### Indexes for Performance
```sql
-- Frequently queried time-series data
CREATE INDEX idx_device_data_person_type_time
  ON device_data (elderly_person_id, data_type, recorded_at DESC);

-- Alert queries
CREATE INDEX idx_alerts_person_status_time
  ON alerts (elderly_person_id, status, triggered_at DESC);

-- Geofence event history
CREATE INDEX idx_geofence_events_place_time
  ON geofence_events (geofence_place_id, timestamp DESC);
```

---

## Security Architecture

### 1. Authentication & Authorization

**Authentication Flow**
```
1. User enters email/password
2. Frontend sends POST /auth/v1/token
3. Supabase Auth validates credentials
4. Returns JWT access token + refresh token
5. Frontend stores tokens (httpOnly cookies recommended)
6. All API requests include JWT in Authorization header
```

**JWT Token Structure**
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "authenticated",
  "iat": 1642000000,
  "exp": 1642003600,
  "aud": "authenticated"
}
```

**Role-Based Access Control**
```typescript
enum UserRole {
  ADMINISTRATOR = 'administrator',
  FAMILY_MEMBER = 'family_member',
  HEALTHCARE_PROVIDER = 'healthcare_provider'
}

// Access matrix
{
  administrator: ['*'],  // Full access
  family_member: [
    'view_vitals',
    'view_location',
    'view_alerts',
    'acknowledge_alerts',
    'manage_devices',
    'grant_access'
  ],
  healthcare_provider: [
    'view_vitals',
    'view_medical_history',
    'view_alerts',
    'acknowledge_alerts',
    'view_analytics'
  ]
}
```

### 2. Data Security

**Encryption**
- **At Rest**: AES-256 encryption for database (Supabase managed)
- **In Transit**: TLS 1.3 for all API communications
- **Sensitive Fields**: Additional application-level encryption for PII

**Data Privacy**
- GDPR compliant data handling
- Right to access, modify, delete personal data
- Data retention policies
- Audit logs for data access

**HIPAA Considerations**
- Secure data storage and transmission
- Access logs and audit trails
- User authentication and authorization
- Data backup and disaster recovery

---

## Integration Architecture

### 1. Device Integration

**Bluetooth Low Energy (BLE) Integration**
```javascript
// Web Bluetooth API
const connectDevice = async () => {
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: ['heart_rate', 'battery_service']
  });

  const server = await device.gatt.connect();
  const service = await server.getPrimaryService('heart_rate');
  const characteristic = await service.getCharacteristic('heart_rate_measurement');

  await characteristic.startNotifications();
  characteristic.addEventListener('characteristicvaluechanged', handleHeartRate);
};
```

**Cloud API Integration**
```javascript
// Example: Fitbit API
const getFitbitData = async (accessToken, date) => {
  const response = await fetch(
    `https://api.fitbit.com/1/user/-/activities/date/${date}.json`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  return response.json();
};
```

### 2. External Service Integration

**Google Maps API**
```javascript
import { GoogleMap, Marker, Polyline, Circle } from '@react-google-maps/api';

<GoogleMap
  center={center}
  zoom={15}
  options={mapOptions}
>
  <Marker position={currentPosition} />
  <Polyline path={gpsTrail} />
  <Circle center={geofence.center} radius={geofence.radius} />
</GoogleMap>
```

---

## Deployment Architecture

### Infrastructure

**Hosting**
- **Frontend**: Vercel / Netlify / AWS S3 + CloudFront
- **Backend**: Supabase Cloud (managed PostgreSQL, Edge Functions)
- **CDN**: CloudFlare / AWS CloudFront for static assets
- **DNS**: CloudFlare DNS

**Environments**
```
Development   → localhost:5173 + Supabase Dev Project
Staging       → staging.symbiot.care + Supabase Staging Project
Production    → symbiot.care + Supabase Production Project
```

### CI/CD Pipeline

**Build & Deploy Workflow**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm ci
      - run: npm run build
      - run: npm run lint

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## Performance & Scalability

### Performance Targets
- **Page Load Time**: < 2 seconds (initial)
- **Time to Interactive**: < 3 seconds
- **API Response Time**: < 200ms (95th percentile)
- **Real-time Latency**: < 100ms (WebSocket)

### Scalability Strategies

**Database Optimization**
- Appropriate indexes on frequently queried columns
- Partitioning for time-series data (device_data table)
- Materialized views for complex analytics
- Connection pooling (PgBouncer)

**Caching Strategy**
```typescript
// React Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,  // 30 seconds
      cacheTime: 300000,  // 5 minutes
      refetchOnWindowFocus: true,
      retry: 2
    }
  }
});

// Cache specific queries longer
useQuery(['elderly-persons', userId], fetchElderlyPersons, {
  staleTime: 60000  // 1 minute
});
```

**Code Splitting**
```typescript
// Lazy load pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Tracking = lazy(() => import('./pages/Tracking'));
const FloorPlanEditor = lazy(() => import('./pages/FloorPlanEditor'));
```

---

## Monitoring & Observability

### Application Monitoring

**Metrics to Track**
- Request rate and latency
- Error rate and types
- Database query performance
- Real-time connection count
- Device data ingestion rate
- Alert generation rate

**Logging**
```typescript
// Structured logging
console.log({
  level: 'info',
  timestamp: new Date().toISOString(),
  message: 'Device data received',
  context: {
    deviceId,
    dataType,
    elderlyPersonId
  }
});
```

**Error Tracking**
- Sentry / Rollbar for frontend error tracking
- Supabase logs for backend errors
- Custom error boundaries in React

**Health Checks**
```
GET /health
Response: {
  "status": "healthy",
  "database": "connected",
  "storage": "available",
  "timestamp": "2025-01-12T10:30:00Z"
}
```

---

## Disaster Recovery

### Backup Strategy
- **Database**: Daily automated backups (Supabase managed)
- **Storage**: S3 versioning enabled
- **Point-in-Time Recovery**: Available up to 7 days

### Business Continuity
- **RTO (Recovery Time Objective)**: 1 hour
- **RPO (Recovery Point Objective)**: 15 minutes
- **Failover**: Automatic (Supabase infrastructure)

---

## Future Enhancements

### Planned Improvements
1. **Mobile Native Apps**: iOS and Android applications
2. **Advanced ML/AI**: Predictive health analytics
3. **Voice Integration**: Alexa/Google Assistant support
4. **Video Monitoring**: Camera integration for visual monitoring
5. **Medication Dispensers**: Smart dispenser integration
6. **Telemedicine**: Video consultation feature
7. **Multi-language Support**: i18n implementation
8. **Offline Mode**: Progressive Web App (PWA) capabilities

---

## Appendix

### Glossary
- **BLE**: Bluetooth Low Energy
- **RLS**: Row Level Security
- **JWT**: JSON Web Token
- **RBAC**: Role-Based Access Control
- **SPA**: Single Page Application
- **BaaS**: Backend as a Service

### References
- React Documentation: https://react.dev
- Supabase Documentation: https://supabase.com/docs
- Tailwind CSS: https://tailwindcss.com/docs
- Web Bluetooth API: https://web.dev/bluetooth

---

*Document Version: 1.0.0*
*Last Updated: 2025-01-12*
*Maintained by: SymBIoT Engineering Team*
