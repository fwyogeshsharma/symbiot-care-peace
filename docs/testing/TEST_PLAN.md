# SymBIoT Platform - Comprehensive Test Plan (100+ Test Cases)

## Document Information
- **Version**: 2.0.0
- **Last Updated**: 2025-01-12
- **Test Manager**: QA Team
- **Status**: Active
- **Total Test Cases**: 120+

---

## Table of Contents
1. [Test Strategy](#test-strategy)
2. [Test Scope](#test-scope)
3. [Test Types](#test-types)
4. [Test Cases Summary](#test-cases-summary)
5. [Detailed Test Cases](#detailed-test-cases)
6. [Test Environment](#test-environment)
7. [Test Data](#test-data)
8. [Test Schedule](#test-schedule)
9. [Defect Management](#defect-management)
10. [Test Metrics](#test-metrics)

---

## Test Strategy

### Objectives
- Ensure system functionality meets requirements
- Validate data accuracy and integrity
- Verify security and access control
- Confirm usability and user experience
- Test performance under load
- Ensure cross-browser/device compatibility

### Approach
- **Test-Driven Development (TDD)** for critical components
- **Continuous Testing** via CI/CD pipeline
- **Automated Testing** for regression and unit tests
- **Manual Testing** for exploratory and usability tests
- **User Acceptance Testing (UAT)** before production release

---

## Test Scope

### In Scope
✅ Authentication and authorization
✅ Dashboard functionality
✅ Device data collection and display
✅ Alert generation and management
✅ Activity monitoring and dwell time analysis
✅ Indoor/outdoor tracking
✅ Floor plan management
✅ Geofence creation and monitoring
✅ Data sharing functionality
✅ User profile management
✅ API endpoints
✅ Real-time data updates
✅ Security and access control
✅ Responsive design (mobile, tablet, desktop)
✅ Data validation and integrity
✅ Error handling and recovery

### Out of Scope
❌ Third-party device firmware
❌ Hardware device testing (delegated to manufacturers)
❌ Network infrastructure testing
❌ External API services (Fitbit, Google Maps, etc.)

---

## Test Types

### 1. Unit Testing
**Purpose**: Test individual functions and components
**Tools**: Vitest, React Testing Library
**Coverage Target**: 80%

### 2. Integration Testing
**Purpose**: Test interaction between components and services
**Tools**: Vitest, Supabase Test Helpers
**Coverage Target**: 70%

### 3. End-to-End (E2E) Testing
**Purpose**: Test complete user workflows
**Tools**: Playwright, Cypress
**Coverage Target**: Critical paths

### 4. API Testing
**Purpose**: Validate REST API endpoints
**Tools**: Postman, REST Client, Supabase API
**Coverage**: All endpoints

### 5. Security Testing
**Purpose**: Identify vulnerabilities
**Tools**: OWASP ZAP, Manual penetration testing
**Coverage**: Auth, data access, SQL injection, XSS

### 6. Performance Testing
**Purpose**: Validate system performance under load
**Tools**: k6, Artillery, Lighthouse
**Coverage**: Load, stress, endurance

### 7. Usability Testing
**Purpose**: Validate user experience
**Method**: User interviews, heuristic evaluation
**Participants**: 5-10 users per test session

### 8. Accessibility Testing
**Purpose**: Ensure WCAG 2.1 AA compliance
**Tools**: axe DevTools, WAVE, manual testing
**Coverage**: All pages

---

## Test Cases Summary

| Module | Test Cases | Priority |
|--------|------------|----------|
| Authentication & Authorization | 16 | High |
| Dashboard Functionality | 15 | High |
| Device Management | 15 | High |
| Alert Management | 15 | High |
| Activity Monitoring | 10 | High |
| Indoor Tracking | 10 | High |
| Outdoor Tracking | 10 | Medium |
| Data Sharing | 8 | Medium |
| User Profile & Settings | 8 | Medium |
| Security & Permissions | 10 | Critical |
| Data Validation | 8 | High |
| Real-time Updates | 5 | High |
| UI/UX & Responsive Design | 10 | High |
| **Total** | **120** | - |

---

## Detailed Test Cases

---

## Module 1: Authentication & Authorization (16 Test Cases)

### TC-AUTH-001: User Registration - Valid Data
**Priority**: High
**Type**: Functional
**Preconditions**: None
**Steps**:
1. Navigate to registration page
2. Enter email: newuser@example.com
3. Enter password: SecurePass123!
4. Select role: Family Member
5. Click "Sign Up"

**Expected Result**:
- Account created successfully
- Verification email sent
- User redirected to email verification page
- Success message displayed

**Test Data**: Valid email formats, strong passwords

---

### TC-AUTH-002: User Registration - Invalid Email
**Priority**: High
**Type**: Negative
**Steps**:
1. Navigate to registration page
2. Enter invalid email: notanemail
3. Enter password: SecurePass123!
4. Click "Sign Up"

**Expected Result**:
- Email validation error shown
- Account not created
- Error message: "Invalid email format"

**Test Data**: notanemail, user@, @example.com, user @example.com

---

### TC-AUTH-003: User Registration - Weak Password
**Priority**: High
**Type**: Negative
**Steps**:
1. Navigate to registration page
2. Enter email: test@example.com
3. Enter weak password: 123
4. Click "Sign Up"

**Expected Result**:
- Password validation error shown
- Error message: "Password must be at least 8 characters"
- Account not created

**Test Data**: 123, abc, password (no numbers/special chars)

---

### TC-AUTH-004: User Registration - Duplicate Email
**Priority**: High
**Type**: Negative
**Steps**:
1. Register user with email: test@example.com
2. Attempt to register again with same email
3. Click "Sign Up"

**Expected Result**:
- Error message: "Email already registered"
- Registration fails
- Suggest login or password recovery

---

### TC-AUTH-005: User Login - Valid Credentials
**Priority**: Critical
**Type**: Functional
**Steps**:
1. Navigate to login page
2. Enter email: test@example.com
3. Enter password: SecurePass123!
4. Click "Login"

**Expected Result**:
- JWT token received
- User redirected to dashboard
- Session established
- User data loaded

---

### TC-AUTH-006: User Login - Invalid Email
**Priority**: High
**Type**: Negative
**Steps**:
1. Navigate to login page
2. Enter email: wrong@example.com
3. Enter password: SecurePass123!
4. Click "Login"

**Expected Result**:
- Error message: "Invalid credentials"
- Login fails
- User remains on login page
- No JWT token issued

---

### TC-AUTH-007: User Login - Invalid Password
**Priority**: High
**Type**: Negative
**Steps**:
1. Navigate to login page
2. Enter valid email
3. Enter wrong password
4. Click "Login"

**Expected Result**:
- Error message: "Invalid credentials"
- Login fails
- Account not locked (unless multiple failures)

---

### TC-AUTH-008: Password Recovery - Valid Email
**Priority**: High
**Type**: Functional
**Steps**:
1. Click "Forgot Password"
2. Enter registered email
3. Click "Send Recovery Email"
4. Check email inbox
5. Click recovery link
6. Enter new password
7. Submit

**Expected Result**:
- Recovery email received within 1 minute
- Link is valid and secure (token-based)
- Password updated successfully
- Can login with new password
- Old password no longer works

---

### TC-AUTH-009: Password Recovery - Unregistered Email
**Priority**: Medium
**Type**: Negative
**Steps**:
1. Click "Forgot Password"
2. Enter unregistered email
3. Click "Send Recovery Email"

**Expected Result**:
- Generic success message (security: don't reveal email exists)
- No email sent
- No error exposing that email doesn't exist

---

### TC-AUTH-010: Session Timeout
**Priority**: High
**Type**: Functional
**Steps**:
1. Login successfully
2. Wait for session timeout (e.g., 24 hours)
3. Attempt to access protected page

**Expected Result**:
- Session expired
- User redirected to login page
- Message: "Session expired, please login again"

---

### TC-AUTH-011: Logout Functionality
**Priority**: High
**Type**: Functional
**Steps**:
1. Login successfully
2. Click "Logout" from user menu
3. Confirm logout

**Expected Result**:
- JWT token invalidated
- User redirected to login page
- Cannot access protected pages without re-login
- Session cleared

---

### TC-AUTH-012: Role-Based Access - Administrator
**Priority**: Critical
**Type**: Functional
**Steps**:
1. Login as Administrator
2. Navigate to admin pages:
   - User Management
   - Device Type Configs
3. Verify access granted

**Expected Result**:
- Admin pages accessible
- All features available
- Can manage users and settings

---

### TC-AUTH-013: Role-Based Access - Family Member
**Priority**: Critical
**Type**: Functional
**Steps**:
1. Login as Family Member
2. Attempt to access admin pages
3. Navigate to allowed pages:
   - Dashboard
   - Alerts
   - Tracking

**Expected Result**:
- Admin pages return 403 Forbidden
- Allowed pages accessible
- Appropriate error message shown

---

### TC-AUTH-014: Role-Based Access - Healthcare Provider
**Priority**: High
**Type**: Functional
**Steps**:
1. Login as Healthcare Provider
2. Access medical data views
3. Verify analytics access
4. Attempt admin functions

**Expected Result**:
- Medical data accessible
- Analytics available
- Admin functions denied
- Role-appropriate permissions enforced

---

### TC-AUTH-015: Email Verification
**Priority**: High
**Type**: Functional
**Steps**:
1. Register new account
2. Check email inbox
3. Click verification link
4. Verify account activated

**Expected Result**:
- Verification link received
- Link valid for 24 hours
- Account marked as verified
- Can login after verification

---

### TC-AUTH-016: Email Verification - Expired Link
**Priority**: Medium
**Type**: Negative
**Steps**:
1. Register account
2. Wait for verification link to expire (>24 hours)
3. Click expired link

**Expected Result**:
- Error message: "Verification link expired"
- Option to resend verification email
- Account remains unverified
- Cannot login

---

## Module 2: Dashboard Functionality (15 Test Cases)

### TC-DASH-001: View Dashboard Statistics
**Priority**: Critical
**Type**: Functional
**Preconditions**: User logged in, monitored persons exist
**Steps**:
1. Navigate to dashboard
2. Verify stat cards display:
   - Number of monitored persons
   - Active alerts count
   - Average heart rate
   - Activity level

**Expected Result**:
- All stats display correctly
- Numbers accurate
- Real-time updates
- No loading errors

---

### TC-DASH-002: Dashboard Load Time
**Priority**: High
**Type**: Performance
**Steps**:
1. Clear browser cache
2. Login
3. Measure time to dashboard fully loaded

**Expected Result**:
- Initial load < 3 seconds
- Interactive < 5 seconds
- All data rendered
- Smooth rendering

---

### TC-DASH-003: Select Monitored Person
**Priority**: Critical
**Type**: Functional
**Steps**:
1. View "Monitored Persons" list
2. Click on first person
3. Verify vital metrics update
4. Click on second person
5. Verify metrics change

**Expected Result**:
- Person selection highlights
- Vital metrics update within 1 second
- No data mix-up
- Smooth transition

---

### TC-DASH-004: View Vital Metrics - Normal Range
**Priority**: High
**Type**: Functional
**Steps**:
1. Select person with normal vitals
2. View vital metrics cards:
   - Heart Rate: 72 BPM
   - Blood Pressure: 120/80 mmHg
   - Oxygen: 98%
   - Temperature: 37°C

**Expected Result**:
- All metrics display with green status
- Values correct
- Timestamps recent
- Units displayed

---

### TC-DASH-005: View Vital Metrics - Warning Range
**Priority**: High
**Type**: Functional
**Steps**:
1. Simulate heart rate: 105 BPM (above normal)
2. View dashboard

**Expected Result**:
- Heart rate card shows yellow/warning status
- Warning icon displayed
- Tooltip explains warning
- Other metrics remain normal

---

### TC-DASH-006: View Vital Metrics - Critical Range
**Priority**: Critical
**Type**: Functional
**Steps**:
1. Simulate heart rate: 140 BPM (critical)
2. View dashboard

**Expected Result**:
- Heart rate card shows red/critical status
- Alert generated
- Visual emphasis (pulsing, color)
- Notification shown

---

### TC-DASH-007: View Vital Metrics - Missing Data
**Priority**: Medium
**Type**: Negative
**Steps**:
1. Select person with no recent device data
2. View vital metrics

**Expected Result**:
- Cards display "No recent data"
- Timestamp shows last known data
- Suggestion to check device status
- No errors or blank cards

---

### TC-DASH-008: View Health Charts - Heart Rate
**Priority**: High
**Type**: Functional
**Steps**:
1. Click "View Charts" on heart rate card
2. View chart modal
3. Verify data points
4. Change time range (day/week/month)

**Expected Result**:
- Chart renders correctly
- Data points accurate
- Time range selector works
- Smooth chart transitions
- Can zoom/pan

---

### TC-DASH-009: View Health Charts - Multiple Metrics
**Priority**: High
**Type**: Functional
**Steps**:
1. Open charts modal
2. Switch between metrics:
   - Heart Rate
   - Blood Pressure
   - Oxygen Saturation
   - Steps

**Expected Result**:
- All charts available
- Switching smooth
- Data loads quickly
- Charts properly labeled

---

### TC-DASH-010: Dashboard Refresh
**Priority**: High
**Type**: Functional
**Steps**:
1. View dashboard
2. Click refresh button
3. Verify data reloads

**Expected Result**:
- All data refreshes
- Loading indicators shown
- No page reload
- Updated timestamps

---

### TC-DASH-011: View Medications Panel
**Priority**: Medium
**Type**: Functional
**Steps**:
1. Select person
2. View medications panel
3. Verify medication list:
   - Name
   - Dosage
   - Frequency
   - Next dose time

**Expected Result**:
- All medications listed
- Information complete
- Next dose highlighted
- Can expand for details

---

### TC-DASH-012: View Environmental Sensors
**Priority**: Medium
**Type**: Functional
**Steps**:
1. View environmental sensors panel
2. Verify readings:
   - Room temperature
   - Humidity
   - Motion detection
   - Last update

**Expected Result**:
- All sensors displayed
- Values current
- Status indicators correct
- Timestamps accurate

---

### TC-DASH-013: Dashboard with No Monitored Persons
**Priority**: Medium
**Type**: Edge Case
**Steps**:
1. Login as user with no assigned persons
2. View dashboard

**Expected Result**:
- Empty state message shown
- Instructions to add persons
- No errors
- Clean UI

---

### TC-DASH-014: Dashboard Alert Preview
**Priority**: High
**Type**: Functional
**Steps**:
1. Generate critical alert
2. View dashboard alerts section
3. Verify alert preview shows:
   - Severity
   - Person
   - Type
   - Time

**Expected Result**:
- Latest 5 alerts shown
- Sorted by severity
- Click navigates to full alert
- "View All" link available

---

### TC-DASH-015: Dashboard Responsive - Mobile View
**Priority**: High
**Type**: Responsive
**Steps**:
1. Resize browser to mobile (375px)
2. View dashboard
3. Verify all elements accessible

**Expected Result**:
- Layout adapts to mobile
- All cards stackable
- Touch-friendly buttons
- No horizontal scroll
- Readable text

---

## Module 3: Device Management (15 Test Cases)

### TC-DEV-001: View Device List
**Priority**: High
**Type**: Functional
**Preconditions**: Devices registered
**Steps**:
1. Navigate to Device Status page
2. Select a person
3. View device list

**Expected Result**:
- All devices displayed in cards
- Status shown (online/offline)
- Battery levels displayed
- Last seen timestamps
- Device type icons

---

### TC-DEV-002: Filter Devices by Status
**Priority**: Medium
**Type**: Functional
**Steps**:
1. View device list (mix of online/offline)
2. Click "Online only" filter
3. Verify only online devices shown
4. Click "Offline only"
5. Verify only offline devices shown

**Expected Result**:
- Filters work correctly
- Device count updates
- Clear filter option available

---

### TC-DEV-003: Filter Devices by Type
**Priority**: Medium
**Type**: Functional
**Steps**:
1. Apply filter: "Wearables"
2. Verify only wearable devices shown
3. Apply filter: "Health Monitors"
4. Verify correct devices shown

**Expected Result**:
- Type filtering accurate
- Multiple filters can combine
- Results update instantly

---

### TC-DEV-004: Pair New Device - Bluetooth
**Priority**: Critical
**Type**: Functional
**Steps**:
1. Click "Add Device"
2. Select "Bluetooth" method
3. Start device discovery
4. Select device from list
5. Confirm pairing code (if required)
6. Assign to person
7. Save

**Expected Result**:
- Device discovered within 10 seconds
- Pairing successful
- Device appears in list with "online" status
- Data transmission starts

---

### TC-DEV-005: Pair Device - Discovery Timeout
**Priority**: Medium
**Type**: Negative
**Steps**:
1. Start device discovery
2. No devices in range
3. Wait for timeout (30 seconds)

**Expected Result**:
- Timeout message shown
- Option to retry
- Instructions displayed
- No error crash

---

### TC-DEV-006: Pair Device - Connection Failure
**Priority**: High
**Type**: Negative
**Steps**:
1. Discover device
2. Turn off device before pairing completes
3. Attempt to connect

**Expected Result**:
- Connection failure message
- Error details shown
- Option to retry
- Device not added to list

---

### TC-DEV-007: Device Goes Offline - Detection
**Priority**: High
**Type**: Functional
**Steps**:
1. View online device
2. Turn off device
3. Wait for offline detection (5 minutes)
4. Refresh page

**Expected Result**:
- Status changes to "offline" within 5 minutes
- Last seen timestamp frozen
- Battery level last known value
- Optional alert generated

---

### TC-DEV-008: Device Comes Back Online
**Priority**: High
**Type**: Functional
**Steps**:
1. Device currently offline
2. Power on device
3. Wait for reconnection

**Expected Result**:
- Status changes to "online"
- Last seen timestamp updates
- Battery level refreshes
- Data transmission resumes

---

### TC-DEV-009: View Device History
**Priority**: Medium
**Type**: Functional
**Steps**:
1. Select a device
2. Click "View History"
3. Review data timeline
4. Verify data types and values

**Expected Result**:
- Historical data displayed chronologically
- All data types shown
- Values accurate
- Timestamps correct
- Can filter by date range

---

### TC-DEV-010: Delete Device
**Priority**: High
**Type**: Functional
**Steps**:
1. Select device
2. Click "Delete" button
3. Confirm deletion
4. Verify device removed

**Expected Result**:
- Confirmation dialog shown
- Warning about data loss
- Device removed from list
- Historical data retained (or deleted per policy)

---

### TC-DEV-011: Edit Device Name
**Priority**: Low
**Type**: Functional
**Steps**:
1. Click edit icon on device
2. Change device name
3. Save changes

**Expected Result**:
- Name updates successfully
- Change reflected immediately
- Updated across all views

---

### TC-DEV-012: Device Battery Warning
**Priority**: High
**Type**: Functional
**Steps**:
1. Simulate device battery: 15%
2. View device card

**Expected Result**:
- Battery warning icon shown
- Yellow/warning color
- Alert generated (if configured)
- Recommendation to charge

---

### TC-DEV-013: Device Battery Critical
**Priority**: High
**Type**: Functional
**Steps**:
1. Simulate device battery: 5%
2. View device card

**Expected Result**:
- Critical battery icon
- Red color
- Critical alert generated
- Urgent notification

---

### TC-DEV-014: Multiple Devices Same Type
**Priority**: Medium
**Type**: Functional
**Steps**:
1. Pair 2 heart rate monitors for same person
2. View device list
3. Verify both shown separately

**Expected Result**:
- Both devices listed
- Distinguished by name/ID
- Each shows own status
- Data tracked separately

---

### TC-DEV-015: Device Data Export
**Priority**: Low
**Type**: Functional
**Steps**:
1. Select device
2. Click "Export Data"
3. Select date range
4. Choose format (CSV/JSON)
5. Download

**Expected Result**:
- Export generated
- File downloads
- Data accurate and complete
- Proper formatting

---

## Module 4: Alert Management (15 Test Cases)

### TC-ALERT-001: View Active Alerts
**Priority**: Critical
**Type**: Functional
**Preconditions**: Active alerts exist
**Steps**:
1. Navigate to Alerts page
2. View active alerts tab
3. Verify alert details

**Expected Result**:
- Alerts sorted by severity (critical first)
- All details visible:
  - Severity badge
  - Person name
  - Alert type
  - Description
  - Timestamp
- Real-time updates

---

### TC-ALERT-002: Acknowledge Alert
**Priority**: Critical
**Type**: Functional
**Steps**:
1. View active alert
2. Click "Acknowledge" button
3. Verify status change
4. Check alert timeline

**Expected Result**:
- Status changes to "acknowledged"
- Acknowledged timestamp recorded
- User ID logged
- Alert moves to acknowledged section
- Badge updates

---

### TC-ALERT-003: Acknowledge Multiple Alerts
**Priority**: High
**Type**: Functional
**Steps**:
1. Select 5 active alerts (checkboxes)
2. Click "Acknowledge Selected"
3. Confirm bulk action

**Expected Result**:
- All selected alerts acknowledged
- Batch operation completes
- Success message with count
- All timestamps recorded

---

### TC-ALERT-004: Resolve Alert
**Priority**: High
**Type**: Functional
**Steps**:
1. View acknowledged alert
2. Click "Resolve"
3. Add resolution note
4. Submit

**Expected Result**:
- Status changes to "resolved"
- Resolution timestamp recorded
- Note saved
- Alert archived

---

### TC-ALERT-005: Filter Alerts - Severity
**Priority**: High
**Type**: Functional
**Steps**:
1. Apply filter: Severity = Critical
2. Verify only critical alerts shown
3. Change to: Severity = High
4. Verify results update

**Expected Result**:
- Filtering accurate
- Count updates
- Results instant
- Can clear filter

---

### TC-ALERT-006: Filter Alerts - Type
**Priority**: High
**Type**: Functional
**Steps**:
1. Apply filter: Type = Vital Signs
2. Verify only vital sign alerts
3. Apply: Type = Panic/SOS
4. Verify panic alerts shown

**Expected Result**:
- Type filter works
- Multiple types can be selected
- Results accurate

---

### TC-ALERT-007: Filter Alerts - Date Range
**Priority**: High
**Type**: Functional
**Steps**:
1. Select date range: Last 7 days
2. Verify alerts within range
3. Change to: Last 30 days
4. Verify expanded results

**Expected Result**:
- Date filtering accurate
- Custom range available
- Includes start and end dates
- Updates count

---

### TC-ALERT-008: Search Alerts
**Priority**: Medium
**Type**: Functional
**Steps**:
1. Enter search: "heart rate"
2. Press Enter
3. Verify matching alerts
4. Try: person name
5. Verify results

**Expected Result**:
- Search works on:
  - Alert description
  - Person name
  - Alert type
- Case-insensitive
- Instant results (debounced)
- Clear search button

---

### TC-ALERT-009: Alert Details Modal
**Priority**: Medium
**Type**: Functional
**Steps**:
1. Click on an alert
2. View details modal
3. Verify information:
   - Full description
   - Timeline
   - Related data
   - Actions

**Expected Result**:
- Modal opens smoothly
- All details shown
- Can acknowledge from modal
- Can close with X or ESC

---

### TC-ALERT-010: Alert Statistics
**Priority**: Medium
**Type**: Functional
**Steps**:
1. View alert statistics cards:
   - Total alerts
   - Active alerts
   - Critical alerts
   - Avg response time
2. Verify accuracy

**Expected Result**:
- Statistics accurate
- Update in real-time
- Formatted properly
- Visual indicators

---

### TC-ALERT-011: Alert Trends Chart
**Priority**: Medium
**Type**: Functional
**Steps**:
1. View alert trends over time chart
2. Hover over data points
3. Change time range

**Expected Result**:
- Chart renders correctly
- Shows alert volume over time
- Hover shows details
- Time range adjustable

---

### TC-ALERT-012: Alert Type Distribution
**Priority**: Low
**Type**: Functional
**Steps**:
1. View alert type pie chart
2. Verify distribution
3. Click on segment

**Expected Result**:
- Pie chart accurate
- Percentages shown
- Click filters to that type
- Legend displayed

---

### TC-ALERT-013: Alert Generation - Heart Rate High
**Priority**: Critical
**Type**: Functional
**Steps**:
1. Simulate heart rate: 125 BPM (above threshold)
2. Wait for alert generation (< 10 seconds)
3. Verify alert created

**Expected Result**:
- Alert generated within 10 seconds
- Severity: High or Critical (based on config)
- Contains relevant data (BPM value)
- Person correctly identified
- Notification sent

---

### TC-ALERT-014: Alert Generation - Panic Button
**Priority**: Critical
**Type**: Functional
**Steps**:
1. Simulate panic button press
2. Verify immediate alert

**Expected Result**:
- Alert created instantly (< 5 seconds)
- Severity: Critical
- Location included (if GPS available)
- Multiple notification channels
- Emergency contacts notified

---

### TC-ALERT-015: Alert Auto-Resolution
**Priority**: Medium
**Type**: Functional
**Steps**:
1. Generate device offline alert
2. Device comes back online
3. Verify alert auto-resolves

**Expected Result**:
- Alert status changes to resolved
- Auto-resolution note added
- Timestamp recorded
- User notified of resolution

---

## Module 5: Activity Monitoring (10 Test Cases)

### TC-ACT-001: View Movement Summary
**Priority**: High
**Type**: Functional
**Preconditions**: Activity data exists
**Steps**:
1. Navigate to Movement Dashboard
2. Select person
3. Select date range: Today
4. View summary metrics

**Expected Result**:
- Total steps displayed
- Distance calculated
- Active minutes shown
- Calories estimated
- All accurate based on data

---

### TC-ACT-002: Change Date Range - Movement
**Priority**: High
**Type**: Functional
**Steps**:
1. View current day data
2. Change to "This Week"
3. Verify data aggregates
4. Change to "This Month"
5. Verify monthly totals

**Expected Result**:
- Data aggregates correctly
- Charts update
- Metrics recalculate
- Smooth transition

---

### TC-ACT-003: View Dwell Time Analysis
**Priority**: High
**Type**: Functional
**Steps**:
1. View dwell time chart
2. Identify all zones
3. Verify time values
4. Check color coding

**Expected Result**:
- All zones displayed
- Times accurate (minutes/hours)
- Color coding correct:
  - Green: Normal
  - Yellow: 10-20% deviation
  - Red: >20% deviation
- Tooltips show exact times

---

### TC-ACT-004: Dwell Time - Normal Range
**Priority**: High
**Type**: Functional
**Steps**:
1. View person with ideal profile
2. Dwell times within thresholds
3. Check all zones green

**Expected Result**:
- All zones show green
- No alerts generated
- Percentages within range
- Profile comparison shown

---

### TC-ACT-005: Dwell Time - Minor Deviation
**Priority**: High
**Type**: Functional
**Steps**:
1. Person spends 15% more time in bedroom
2. View dwell time chart

**Expected Result**:
- Bedroom zone shows yellow
- Deviation percentage shown
- No alert (below threshold)
- Warning indicator

---

### TC-ACT-006: Dwell Time - Significant Deviation
**Priority**: High
**Type**: Functional
**Steps**:
1. Person spends 30% more time in bathroom
2. View dwell time chart
3. Check for alert

**Expected Result**:
- Bathroom zone shows red
- Alert generated
- Deviation clearly indicated
- Suggests action

---

### TC-ACT-007: Create Ideal Profile
**Priority**: High
**Type**: Functional
**Steps**:
1. Navigate to Ideal Profiles
2. Click "New Profile"
3. Enter name: "Weekday Normal"
4. Click "Use Current as Baseline"
5. Verify data populated
6. Adjust thresholds
7. Save

**Expected Result**:
- Profile created
- Baseline data copied from current dwell time
- Thresholds editable (min/max)
- Can set per zone
- Saves successfully

---

### TC-ACT-008: Activate Ideal Profile
**Priority**: High
**Type**: Functional
**Steps**:
1. View profile list
2. Click "Activate" on profile
3. Verify only one active

**Expected Result**:
- Profile marked as active
- Previous active profile deactivated
- Monitoring begins
- Dwell time comparison starts

---

### TC-ACT-009: Deactivate Ideal Profile
**Priority**: Medium
**Type**: Functional
**Steps**:
1. Click "Deactivate" on active profile
2. Confirm

**Expected Result**:
- Profile becomes inactive
- Monitoring stops
- No alerts generated
- Dwell time shows without comparison

---

### TC-ACT-010: Delete Ideal Profile
**Priority**: Low
**Type**: Functional
**Steps**:
1. Select profile
2. Click "Delete"
3. Confirm deletion

**Expected Result**:
- Confirmation dialog
- Profile deleted
- Cannot be active when deleted
- Historical data retained

---

## Module 6: Indoor Tracking (10 Test Cases)

### TC-INDOOR-001: View Indoor Tracking
**Priority**: High
**Type**: Functional
**Preconditions**: Floor plan exists
**Steps**:
1. Navigate to Tracking page
2. Select Indoor tab
3. Select person
4. View floor plan

**Expected Result**:
- Floor plan renders correctly
- Current position marker visible
- Movement trail shown
- Zones labeled
- Grid displayed

---

### TC-INDOOR-002: Real-time Position Update
**Priority**: High
**Type**: Functional
**Steps**:
1. View indoor tracking
2. Simulate position change
3. Observe marker movement

**Expected Result**:
- Position updates within 2 seconds
- Marker moves smoothly
- Trail extends
- Zone updates if crossed

---

### TC-INDOOR-003: Create Floor Plan
**Priority**: High
**Type**: Functional
**Steps**:
1. Navigate to Floor Plan Management
2. Click "Create Floor Plan"
3. Enter details:
   - Name: "Home Layout"
   - Width: 10m
   - Length: 8m
   - Grid Size: 1m
4. Save

**Expected Result**:
- Floor plan created
- Appears in list
- Can be edited
- Dimensions correct

---

### TC-INDOOR-004: Upload Floor Plan Image
**Priority**: Medium
**Type**: Functional
**Steps**:
1. Edit floor plan
2. Click "Upload Image"
3. Select image file (PNG/JPG)
4. Wait for upload
5. Save

**Expected Result**:
- Image uploads successfully
- Preview shown
- Image scaled to fit
- Background visible in editor

---

### TC-INDOOR-005: Draw Zone - Rectangle
**Priority**: High
**Type**: Functional
**Steps**:
1. Open floor plan editor
2. Select rectangle tool
3. Click and drag on canvas
4. Release to create zone
5. Set name and color
6. Save

**Expected Result**:
- Rectangle drawn accurately
- Can resize before confirming
- Zone properties editable
- Saves correctly

---

### TC-INDOOR-006: Edit Zone Properties
**Priority**: Medium
**Type**: Functional
**Steps**:
1. Select existing zone
2. Change name: "Master Bedroom"
3. Change color: Blue
4. Save

**Expected Result**:
- Name updates
- Color changes
- Updates reflected in tracking view
- No data loss

---

### TC-INDOOR-007: Delete Zone
**Priority**: Medium
**Type**: Functional
**Steps**:
1. Select zone
2. Press Delete key (or delete button)
3. Confirm deletion

**Expected Result**:
- Zone removed from floor plan
- Historical data retained
- Cannot undo (or undo available)
- Saves automatically

---

### TC-INDOOR-008: Place Furniture
**Priority**: Low
**Type**: Functional
**Steps**:
1. Open floor plan editor
2. Select furniture: Bed
3. Click on bedroom zone
4. Adjust size and rotation
5. Save

**Expected Result**:
- Furniture placed
- Can move, resize, rotate
- Stays within floor plan
- Saves position

---

### TC-INDOOR-009: Movement Playback
**Priority**: Medium
**Type**: Functional
**Steps**:
1. View tracking with historical data
2. Click "Playback"
3. Press play button
4. Observe position replay

**Expected Result**:
- Playback controls appear
- Position marker moves through trail
- Speed adjustable
- Can pause, restart
- Shows timestamps

---

### TC-INDOOR-010: Floor Plan with No Data
**Priority**: Low
**Type**: Edge Case
**Steps**:
1. View floor plan with no position data
2. Verify empty state

**Expected Result**:
- Floor plan renders
- Message: "No position data available"
- No errors
- Suggests checking devices

---

## Module 7: Outdoor Tracking (10 Test Cases)

### TC-OUTDOOR-001: View GPS Map
**Priority**: High
**Type**: Functional
**Preconditions**: GPS data available
**Steps**:
1. Navigate to Tracking page
2. Select Outdoor tab
3. View map

**Expected Result**:
- Map loads (Google Maps)
- Current location marker shown
- GPS trail rendered
- Controls available (zoom, pan)

---

### TC-OUTDOOR-002: Real-time GPS Update
**Priority**: High
**Type**: Functional
**Steps**:
1. View outdoor tracking
2. Simulate GPS position change
3. Observe map update

**Expected Result**:
- Position updates within 60 seconds
- Marker moves smoothly
- Trail extends
- Map re-centers if needed

---

### TC-OUTDOOR-003: Create Geofence
**Priority**: High
**Type**: Functional
**Steps**:
1. Navigate to Geofence Manager
2. Click "Add Geofence"
3. Click map to set center
4. Set radius: 200m
5. Name: "Home"
6. Alert on: Exit
7. Save

**Expected Result**:
- Geofence circle drawn
- Visible on map
- Saved to database
- Appears in list
- Monitoring active

---

### TC-OUTDOOR-004: Edit Geofence
**Priority**: Medium
**Type**: Functional
**Steps**:
1. Click on geofence in list
2. Click "Edit"
3. Change radius to 300m
4. Change name
5. Save

**Expected Result**:
- Circle updates on map
- Changes saved
- Monitoring continues
- No data loss

---

### TC-OUTDOOR-005: Delete Geofence
**Priority**: Medium
**Type**: Functional
**Steps**:
1. Select geofence
2. Click "Delete"
3. Confirm

**Expected Result**:
- Geofence removed from map
- Removed from list
- Monitoring stops
- Historical events retained

---

### TC-OUTDOOR-006: Geofence Entry Alert
**Priority**: Critical
**Type**: Functional
**Steps**:
1. Create geofence with entry alert
2. Simulate GPS outside
3. Simulate GPS inside
4. Verify alert

**Expected Result**:
- Entry detected
- Alert generated within 30 seconds
- Event logged with timestamp
- Location recorded

---

### TC-OUTDOOR-007: Geofence Exit Alert
**Priority**: Critical
**Type**: Functional
**Steps**:
1. Create geofence with exit alert
2. Simulate GPS inside
3. Simulate GPS outside
4. Verify alert

**Expected Result**:
- Exit detected
- Alert generated
- Event logged
- Timestamp and location saved

---

### TC-OUTDOOR-008: View GPS Trail
**Priority**: Medium
**Type**: Functional
**Steps**:
1. Select date range: Today
2. View GPS trail on map
3. Change to: Last 7 days
4. Verify extended trail

**Expected Result**:
- Trail shows movement path
- Color-coded by time
- Can click points for details
- Performance acceptable (<1000 points)

---

### TC-OUTDOOR-009: GPS Accuracy Indicator
**Priority**: Medium
**Type**: Functional
**Steps**:
1. View current GPS position
2. Check accuracy indicator

**Expected Result**:
- Accuracy shown (±10m)
- Color coded:
  - Green: < 20m
  - Yellow: 20-50m
  - Red: > 50m
- Tooltip explains

---

### TC-OUTDOOR-010: Map View - No GPS Data
**Priority**: Low
**Type**: Edge Case
**Steps**:
1. Select person with no GPS device
2. View outdoor tab

**Expected Result**:
- Map loads (default center)
- Message: "No GPS data available"
- Instructions shown
- No errors

---

## Module 8: Data Sharing (8 Test Cases)

### TC-SHARE-001: Grant Access - Valid Email
**Priority**: High
**Type**: Functional
**Steps**:
1. Navigate to Data Sharing
2. Enter email: family@example.com
3. Enter relationship: Daughter
4. Click "Grant Access"

**Expected Result**:
- Access granted
- User added to list
- Email notification sent (optional)
- Target user can now view data

---

### TC-SHARE-002: Grant Access - Invalid Email
**Priority**: Medium
**Type**: Negative
**Steps**:
1. Enter invalid email: notanemail
2. Click "Grant Access"

**Expected Result**:
- Validation error shown
- Access not granted
- Error message: "Invalid email format"

---

### TC-SHARE-003: Grant Access - Duplicate
**Priority**: Medium
**Type**: Negative
**Steps**:
1. Grant access to user@example.com
2. Attempt to grant again to same email

**Expected Result**:
- Error: "User already has access"
- No duplicate entry created
- Existing access unchanged

---

### TC-SHARE-004: Revoke Access
**Priority**: High
**Type**: Functional
**Steps**:
1. View shared users list
2. Click "Revoke" on user
3. Confirm revocation

**Expected Result**:
- Confirmation dialog shown
- Access immediately revoked
- User removed from list
- Target user can no longer access data

---

### TC-SHARE-005: Edit Relationship Label
**Priority**: Low
**Type**: Functional
**Steps**:
1. Click edit on shared user
2. Change relationship: "Son" to "Primary Caregiver"
3. Save

**Expected Result**:
- Label updates
- Change saved
- Reflected in list
- No access change

---

### TC-SHARE-006: Verify Shared Access - View Data
**Priority**: Critical
**Type**: Functional
**Steps**:
1. Grant access to user B
2. Logout
3. Login as user B
4. Verify can see shared person

**Expected Result**:
- Shared person in list
- Can view all data
- Cannot modify sharing
- Read-only access (if configured)

---

### TC-SHARE-007: Shared User Permissions
**Priority**: High
**Type**: Functional
**Steps**:
1. Login as shared user
2. Attempt to:
   - View data ✓
   - Acknowledge alerts ✓
   - Grant access to others ✗
   - Delete devices ✗

**Expected Result**:
- Read permissions granted
- Limited write permissions
- No admin permissions
- Appropriate errors shown

---

### TC-SHARE-008: View Shared By Me
**Priority**: Low
**Type**: Functional
**Steps**:
1. Navigate to Data Sharing
2. View "Shared by Me" section
3. Verify list of granted access

**Expected Result**:
- All granted access shown
- Can manage from here
- Shows relationship labels
- Revoke option available

---

## Module 9: User Profile & Settings (8 Test Cases)

### TC-PROFILE-001: View Profile Information
**Priority**: Medium
**Type**: Functional
**Steps**:
1. Navigate to Profile page
2. View current information:
   - Email
   - Full name
   - Role
   - Phone number

**Expected Result**:
- All information displayed
- Accurate and current
- Email not editable
- Role shown (not editable by user)

---

### TC-PROFILE-002: Update Full Name
**Priority**: Medium
**Type**: Functional
**Steps**:
1. Click "Edit Profile"
2. Change full name
3. Save

**Expected Result**:
- Name updates successfully
- Change reflected immediately
- Updated across all views
- Success message shown

---

### TC-PROFILE-003: Update Phone Number
**Priority**: Medium
**Type**: Functional
**Steps**:
1. Edit profile
2. Enter phone: +1-555-1234
3. Save

**Expected Result**:
- Phone updated
- Format validated
- Saved correctly
- Can receive SMS (if feature exists)

---

### TC-PROFILE-004: Update Phone - Invalid Format
**Priority**: Low
**Type**: Negative
**Steps**:
1. Enter invalid phone: 123
2. Save

**Expected Result**:
- Validation error
- Error message: "Invalid phone format"
- Not saved
- Field highlighted

---

### TC-PROFILE-005: Change Password
**Priority**: High
**Type**: Functional
**Steps**:
1. Click "Change Password"
2. Enter current password
3. Enter new password: NewSecure456!
4. Confirm new password
5. Submit

**Expected Result**:
- Password updated
- Success message
- Can login with new password
- Old password no longer works

---

### TC-PROFILE-006: Change Password - Wrong Current
**Priority**: High
**Type**: Negative
**Steps**:
1. Enter wrong current password
2. Enter new password
3. Submit

**Expected Result**:
- Error: "Current password incorrect"
- Password not changed
- Can try again

---

### TC-PROFILE-007: Change Password - Weak New Password
**Priority**: Medium
**Type**: Negative
**Steps**:
1. Enter correct current password
2. Enter weak new password: 123
3. Submit

**Expected Result**:
- Validation error
- Requirements shown:
  - Min 8 characters
  - Uppercase
  - Lowercase
  - Number
  - Special character
- Not saved

---

### TC-PROFILE-008: Restart Onboarding Tour
**Priority**: Low
**Type**: Functional
**Steps**:
1. Navigate to Profile
2. Click "Restart Tour"
3. Confirm

**Expected Result**:
- Tour restarts from beginning
- First step shown
- Can skip or complete
- Progress saved

---

## Module 10: Security & Permissions (10 Test Cases)

### TC-SEC-001: SQL Injection Protection - Login
**Priority**: Critical
**Type**: Security
**Steps**:
1. Attempt login with SQL injection:
   - Email: admin'--
   - Password: anything
2. Submit

**Expected Result**:
- Login fails
- No SQL error exposed
- Generic "Invalid credentials" message
- Logged for security monitoring

---

### TC-SEC-002: XSS Protection - Alert Description
**Priority**: Critical
**Type**: Security
**Steps**:
1. Create alert with XSS payload in description:
   - `<script>alert('XSS')</script>`
2. View alert on page

**Expected Result**:
- Script not executed
- HTML escaped
- Displayed as text
- No JavaScript execution

---

### TC-SEC-003: CSRF Protection - State Changing Actions
**Priority**: Critical
**Type**: Security
**Steps**:
1. Attempt POST request without CSRF token
2. Try to delete device

**Expected Result**:
- Request rejected
- 403 Forbidden
- CSRF token required
- Action not performed

---

### TC-SEC-004: Authorization - Access Other User's Data
**Priority**: Critical
**Type**: Security
**Steps**:
1. Login as User A
2. Note User B's person ID
3. Attempt API call: GET /elderly_persons/{UserB_PersonID}

**Expected Result**:
- 403 Forbidden
- Access denied
- Error: "Not authorized"
- Data not leaked

---

### TC-SEC-005: Session Hijacking Prevention
**Priority**: Critical
**Type**: Security
**Steps**:
1. Login and get session token
2. Copy token
3. Use from different IP/browser
4. Attempt actions

**Expected Result**:
- Additional verification required (optional)
- Session flagged as suspicious
- Security event logged
- User notified (optional)

---

### TC-SEC-006: Password Strength Enforcement
**Priority**: High
**Type**: Security
**Steps**:
1. Attempt to set passwords:
   - 123456
   - password
   - Password1
   - P@ssw0rd (acceptable)

**Expected Result**:
- Weak passwords rejected
- Requirements enforced
- Strong password accepted
- Visual strength indicator

---

### TC-SEC-007: Brute Force Protection - Login
**Priority**: Critical
**Type**: Security
**Steps**:
1. Attempt login with wrong password 5 times
2. Check account status

**Expected Result**:
- Account locked after 5 attempts
- Cooldown period (15 minutes)
- Email notification sent
- Unlock via email link

---

### TC-SEC-008: Rate Limiting - API Requests
**Priority**: High
**Type**: Security
**Steps**:
1. Send 100 API requests in 1 second
2. Observe responses

**Expected Result**:
- Rate limit enforced
- 429 Too Many Requests after threshold
- Retry-After header present
- Normal service after cooldown

---

### TC-SEC-009: Data Encryption - Sensitive Fields
**Priority**: Critical
**Type**: Security
**Steps**:
1. Store sensitive data (medical records)
2. Check database directly
3. Verify encryption

**Expected Result**:
- Sensitive fields encrypted at rest
- Not readable in database
- Encryption keys secured
- HIPAA compliant

---

### TC-SEC-010: Audit Logging - Critical Actions
**Priority**: High
**Type**: Security
**Steps**:
1. Perform critical actions:
   - Login
   - Acknowledge alert
   - Grant data access
   - Delete device
2. Check audit logs

**Expected Result**:
- All actions logged
- Includes:
  - User ID
  - Action
  - Timestamp
  - IP address
  - Result (success/failure)
- Logs immutable

---

## Module 11: Data Validation (8 Test Cases)

### TC-VALID-001: Email Format Validation
**Priority**: High
**Type**: Validation
**Test Data**:
- Valid: user@example.com ✓
- Invalid: notanemail ✗
- Invalid: @example.com ✗
- Invalid: user@ ✗
- Invalid: user @example.com ✗

**Expected Result**:
- Valid emails accepted
- Invalid emails rejected with specific errors

---

### TC-VALID-002: Phone Number Format Validation
**Priority**: Medium
**Type**: Validation
**Test Data**:
- Valid: +1-555-123-4567 ✓
- Valid: (555) 123-4567 ✓
- Valid: 555-123-4567 ✓
- Invalid: 123 ✗
- Invalid: abcd ✗

**Expected Result**:
- Multiple formats accepted
- Invalid formats rejected
- International formats supported

---

### TC-VALID-003: Date Validation - Date of Birth
**Priority**: Medium
**Type**: Validation
**Test Data**:
- Valid: 1950-01-01 ✓
- Invalid: 2030-01-01 (future) ✗
- Invalid: 1850-01-01 (too old) ✗
- Invalid: 13/13/2000 (invalid date) ✗

**Expected Result**:
- Reasonable dates accepted
- Future dates rejected
- Very old dates rejected
- Invalid dates rejected

---

### TC-VALID-004: Numeric Range Validation - Heart Rate
**Priority**: High
**Type**: Validation
**Test Data**:
- Valid: 72 ✓
- Valid: 60 (min boundary) ✓
- Valid: 200 (max boundary) ✓
- Invalid: 0 ✗
- Invalid: 300 ✗
- Invalid: -10 ✗

**Expected Result**:
- Values within range accepted
- Out of range rejected
- Negative values rejected
- Appropriate error messages

---

### TC-VALID-005: Text Length Validation - Names
**Priority**: Medium
**Type**: Validation
**Test Data**:
- Valid: "John Doe" ✓
- Valid: "X" (min 1 char) ✓
- Invalid: "" (empty) ✗
- Invalid: 256+ characters ✗

**Expected Result**:
- Reasonable lengths accepted
- Empty strings rejected
- Very long strings rejected
- Character limit enforced

---

### TC-VALID-006: File Upload Validation - Images
**Priority**: Medium
**Type**: Validation
**Test Data**:
- Valid: image.jpg ✓
- Valid: image.png ✓
- Invalid: image.exe ✗
- Invalid: 20MB file ✗

**Expected Result**:
- Allowed formats: JPG, PNG, GIF
- Max size: 5MB
- File type verified (not just extension)
- Clear error messages

---

### TC-VALID-007: JSON Structure Validation - Device Data
**Priority**: High
**Type**: Validation
**Test Data**:
```json
// Valid
{"bpm": 72}

// Invalid - wrong type
{"bpm": "seventy-two"}

// Invalid - missing required field
{}
```

**Expected Result**:
- Correct JSON accepted
- Type mismatches rejected
- Missing required fields rejected
- Schema validation performed

---

### TC-VALID-008: Coordinates Validation - GPS
**Priority**: High
**Type**: Validation
**Test Data**:
- Valid: lat: 40.7128, lon: -74.0060 ✓
- Invalid: lat: 100, lon: -74.0060 ✗
- Invalid: lat: 40.7128, lon: 200 ✗

**Expected Result**:
- Valid coordinates accepted
- Out of range rejected:
  - Latitude: -90 to 90
  - Longitude: -180 to 180
- Precision preserved

---

## Module 12: Real-time Updates (5 Test Cases)

### TC-REALTIME-001: Device Data Update
**Priority**: High
**Type**: Real-time
**Steps**:
1. View dashboard
2. Simulate new heart rate data
3. Observe update without refresh

**Expected Result**:
- Dashboard updates within 2 seconds
- No page reload
- Smooth transition
- WebSocket connection active

---

### TC-REALTIME-002: Alert Notification
**Priority**: Critical
**Type**: Real-time
**Steps**:
1. View any page
2. Generate critical alert
3. Observe notification

**Expected Result**:
- Toast notification appears
- Alert sound plays (if enabled)
- Count badge updates
- Can click to view details

---

### TC-REALTIME-003: Position Update - Indoor
**Priority**: High
**Type**: Real-time
**Steps**:
1. View indoor tracking
2. Simulate position change
3. Observe marker movement

**Expected Result**:
- Position updates within 2 seconds
- Marker moves smoothly
- Trail extends in real-time
- No lag or stuttering

---

### TC-REALTIME-004: Multiple Users Same Data
**Priority**: High
**Type**: Real-time
**Steps**:
1. Open app in 2 browsers (same user/person)
2. Acknowledge alert in browser 1
3. Observe browser 2

**Expected Result**:
- Alert status updates in browser 2
- Within 2 seconds
- No conflict
- Data consistent

---

### TC-REALTIME-005: Connection Loss Recovery
**Priority**: High
**Type**: Real-time
**Steps**:
1. Disable network
2. Wait 30 seconds
3. Re-enable network
4. Observe reconnection

**Expected Result**:
- Connection lost indicator shown
- Auto-reconnect attempts
- Reconnects successfully
- Data syncs when back online
- User notified of reconnection

---

## Module 13: UI/UX & Responsive Design (10 Test Cases)

### TC-UI-001: Mobile View - Portrait (375x667)
**Priority**: High
**Type**: Responsive
**Steps**:
1. Resize browser to 375x667px
2. Navigate through all pages
3. Test all interactions

**Expected Result**:
- All pages render correctly
- No horizontal scroll
- Touch targets ≥ 44x44px
- Text readable (min 14px)
- Buttons accessible
- Forms usable

---

### TC-UI-002: Mobile View - Landscape (667x375)
**Priority**: Medium
**Type**: Responsive
**Steps**:
1. Rotate to landscape
2. Navigate app
3. Verify usability

**Expected Result**:
- Layout adapts
- Navigation accessible
- Content readable
- Charts render correctly

---

### TC-UI-003: Tablet View - iPad (768x1024)
**Priority**: High
**Type**: Responsive
**Steps**:
1. Resize to tablet dimensions
2. Test all features
3. Verify layout

**Expected Result**:
- Optimized for tablet
- Two-column layouts utilized
- Charts full-width
- Sidebar navigation appropriate
- Touch-friendly

---

### TC-UI-004: Desktop View - HD (1920x1080)
**Priority**: High
**Type**: Responsive
**Steps**:
1. View on full HD display
2. Verify layout
3. Test all features

**Expected Result**:
- Full features accessible
- Multi-column layouts
- No wasted space
- Hover states work
- Keyboard shortcuts available

---

### TC-UI-005: Dark Mode Support
**Priority**: Low
**Type**: UI/UX
**Steps**:
1. Toggle dark mode
2. Navigate through pages
3. Verify colors

**Expected Result**:
- All pages support dark mode
- Proper contrast maintained
- Charts readable
- No white flashes
- Preference saved

---

### TC-UI-006: Keyboard Navigation
**Priority**: High
**Type**: Accessibility
**Steps**:
1. Use only keyboard
2. Tab through all elements
3. Activate with Enter/Space

**Expected Result**:
- All interactive elements reachable
- Focus indicators visible
- Logical tab order
- Skip links available
- No keyboard traps

---

### TC-UI-007: Loading States
**Priority**: Medium
**Type**: UI/UX
**Steps**:
1. Navigate to data-heavy page
2. Observe loading indicators
3. Verify feedback

**Expected Result**:
- Loading spinners shown
- Skeleton screens displayed
- Progress indicators accurate
- User informed of wait
- Timeout handling

---

### TC-UI-008: Error States
**Priority**: High
**Type**: UI/UX
**Steps**:
1. Simulate network error
2. Trigger validation errors
3. Cause server error (500)

**Expected Result**:
- Clear error messages
- Actionable suggestions
- Retry options
- No technical jargon
- Graceful degradation

---

### TC-UI-009: Empty States
**Priority**: Medium
**Type**: UI/UX
**Steps**:
1. View pages with no data:
   - No devices
   - No alerts
   - No floor plans

**Expected Result**:
- Helpful empty state message
- Illustrations/icons
- Call-to-action buttons
- Instructions provided
- Positive messaging

---

### TC-UI-010: Tooltips and Help Text
**Priority**: Low
**Type**: UI/UX
**Steps**:
1. Hover over info icons
2. Check form labels
3. Review help text

**Expected Result**:
- Tooltips appear on hover
- Clear, concise text
- Context-sensitive help
- Touch-friendly on mobile
- Dismissible

---

## Test Environment

### Hardware Requirements
- **Desktop**: Windows 10/11, macOS 12+, Ubuntu 20.04+
- **Mobile**: iPhone 12+, Samsung Galaxy S21+, Google Pixel 6+
- **Tablet**: iPad Pro, Samsung Galaxy Tab

### Software Requirements
- **Browsers**: Chrome 120+, Firefox 120+, Safari 16+, Edge 120+
- **Node.js**: 18.x or 20.x
- **Database**: PostgreSQL 15+ (Supabase)

### Test Data Requirements
- 10 test elderly person profiles (various ages, conditions)
- 50 device records (all types: wearables, monitors, sensors, GPS)
- 5,000+ device data entries (spanning 30 days)
- 100 alerts (all types and severities)
- 5 floor plans with zones and furniture
- 10 geofences (various sizes and configurations)
- 20 shared access records
- 10 ideal profiles

---

## Test Data

### Test Users
```
Administrator:
  Email: admin@test.symbiot.care
  Password: AdminTest123!
  Role: administrator

Family Member 1:
  Email: family1@test.symbiot.care
  Password: FamilyTest123!
  Role: family_member

Family Member 2:
  Email: family2@test.symbiot.care
  Password: FamilyTest123!
  Role: family_member

Healthcare Provider:
  Email: doctor@test.symbiot.care
  Password: DoctorTest123!
  Role: healthcare_provider

Limited Access User:
  Email: limited@test.symbiot.care
  Password: LimitedTest123!
  Role: family_member
  Note: Access to only 1 person
```

### Sample Device Data
```json
{
  "device_id": "TEST-HR-001",
  "device_type": "wearable",
  "data_type": "heart_rate",
  "value": {"bpm": 72},
  "recorded_at": "2025-01-12T10:00:00Z"
}

{
  "device_id": "TEST-BP-001",
  "device_type": "health_monitor",
  "data_type": "blood_pressure",
  "value": {"systolic": 120, "diastolic": 80, "unit": "mmHg"},
  "recorded_at": "2025-01-12T10:00:00Z"
}

{
  "device_id": "TEST-GPS-001",
  "device_type": "gps",
  "data_type": "gps",
  "value": {"latitude": 40.7128, "longitude": -74.0060, "accuracy": 10},
  "recorded_at": "2025-01-12T10:00:00Z"
}
```

---

## Test Schedule

### Phase 1: Unit & Integration Testing (Week 1-2)
- Execute all automated unit tests
- Integration tests for API calls
- Component integration tests
- Generate coverage reports (target: 80%)

### Phase 2: Functional Testing (Week 3-5)
- **Week 3**: Authentication, Dashboard, Device Management (46 test cases)
- **Week 4**: Alerts, Activity, Indoor Tracking (40 test cases)
- **Week 5**: Outdoor Tracking, Data Sharing, Profile (26 test cases)
- Log all defects
- Regression testing for fixes

### Phase 3: Security & Data Validation Testing (Week 6)
- Security penetration tests (10 test cases)
- Data validation tests (8 test cases)
- SQL injection, XSS, CSRF tests
- Password security tests
- Authorization tests

### Phase 4: UI/UX & Real-time Testing (Week 7)
- Responsive design tests (10 test cases)
- Real-time update tests (5 test cases)
- Accessibility tests
- Cross-browser tests
- Performance tests (see separate plan)

### Phase 5: User Acceptance Testing (Week 8)
- Real user testing (5-10 users)
- Usability feedback sessions
- Issue resolution
- Final adjustments

### Phase 6: Regression & Pre-Production (Week 9)
- Full regression test suite
- Smoke testing in staging
- Final security scan
- Performance validation
- Go/No-Go decision

---

## Defect Management

### Defect Severity Levels
- **Critical**: System crash, data loss, security breach, core feature broken
- **High**: Major feature broken, workaround difficult, affects multiple users
- **Medium**: Feature partially works, workaround available, isolated issue
- **Low**: Minor issue, cosmetic, easy workaround, documentation error

### Defect Priority Levels
- **P1 - Immediate**: Fix immediately, blocks testing
- **P2 - High**: Fix in current sprint
- **P3 - Medium**: Fix in next sprint
- **P4 - Low**: Fix when time permits

### Defect Lifecycle
```
New → Assigned → In Progress → Fixed → Testing → Verified → Closed
                                   ↓
                               Reopened (if not fixed properly)
```

### Defect Template
```
ID: DEF-001
Title: Dashboard fails to load when no devices connected
Severity: High
Priority: P2
Module: Dashboard
Test Case: TC-DASH-013

Steps to Reproduce:
1. Login as user with no devices assigned
2. Navigate to dashboard
3. Observe error

Expected Result: Dashboard loads with "No devices" message
Actual Result: White screen, console error: "Cannot read property 'length' of undefined"

Environment: Chrome 120.0.6099.109, Windows 11
Reproducible: Yes (100%)
Assigned To: John Dev
Reporter: Jane QA
Status: New
Attachments: screenshot.png, console-log.txt

Root Cause: [To be filled by developer]
Fix: [To be filled by developer]
```

---

## Test Metrics

### Key Metrics to Track

#### Test Execution Metrics
- **Total Test Cases**: 120
- **Test Cases Executed**: X
- **Test Cases Passed**: X
- **Test Cases Failed**: X
- **Test Cases Blocked**: X
- **Test Pass Rate**: (Passed / Executed) * 100%
- **Target Pass Rate**: ≥ 95%

#### Defect Metrics
- **Total Defects Found**: X
- **Critical Defects**: X
- **High Defects**: X
- **Medium Defects**: X
- **Low Defects**: X
- **Defect Density**: Defects / KLOC (thousands of lines of code)
- **Defect Leakage**: Production defects / Total defects
- **Target Leakage**: < 5%

#### Coverage Metrics
- **Code Coverage**: X%
- **Target**: ≥ 80% for unit tests
- **Functional Coverage**: (Features tested / Total features) * 100%
- **Target**: 100% for critical features

#### Performance Metrics
- **Average Response Time**: X ms
- **95th Percentile Response Time**: X ms
- **Target**: < 200ms (API), < 2s (page load)

#### Time Metrics
- **Mean Time to Detect (MTTD)**: Average time to find defect
- **Mean Time to Repair (MTTR)**: Average time to fix defect
- **Test Execution Time**: Total time for test suite

### Exit Criteria
✅ All 120 test cases executed
✅ 95%+ test pass rate achieved
✅ Zero Critical/High severity defects open
✅ 80%+ code coverage
✅ All security vulnerabilities addressed
✅ Performance benchmarks met
✅ Accessibility WCAG 2.1 AA compliant
✅ Cross-browser testing complete
✅ UAT sign-off received
✅ Documentation complete
✅ Deployment runbook ready

---

## Test Automation

### Automated Test Examples

#### Unit Test (Vitest + React Testing Library)
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { VitalMetrics } from './VitalMetrics';

describe('VitalMetrics Component', () => {
  it('TC-DASH-004: displays heart rate in normal range', () => {
    const vitals = { heartRate: 72 };
    render(<VitalMetrics vitals={vitals} />);

    expect(screen.getByText(/72/i)).toBeInTheDocument();
    expect(screen.getByText(/bpm/i)).toBeInTheDocument();
    expect(screen.getByTestId('heart-rate-status')).toHaveClass('status-normal');
  });

  it('TC-DASH-005: shows warning for elevated heart rate', () => {
    const vitals = { heartRate: 105 };
    render(<VitalMetrics vitals={vitals} />);

    expect(screen.getByTestId('heart-rate-status')).toHaveClass('status-warning');
    expect(screen.getByRole('img', { name: /warning/i })).toBeInTheDocument();
  });

  it('TC-DASH-006: shows critical alert for very high heart rate', async () => {
    const vitals = { heartRate: 140 };
    const onAlert = vi.fn();
    render(<VitalMetrics vitals={vitals} onAlert={onAlert} />);

    expect(screen.getByTestId('heart-rate-status')).toHaveClass('status-critical');
    await waitFor(() => {
      expect(onAlert).toHaveBeenCalledWith({ type: 'heart_rate', value: 140, severity: 'critical' });
    });
  });

  it('TC-DASH-007: displays message when data is missing', () => {
    const vitals = { heartRate: null };
    render(<VitalMetrics vitals={vitals} />);

    expect(screen.getByText(/no recent data/i)).toBeInTheDocument();
  });
});
```

#### E2E Test (Playwright)
```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication Tests', () => {
  test('TC-AUTH-005: successful login with valid credentials', async ({ page }) => {
    // Navigate to login page
    await page.goto('https://symbiot.care/login');

    // Enter credentials
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await expect(page).toHaveURL(/dashboard/);

    // Verify dashboard elements visible
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page.locator('[data-testid="stats-overview"]')).toBeVisible();

    // Verify user menu shows logged in state
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('TC-AUTH-006: login fails with invalid email', async ({ page }) => {
    await page.goto('https://symbiot.care/login');

    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');

    // Should stay on login page
    await expect(page).toHaveURL(/login/);

    // Error message shown
    await expect(page.locator('.error-message')).toContainText(/invalid credentials/i);

    // No JWT token should be stored
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeNull();
  });

  test('TC-AUTH-011: logout functionality', async ({ page, context }) => {
    // Login first
    await page.goto('https://symbiot.care/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Logout');

    // Verify redirected to login
    await expect(page).toHaveURL(/login/);

    // Verify cookies cleared
    const cookies = await context.cookies();
    const authCookie = cookies.find(c => c.name === 'auth_token');
    expect(authCookie).toBeUndefined();

    // Verify cannot access dashboard without login
    await page.goto('https://symbiot.care/dashboard');
    await expect(page).toHaveURL(/login/);
  });
});
```

#### API Test (REST Client / Newman)
```javascript
// TC-AUTH-005: Login API Test
pm.test("Login with valid credentials returns 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Login returns JWT token", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('access_token');
    pm.expect(jsonData).to.have.property('refresh_token');
    pm.expect(jsonData.access_token).to.be.a('string').and.not.empty;

    // Store token for subsequent requests
    pm.environment.set("auth_token", jsonData.access_token);
});

pm.test("Token expiration is set", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('expires_in');
    pm.expect(jsonData.expires_in).to.be.above(0);
});

// TC-AUTH-006: Login with invalid credentials
pm.test("Login with invalid email returns 401", function () {
    pm.response.to.have.status(401);
});

pm.test("Error message is clear", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('error');
    pm.expect(jsonData.error).to.include('Invalid credentials');
});

// TC-DASH-001: Get dashboard statistics
pm.test("Dashboard stats endpoint returns 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Stats contain all required fields", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('monitored_persons_count');
    pm.expect(jsonData).to.have.property('active_alerts_count');
    pm.expect(jsonData).to.have.property('average_heart_rate');
    pm.expect(jsonData).to.have.property('activity_level');
});
```

---

## Appendix

### Test Glossary
- **Smoke Test**: Quick test to verify critical functionality works
- **Sanity Test**: Quick test of specific functionality after minor changes
- **Regression Test**: Re-testing after changes to ensure no new bugs introduced
- **UAT**: User Acceptance Testing by end users
- **SIT**: System Integration Testing
- **E2E**: End-to-End testing
- **API**: Application Programming Interface testing
- **UI/UX**: User Interface / User Experience testing

### References
- React Testing Library: https://testing-library.com/react
- Playwright: https://playwright.dev
- Vitest: https://vitest.dev
- OWASP Testing Guide: https://owasp.org/www-project-web-security-testing-guide
- WCAG 2.1: https://www.w3.org/WAI/WCAG21/quickref

### Test Case Traceability Matrix
A traceability matrix linking requirements to test cases is maintained separately in: `TEST_TRACEABILITY_MATRIX.xlsx`

---

## Summary

This comprehensive test plan covers **120 test cases** across **13 modules**:

| # | Module | Test Cases |
|---|--------|------------|
| 1 | Authentication & Authorization | 16 |
| 2 | Dashboard Functionality | 15 |
| 3 | Device Management | 15 |
| 4 | Alert Management | 15 |
| 5 | Activity Monitoring | 10 |
| 6 | Indoor Tracking | 10 |
| 7 | Outdoor Tracking | 10 |
| 8 | Data Sharing | 8 |
| 9 | User Profile & Settings | 8 |
| 10 | Security & Permissions | 10 |
| 11 | Data Validation | 8 |
| 12 | Real-time Updates | 5 |
| 13 | UI/UX & Responsive Design | 10 |
| **Total** | | **120** |

All test cases include:
- ✅ Test case ID
- ✅ Priority level
- ✅ Test type
- ✅ Preconditions
- ✅ Detailed steps
- ✅ Expected results
- ✅ Test data (where applicable)

---

*Document Version: 2.0.0*
*Last Updated: 2025-01-12*
*Next Review: 2025-02-12*
*Total Test Cases: 120*
