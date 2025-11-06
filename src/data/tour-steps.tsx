import { Step } from 'react-joyride';

// Dashboard Tour Steps
export const dashboardTourSteps: Step[] = [
  {
    target: 'body',
    content: (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Welcome to SymBIoT! 👋</h3>
        <p>Let's take a quick tour to help you get started with monitoring and caring for your loved ones.</p>
        <p className="text-sm text-muted-foreground">You can skip this tour at any time or restart it later from your profile settings.</p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="stats-overview"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">Quick Stats Overview</h4>
        <p>These cards show you key metrics at a glance:</p>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>Number of persons you're monitoring</li>
          <li>Active alerts requiring attention</li>
          <li>Average heart rate across all persons</li>
          <li>Overall activity level</li>
        </ul>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="elderly-list"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">Monitored Persons</h4>
        <p>Select a person here to view their specific vital metrics, medications, and environmental data.</p>
        <p className="text-sm text-muted-foreground">The list shows everyone you have access to monitor based on your role.</p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-tour="vital-metrics"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">Vital Metrics</h4>
        <p>Monitor real-time health data including heart rate, blood pressure, oxygen levels, and more.</p>
        <p className="text-sm text-muted-foreground">Click "View Charts" to see historical trends and patterns.</p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-tour="alerts-list"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">Active Alerts</h4>
        <p>Critical alerts appear here requiring your attention.</p>
        <p className="text-sm">Click "Acknowledge" to mark alerts as seen. Visit the Alerts page for full history and analytics.</p>
      </div>
    ),
    placement: 'left',
  },
];

// Activity Dashboard Tour Steps
export const activityTourSteps: Step[] = [
  {
    target: 'body',
    content: (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Activity Dashboard 📊</h3>
        <p>Track movement patterns, dwell times, and activity deviations from ideal profiles.</p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="date-range-selector"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">Date Range Selection</h4>
        <p>Choose a time period to analyze activity patterns - today, this week, or a custom date range.</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="movement-summary"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">Movement Summary</h4>
        <p>See total steps, distance traveled, active minutes, and calories burned.</p>
        <p className="text-sm text-muted-foreground">These metrics help you understand overall activity levels.</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="dwell-time-analysis"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">Dwell Time Analysis</h4>
        <p>View time spent in each location/zone with visual indicators:</p>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li><span className="text-primary font-medium">Blue:</span> Normal range</li>
          <li><span className="text-warning font-medium">Yellow:</span> Minor deviation (10-20%)</li>
          <li><span className="text-destructive font-medium">Red:</span> Significant deviation (&gt;20%)</li>
        </ul>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '[data-tour="ideal-profile-manager"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">Ideal Profile Manager</h4>
        <p>Create baseline activity patterns to monitor deviations:</p>
        <ol className="text-sm space-y-1 list-decimal list-inside">
          <li>Create a new profile</li>
          <li>Use "Use Current as Baseline" to capture typical activity</li>
          <li>Adjust min/max thresholds</li>
          <li>Activate to start monitoring</li>
        </ol>
        <p className="text-sm text-muted-foreground mt-2">The system will alert you when actual patterns deviate significantly.</p>
      </div>
    ),
    placement: 'top',
  },
];

// Alerts Page Tour Steps
export const alertsTourSteps: Step[] = [
  {
    target: 'body',
    content: (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Alert Management 🚨</h3>
        <p>View, filter, and respond to all system alerts with detailed analytics and trends.</p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="alert-stats"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">Alert Statistics</h4>
        <p>Quick overview of alert metrics:</p>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>Total alerts in selected period</li>
          <li>Active alerts needing attention</li>
          <li>Critical alerts requiring immediate action</li>
          <li>Average response time</li>
        </ul>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="alert-filters"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">Filter & Search</h4>
        <p>Narrow down alerts by:</p>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>Search terms (person name, alert description)</li>
          <li>Severity level (Critical, High, Medium, Low)</li>
          <li>Alert type (Vital Signs, Panic/SOS, Device, etc.)</li>
          <li>Status (Active, Acknowledged, Resolved)</li>
          <li>Date range</li>
        </ul>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="alert-charts"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">Analytics & Trends</h4>
        <p>Visual insights into alert patterns:</p>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>Alert trends over time</li>
          <li>Distribution by type</li>
          <li>Severity breakdown</li>
        </ul>
        <p className="text-sm text-muted-foreground">Use these to identify patterns and improve care strategies.</p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '[data-tour="alert-timeline"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">Alert Timeline</h4>
        <p>Detailed list of all alerts with full information.</p>
        <p className="text-sm">Click "Acknowledge" to mark active alerts as reviewed. This helps track response times and accountability.</p>
      </div>
    ),
    placement: 'top',
  },
];

// Device Status Tour Steps
export const deviceTourSteps: Step[] = [
  {
    target: 'body',
    content: (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Device Management 📱</h3>
        <p>Monitor all connected devices, their status, and recent data transmissions.</p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="device-person-list"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">Select Person</h4>
        <p>Choose which person's devices you want to view and manage.</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="device-status-cards"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">Device Status Cards</h4>
        <p>Each card shows:</p>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li><span className="text-success font-medium">Online:</span> Connected and transmitting</li>
          <li><span className="text-warning font-medium">Offline:</span> No recent data</li>
          <li>Last data received timestamp</li>
          <li>Battery level (if available)</li>
        </ul>
        <p className="text-sm text-muted-foreground mt-2">Click "View History" to see detailed data logs.</p>
      </div>
    ),
    placement: 'top',
  },
];

// Navigation Tour (shown on first load regardless of page)
export const navigationTourSteps: Step[] = [
  {
    target: '[data-tour="nav-dashboard"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">Dashboard</h4>
        <p>Your main overview - vital metrics, alerts, and quick access to key information.</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="nav-activity"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">Activity</h4>
        <p>Track movement patterns, dwell times, and deviations from ideal behavior profiles.</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="nav-tracking"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">Tracking</h4>
        <p>View real-time location with indoor floor plans and outdoor GPS tracking with geofences.</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="nav-alerts"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">Alerts</h4>
        <p>Full alert management with filtering, analytics, and response tracking.</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="nav-devices"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">Devices</h4>
        <p>Monitor all connected devices, their status, and data transmission history.</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="user-menu"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">User Menu</h4>
        <p>Access your profile, settings, and restart this tour anytime.</p>
      </div>
    ),
    placement: 'bottom',
  },
];
