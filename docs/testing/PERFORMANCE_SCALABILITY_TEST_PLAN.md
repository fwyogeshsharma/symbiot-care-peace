# SymBIoT Platform - Performance & Scalability Test Plan

## Document Information
- **Version**: 1.0.0
- **Last Updated**: 2025-01-12
- **Test Lead**: Performance Engineering Team
- **Status**: Active

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Performance Objectives](#performance-objectives)
3. [Test Types](#test-types)
4. [Test Environment & Tools](#test-environment--tools)
5. [Test Scenarios](#test-scenarios)
6. [Load Profiles](#load-profiles)
7. [Performance Metrics](#performance-metrics)
8. [Scalability Testing](#scalability-testing)
9. [Simulation TestBed Setup](#simulation-testbed-setup)
10. [Baseline & Benchmarks](#baseline--benchmarks)
11. [Reporting & Analysis](#reporting--analysis)

---

## Executive Summary

### Purpose
This document outlines the performance and scalability testing strategy for the SymBIoT platform, ensuring the system can handle expected load and scale gracefully under stress.

### Scope
- Web application performance (frontend)
- API performance (backend)
- Database performance
- Real-time data streaming performance
- System scalability under load
- Resource utilization
- Bottleneck identification

### Success Criteria
- ✅ Page load time < 2 seconds (95th percentile)
- ✅ API response time < 200ms (95th percentile)
- ✅ Real-time update latency < 100ms
- ✅ Support 10,000 concurrent users
- ✅ Support 100,000+ device data points per minute
- ✅ Zero data loss under load
- ✅ System recovers gracefully from stress

---

## Performance Objectives

### Response Time Targets

| Operation | Target (p95) | Maximum (p99) | Critical |
|-----------|--------------|---------------|----------|
| Page Load (Initial) | 2s | 3s | 5s |
| Page Load (Cached) | 1s | 1.5s | 2s |
| API GET Request | 200ms | 500ms | 1s |
| API POST Request | 300ms | 600ms | 1.5s |
| Database Query | 100ms | 200ms | 500ms |
| Real-time Update | 100ms | 200ms | 500ms |
| Alert Generation | 5s | 10s | 30s |
| Report Generation | 10s | 20s | 60s |

### Throughput Targets

| Metric | Target | Peak |
|--------|--------|------|
| API Requests/sec | 1,000 | 2,000 |
| Device Data Ingestion/sec | 1,000 | 2,500 |
| Concurrent WebSocket Connections | 5,000 | 10,000 |
| Database Transactions/sec | 500 | 1,000 |

### Resource Utilization Targets

| Resource | Normal Load | Peak Load | Critical |
|----------|-------------|-----------|----------|
| CPU Usage | < 50% | < 70% | < 90% |
| Memory Usage | < 60% | < 75% | < 85% |
| Database Connections | < 50 | < 80 | < 100 |
| Network Bandwidth | < 100 Mbps | < 500 Mbps | < 1 Gbps |

---

## Test Types

### 1. Load Testing
**Purpose**: Verify system behavior under expected load
**Duration**: 2-4 hours
**Load Pattern**: Gradual ramp-up to target load, sustained period

### 2. Stress Testing
**Purpose**: Determine breaking point and recovery
**Duration**: 1-2 hours
**Load Pattern**: Ramp beyond normal capacity until failure

### 3. Spike Testing
**Purpose**: Test sudden traffic spikes
**Duration**: 30 minutes
**Load Pattern**: Sudden increase to 5x normal load

### 4. Endurance/Soak Testing
**Purpose**: Identify memory leaks and degradation over time
**Duration**: 24-48 hours
**Load Pattern**: Sustained normal load

### 5. Scalability Testing
**Purpose**: Measure scaling efficiency
**Duration**: Variable
**Load Pattern**: Incremental load increases

### 6. Volume Testing
**Purpose**: Test large data volumes
**Duration**: 2-4 hours
**Focus**: Database performance with millions of records

### 7. Concurrency Testing
**Purpose**: Test simultaneous operations
**Duration**: 1-2 hours
**Focus**: Race conditions, deadlocks

---

## Test Environment & Tools

### Infrastructure
```yaml
Frontend Testing:
  - CDN: CloudFlare (production-like)
  - Hosting: Vercel (production environment)
  - Client Machines: Various geographic locations

Backend Testing:
  - Database: Supabase Production Tier (or equivalent)
  - API Gateway: Supabase Kong
  - Region: Multi-region (US, EU)

Load Generators:
  - Cloud VMs: AWS EC2 (multiple regions)
  - Specs: 4 vCPU, 8GB RAM per instance
  - Count: 10 instances for full-scale tests
```

### Testing Tools

#### Frontend Performance
```json
{
  "lighthouse": {
    "version": "11.x",
    "purpose": "Web vitals, performance score",
    "metrics": ["FCP", "LCP", "TBT", "CLS", "TTI"]
  },
  "webpagetest": {
    "purpose": "Detailed waterfall analysis",
    "features": ["Video capture", "Resource timing", "Network throttling"]
  },
  "chrome_devtools": {
    "purpose": "Profiling, network analysis",
    "features": ["Performance tab", "Network tab", "Coverage"]
  }
}
```

#### API & Backend Performance
```json
{
  "k6": {
    "version": "0.48.x",
    "purpose": "Load testing APIs",
    "scripting": "JavaScript",
    "features": ["Thresholds", "Checks", "Custom metrics"]
  },
  "artillery": {
    "version": "2.0.x",
    "purpose": "Load testing, scenarios",
    "config": "YAML",
    "features": ["Scenarios", "Plugins", "Socket.io support"]
  },
  "apache_jmeter": {
    "version": "5.6.x",
    "purpose": "Complex load scenarios",
    "features": ["GUI", "Distributed testing", "Extensive protocols"]
  }
}
```

#### Monitoring & Observability
```json
{
  "grafana": "Metrics visualization",
  "prometheus": "Time-series metrics",
  "supabase_analytics": "Built-in analytics",
  "sentry": "Error tracking",
  "datadog": "Full-stack observability (optional)"
}
```

#### Database Performance
```sql
-- PostgreSQL monitoring tools
pg_stat_statements  -- Query performance
pg_stat_activity    -- Active connections
EXPLAIN ANALYZE     -- Query plans
```

---

## Test Scenarios

### Scenario 1: User Login & Dashboard Load

**Objective**: Measure authentication and initial page load performance

**Test Flow**:
1. Navigate to login page
2. Submit credentials
3. Wait for JWT token
4. Redirect to dashboard
5. Wait for dashboard data load
6. Measure total time

**Load Profile**:
- Users: 1,000 concurrent
- Duration: 30 minutes
- Think Time: 5-10 seconds

**Expected Results**:
- Login response < 500ms (p95)
- Dashboard load < 2s (p95)
- Success rate > 99.5%

**k6 Script**:
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 1000,
  duration: '30m',
  thresholds: {
    'http_req_duration{endpoint:login}': ['p(95)<500'],
    'http_req_duration{endpoint:dashboard}': ['p(95)<2000'],
    'http_req_failed': ['rate<0.01'],
  },
};

export default function () {
  // Login
  const loginRes = http.post('https://api.symbiot.care/auth/v1/token', {
    email: 'test@example.com',
    password: 'SecurePass123!',
  }, {
    tags: { endpoint: 'login' },
  });

  check(loginRes, {
    'login status 200': (r) => r.status === 200,
    'has access token': (r) => r.json('access_token') !== undefined,
  });

  const token = loginRes.json('access_token');

  // Load Dashboard
  const dashboardRes = http.get('https://api.symbiot.care/rest/v1/elderly_persons', {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { endpoint: 'dashboard' },
  });

  check(dashboardRes, {
    'dashboard status 200': (r) => r.status === 200,
    'has data': (r) => r.json().length > 0,
  });

  sleep(Math.random() * 5 + 5); // 5-10s think time
}
```

---

### Scenario 2: Device Data Ingestion

**Objective**: Test system capacity for device data streaming

**Test Flow**:
1. Simulate multiple devices
2. Send device data at configured intervals
3. Measure ingestion rate
4. Verify data persistence

**Load Profile**:
- Devices: 10,000 simulated devices
- Data Rate: 1 data point per device per 30 seconds
- Peak Rate: ~333 data points/second
- Duration: 1 hour

**Expected Results**:
- Data ingestion latency < 200ms (p95)
- Zero data loss
- Database write throughput > 500 TPS

**k6 Script**:
```javascript
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  scenarios: {
    device_simulation: {
      executor: 'constant-arrival-rate',
      rate: 333,
      timeUnit: '1s',
      duration: '1h',
      preAllocatedVUs: 100,
      maxVUs: 500,
    },
  },
  thresholds: {
    'http_req_duration{endpoint:device_data}': ['p(95)<200'],
    'http_req_failed': ['rate<0.001'],
  },
};

const DEVICE_IDS = Array.from({ length: 10000 }, (_, i) => `device-${i}`);

export default function () {
  const deviceId = DEVICE_IDS[Math.floor(Math.random() * DEVICE_IDS.length)];

  const payload = JSON.stringify({
    device_id: deviceId,
    data_type: 'heart_rate',
    value: { bpm: Math.floor(Math.random() * 40) + 60 }, // 60-100 BPM
    recorded_at: new Date().toISOString(),
  });

  const res = http.post('https://api.symbiot.care/rest/v1/device_data', payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.AUTH_TOKEN}`,
    },
    tags: { endpoint: 'device_data' },
  });

  check(res, {
    'status 201': (r) => r.status === 201,
    'response time OK': (r) => r.timings.duration < 500,
  });
}
```

---

### Scenario 3: Real-Time Dashboard Updates

**Objective**: Test WebSocket performance for real-time updates

**Test Flow**:
1. Establish WebSocket connections
2. Subscribe to real-time channels
3. Measure message delivery latency
4. Verify no connection drops

**Load Profile**:
- Concurrent Connections: 5,000
- Message Rate: 100 messages/second (total)
- Duration: 30 minutes

**Expected Results**:
- Connection establishment < 1s
- Message latency < 100ms (p95)
- Connection drop rate < 0.1%

**Artillery Script**:
```yaml
config:
  target: "wss://realtime.symbiot.care"
  phases:
    - duration: 60
      arrivalRate: 50  # 50 users/sec
    - duration: 1800
      arrivalRate: 5   # Sustained load
  socketio:
    transports: ["websocket"]

scenarios:
  - name: "Real-time Subscription"
    engine: socketio
    flow:
      - emit:
          channel: "postgres_changes"
          data:
            event: "INSERT"
            schema: "public"
            table: "device_data"
      - think: 5
      - loop:
        - wait:
            seconds: 1
        - think: 1
        count: 100
```

---

### Scenario 4: Alert Generation Performance

**Objective**: Test alert system under high data volume

**Test Flow**:
1. Ingest device data with alert conditions
2. Measure alert generation time
3. Verify alert delivery
4. Check database performance

**Load Profile**:
- Alert-triggering data: 50 per second
- Duration: 10 minutes
- Total alerts: ~30,000

**Expected Results**:
- Alert generation < 5s (p95)
- Alert delivery < 10s (p95)
- Database alert inserts > 100 TPS

---

### Scenario 5: Complex Query Performance

**Objective**: Test analytical query performance

**Test Queries**:
```sql
-- Query 1: Get dwell time analysis (30 days)
SELECT
  zone,
  AVG(duration) as avg_duration,
  MAX(duration) as max_duration,
  COUNT(*) as visit_count
FROM
  movement_events
WHERE
  elderly_person_id = $1
  AND recorded_at >= NOW() - INTERVAL '30 days'
GROUP BY zone;

-- Query 2: Alert statistics (7 days)
SELECT
  alert_type,
  severity,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (acknowledged_at - triggered_at))) as avg_response_time
FROM
  alerts
WHERE
  elderly_person_id = $1
  AND triggered_at >= NOW() - INTERVAL '7 days'
GROUP BY alert_type, severity;

-- Query 3: Device data aggregation (24 hours)
SELECT
  DATE_TRUNC('hour', recorded_at) as hour,
  data_type,
  AVG((value->>'bpm')::numeric) as avg_value,
  MIN((value->>'bpm')::numeric) as min_value,
  MAX((value->>'bpm')::numeric) as max_value
FROM
  device_data
WHERE
  elderly_person_id = $1
  AND data_type = 'heart_rate'
  AND recorded_at >= NOW() - INTERVAL '24 hours'
GROUP BY hour, data_type
ORDER BY hour DESC;
```

**Load Profile**:
- Concurrent query executions: 50
- Repeat: 1000 times
- Duration: 20 minutes

**Expected Results**:
- Query 1: < 200ms (p95)
- Query 2: < 150ms (p95)
- Query 3: < 300ms (p95)

---

### Scenario 6: File Upload Performance

**Objective**: Test floor plan image upload performance

**Test Flow**:
1. Upload floor plan image (various sizes)
2. Measure upload time
3. Verify storage

**Load Profile**:
- File sizes: 100KB, 500KB, 1MB, 5MB
- Concurrent uploads: 50
- Duration: 10 minutes

**Expected Results**:
- 100KB upload < 1s
- 500KB upload < 2s
- 1MB upload < 3s
- 5MB upload < 10s
- Success rate > 99%

---

## Load Profiles

### Profile 1: Normal Business Hours
```
Time: 9 AM - 5 PM weekdays
Users: 2,000 concurrent
Device Data Rate: 500 points/sec
API Requests: 800 req/sec
Duration: 8 hours
```

### Profile 2: Peak Usage
```
Time: 10 AM - 12 PM weekdays
Users: 5,000 concurrent
Device Data Rate: 1,500 points/sec
API Requests: 2,000 req/sec
Duration: 2 hours
```

### Profile 3: Off-Hours
```
Time: 12 AM - 6 AM
Users: 500 concurrent
Device Data Rate: 300 points/sec
API Requests: 200 req/sec
Duration: 6 hours
```

### Profile 4: Emergency Spike
```
Scenario: Major alert event (e.g., multiple panic buttons)
Users: 10,000 concurrent (5x normal)
Duration: 15 minutes
Expected: System remains responsive
```

---

## Performance Metrics

### Frontend Metrics (Lighthouse)
- **First Contentful Paint (FCP)**: < 1.8s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Total Blocking Time (TBT)**: < 200ms
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Time to Interactive (TTI)**: < 3.8s
- **Performance Score**: > 90

### API Metrics
```javascript
{
  "http_req_duration": {
    "avg": "< 150ms",
    "p95": "< 200ms",
    "p99": "< 500ms"
  },
  "http_req_failed": "< 0.5%",
  "http_reqs": "> 1000 req/s",
  "data_received": "< 10 MB/s",
  "data_sent": "< 5 MB/s"
}
```

### Database Metrics
```sql
-- Key metrics to monitor
SELECT
  calls,
  mean_exec_time,
  max_exec_time,
  rows,
  query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### System Metrics
```
CPU Usage: avg, max, p95
Memory Usage: avg, max, available
Disk I/O: read/write IOPS
Network I/O: throughput, latency
```

---

## Scalability Testing

### Horizontal Scaling Test

**Objective**: Verify system scales linearly with added resources

**Test Steps**:
1. Baseline: 1 API server, 1000 users
2. Add server: 2 API servers, 2000 users
3. Add server: 4 API servers, 4000 users
4. Add server: 8 API servers, 8000 users

**Expected Results**:
- Response time remains constant
- Throughput scales linearly
- No bottlenecks in shared resources (DB, storage)

**Scaling Efficiency**:
```
Efficiency = (Throughput_N / Throughput_1) / N * 100%
Target: > 85% efficiency
```

---

### Vertical Scaling Test

**Objective**: Measure benefit of increased server resources

**Test Variants**:
```
Variant 1: 2 vCPU, 4GB RAM
Variant 2: 4 vCPU, 8GB RAM
Variant 3: 8 vCPU, 16GB RAM
Variant 4: 16 vCPU, 32GB RAM
```

**Measure**:
- Requests handled per second
- Response time at same load
- Cost efficiency (req/s per $)

---

### Database Scaling Test

**Objective**: Test database performance with data growth

**Test Phases**:
```
Phase 1: 100K device_data records
Phase 2: 1M device_data records
Phase 3: 10M device_data records
Phase 4: 100M device_data records
```

**Queries to Test**:
- Recent data queries (last 24h)
- Historical queries (last 30 days)
- Aggregation queries
- Join queries

**Expected**:
- Recent queries: < 200ms (constant)
- Historical queries: < 500ms (degradation < 20%)
- Partitioning effective after 10M records

---

## Simulation TestBed Setup

### Device Simulator Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Device Simulator (Node.js)              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Wearables  │  │    Health    │  │   Environ.   │ │
│  │  Simulator   │  │   Monitors   │  │   Sensors    │ │
│  │  (BLE data)  │  │   (Vital     │  │  (Temp,      │ │
│  │              │  │    signs)    │  │   Motion)    │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                  │          │
│         └─────────────────┴──────────────────┘          │
│                           │                             │
│                  ┌────────▼────────┐                    │
│                  │  Data Generator  │                    │
│                  │  - Realistic     │                    │
│                  │  - Configurable  │                    │
│                  │  - Randomized    │                    │
│                  └────────┬────────┘                    │
│                           │                             │
└───────────────────────────┼─────────────────────────────┘
                            │
                   ┌────────▼────────┐
                   │  API Client     │
                   │  (HTTP/WS)      │
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │  SymBIoT API    │
                   └─────────────────┘
```

### Device Simulator Implementation

**Installation**:
```bash
npm install --save-dev @faker-js/faker
npm install --save-dev @supabase/supabase-js
```

**Configuration** (`simulator-config.json`):
```json
{
  "simulation": {
    "duration_minutes": 60,
    "elderly_persons": 100,
    "devices_per_person": {
      "wearable": 1,
      "health_monitor": 2,
      "environmental": 3,
      "gps": 1
    }
  },
  "data_rates": {
    "heart_rate": 10,
    "blood_pressure": 300,
    "steps": 60,
    "temperature": 180,
    "position": 30,
    "gps": 60
  },
  "thresholds": {
    "heart_rate": { "min": 60, "max": 100, "critical_low": 50, "critical_high": 120 },
    "blood_pressure": { "systolic_max": 140, "diastolic_max": 90 },
    "temperature": { "min": 36.1, "max": 37.2, "critical_high": 38.0 }
  },
  "alert_probability": {
    "panic_button": 0.001,
    "fall_detection": 0.0005,
    "vital_anomaly": 0.05
  }
}
```

**Device Simulator Code** (`device-simulator.ts`):
```typescript
import { faker } from '@faker-js/faker';
import { createClient } from '@supabase/supabase-js';

interface SimulatorConfig {
  simulation: {
    duration_minutes: number;
    elderly_persons: number;
    devices_per_person: Record<string, number>;
  };
  data_rates: Record<string, number>;
  thresholds: Record<string, any>;
  alert_probability: Record<string, number>;
}

class DeviceSimulator {
  private config: SimulatorConfig;
  private supabase: any;
  private devices: Map<string, any> = new Map();

  constructor(config: SimulatorConfig) {
    this.config = config;
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    );
  }

  async initialize() {
    console.log('Initializing device simulator...');

    // Create test elderly persons and devices
    for (let i = 0; i < this.config.simulation.elderly_persons; i++) {
      const personId = await this.createElderlyPerson();
      await this.createDevicesForPerson(personId);
    }

    console.log(`Initialized ${this.devices.size} devices`);
  }

  async createElderlyPerson(): Promise<string> {
    const { data, error } = await this.supabase
      .from('elderly_persons')
      .insert({
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        date_of_birth: faker.date.birthdate({ min: 65, max: 95, mode: 'age' }),
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  async createDevicesForPerson(personId: string) {
    const deviceTypes = [
      { type: 'wearable', count: 1 },
      { type: 'health_monitor', count: 2 },
      { type: 'environmental', count: 3 },
      { type: 'gps', count: 1 },
    ];

    for (const { type, count } of deviceTypes) {
      for (let i = 0; i < count; i++) {
        const { data, error } = await this.supabase
          .from('devices')
          .insert({
            elderly_person_id: personId,
            device_identifier: `SIM-${type}-${faker.string.alphanumeric(8)}`,
            device_name: `${type} ${i + 1}`,
            device_type: type,
            status: 'online',
          })
          .select()
          .single();

        if (error) throw error;
        this.devices.set(data.id, { ...data, person_id: personId });
      }
    }
  }

  generateHeartRateData(deviceId: string, personId: string): any {
    const { min, max, critical_low, critical_high } = this.config.thresholds.heart_rate;

    let bpm: number;
    if (Math.random() < this.config.alert_probability.vital_anomaly) {
      // Generate anomalous data
      bpm = Math.random() < 0.5
        ? faker.number.int({ min: critical_low - 10, max: critical_low })
        : faker.number.int({ min: critical_high, max: critical_high + 20 });
    } else {
      // Generate normal data
      bpm = faker.number.int({ min, max });
    }

    return {
      device_id: deviceId,
      elderly_person_id: personId,
      data_type: 'heart_rate',
      value: { bpm },
      recorded_at: new Date().toISOString(),
    };
  }

  generateBloodPressureData(deviceId: string, personId: string): any {
    const systolic = faker.number.int({ min: 90, max: 160 });
    const diastolic = faker.number.int({ min: 60, max: 100 });

    return {
      device_id: deviceId,
      elderly_person_id: personId,
      data_type: 'blood_pressure',
      value: { systolic, diastolic, unit: 'mmHg' },
      recorded_at: new Date().toISOString(),
    };
  }

  generatePositionData(deviceId: string, personId: string): any {
    return {
      device_id: deviceId,
      elderly_person_id: personId,
      data_type: 'position',
      value: {
        x: faker.number.float({ min: 0, max: 10, precision: 0.1 }),
        y: faker.number.float({ min: 0, max: 10, precision: 0.1 }),
        zone: faker.helpers.arrayElement(['bedroom', 'kitchen', 'bathroom', 'living_room']),
      },
      recorded_at: new Date().toISOString(),
    };
  }

  generateGPSData(deviceId: string, personId: string): any {
    return {
      device_id: deviceId,
      elderly_person_id: personId,
      data_type: 'gps',
      value: {
        latitude: faker.location.latitude(),
        longitude: faker.location.longitude(),
        accuracy: faker.number.int({ min: 5, max: 50 }),
      },
      recorded_at: new Date().toISOString(),
    };
  }

  async sendDataBatch(dataPoints: any[]) {
    const { error } = await this.supabase
      .from('device_data')
      .insert(dataPoints);

    if (error) {
      console.error('Error inserting data:', error);
    } else {
      console.log(`Inserted ${dataPoints.length} data points`);
    }
  }

  async simulate() {
    console.log('Starting simulation...');

    const startTime = Date.now();
    const endTime = startTime + (this.config.simulation.duration_minutes * 60 * 1000);

    let totalDataPoints = 0;

    while (Date.now() < endTime) {
      const batch: any[] = [];

      // Generate data for each device
      for (const [deviceId, device] of this.devices) {
        const dataType = device.device_type;

        // Generate data based on device type and rate
        if (dataType === 'wearable' && Math.random() < 0.1) {
          batch.push(this.generateHeartRateData(deviceId, device.person_id));
        }

        if (dataType === 'health_monitor' && Math.random() < 0.033) {
          batch.push(this.generateBloodPressureData(deviceId, device.person_id));
        }

        if (dataType === 'environmental' && Math.random() < 0.033) {
          batch.push(this.generatePositionData(deviceId, device.person_id));
        }

        if (dataType === 'gps' && Math.random() < 0.017) {
          batch.push(this.generateGPSData(deviceId, device.person_id));
        }
      }

      // Send batch
      if (batch.length > 0) {
        await this.sendDataBatch(batch);
        totalDataPoints += batch.length;
      }

      // Wait 1 second before next batch
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Progress update
      const elapsed = (Date.now() - startTime) / 1000 / 60;
      const progress = ((Date.now() - startTime) / (endTime - startTime) * 100).toFixed(1);
      console.log(`Progress: ${progress}% (${elapsed.toFixed(1)} min, ${totalDataPoints} data points)`);
    }

    console.log(`Simulation complete. Generated ${totalDataPoints} data points.`);
  }

  async cleanup() {
    console.log('Cleaning up test data...');
    // Delete test data (optional)
  }
}

// Run simulation
async function main() {
  const config = require('./simulator-config.json');
  const simulator = new DeviceSimulator(config);

  await simulator.initialize();
  await simulator.simulate();
  // await simulator.cleanup(); // Uncomment to clean up
}

main();
```

**Running the Simulator**:
```bash
# Set environment variables
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_KEY=your-service-role-key

# Run simulation
npx ts-node device-simulator.ts
```

---

## Baseline & Benchmarks

### Current Performance Baseline

Establish baseline before optimization:

```
Date: 2025-01-12
Environment: Staging
Users: 100 concurrent

Results:
- Avg Response Time: 250ms
- p95 Response Time: 450ms
- p99 Response Time: 800ms
- Throughput: 150 req/s
- Error Rate: 0.2%
- CPU Usage: 35%
- Memory Usage: 45%
```

### Performance Improvement Targets

```
Phase 1 (Q1 2025):
- Reduce p95 response time by 30%
- Increase throughput by 50%
- Reduce error rate to < 0.1%

Phase 2 (Q2 2025):
- Support 5,000 concurrent users
- Handle 1,000 device data points/sec
- Maintain sub-200ms response times

Phase 3 (Q3 2025):
- Support 10,000 concurrent users
- Handle 2,500 device data points/sec
- Geographic load distribution
```

---

## Reporting & Analysis

### Test Report Template

```markdown
# Performance Test Report

## Test Summary
- Test Type: Load Test
- Date: 2025-01-12
- Duration: 2 hours
- Target Load: 1,000 concurrent users
- Actual Load Achieved: 985 concurrent users

## Key Metrics
- Avg Response Time: 185ms
- p95 Response Time: 320ms
- p99 Response Time: 680ms
- Throughput: 850 req/s
- Error Rate: 0.15%

## Pass/Fail Criteria
✅ p95 Response Time < 200ms: PASS (195ms)
❌ Error Rate < 0.1%: FAIL (0.15%)
✅ Throughput > 800 req/s: PASS (850 req/s)

## Bottlenecks Identified
1. Database connection pool exhaustion at peak load
2. Memory leak in real-time subscription handler
3. Slow query on device_data table (missing index)

## Recommendations
1. Increase connection pool size to 100
2. Fix memory leak in subscription cleanup
3. Add composite index: (elderly_person_id, data_type, recorded_at)
4. Implement query result caching for dashboard

## Graphs & Charts
[Insert screenshots: Response time, throughput, errors, resource usage]
```

### Automated Reporting with k6

```javascript
export function handleSummary(data) {
  return {
    'summary.html': htmlReport(data),
    'summary.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
```

---

## Continuous Performance Testing

### CI/CD Integration

```yaml
# .github/workflows/performance-test.yml
name: Performance Tests

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:      # Manual trigger

jobs:
  performance-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Install k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run Load Test
        run: k6 run tests/performance/load-test.js

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: summary.html

      - name: Comment PR (if applicable)
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const summary = JSON.parse(fs.readFileSync('summary.json', 'utf8'));

            const comment = `
            ## Performance Test Results
            - Avg Response Time: ${summary.metrics.http_req_duration.avg}ms
            - p95 Response Time: ${summary.metrics.http_req_duration['p(95)']}ms
            - Error Rate: ${summary.metrics.http_req_failed.rate * 100}%
            `;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

---

## Appendix

### Performance Testing Checklist

**Pre-Test**:
- [ ] Test environment configured
- [ ] Baseline metrics recorded
- [ ] Test data prepared
- [ ] Monitoring tools enabled
- [ ] Stakeholders notified

**During Test**:
- [ ] Monitor system resources
- [ ] Check error logs
- [ ] Validate data accuracy
- [ ] Record observations

**Post-Test**:
- [ ] Analyze results
- [ ] Compare to baseline
- [ ] Identify bottlenecks
- [ ] Document findings
- [ ] Create action items

### Tools & Resources

- **k6**: https://k6.io/docs
- **Artillery**: https://artillery.io/docs
- **Lighthouse**: https://developers.google.com/web/tools/lighthouse
- **WebPageTest**: https://www.webpagetest.org
- **PostgreSQL Performance**: https://wiki.postgresql.org/wiki/Performance_Optimization

---

*Document Version: 1.0.0*
*Last Updated: 2025-01-12*
*Next Review: 2025-02-12*
