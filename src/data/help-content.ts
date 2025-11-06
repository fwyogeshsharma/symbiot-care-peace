export interface HelpTopic {
  id: string;
  title: string;
  content: string;
  category: string;
  keywords: string[];
  relatedPages?: string[];
}

export interface QuickLink {
  title: string;
  description: string;
  path: string;
  icon?: string;
}

export const helpTopics: HelpTopic[] = [
  // Getting Started
  {
    id: 'getting-started',
    title: 'Getting Started with SymBIoT',
    content: 'SymBIoT is a comprehensive monitoring platform for elderly care. Start by viewing the Dashboard for an overview, then explore Activity tracking, Alerts management, and Device monitoring.',
    category: 'Getting Started',
    keywords: ['start', 'begin', 'introduction', 'overview', 'setup'],
  },
  {
    id: 'navigation',
    title: 'Navigating the Platform',
    content: 'Use the navigation menu to access different sections: Dashboard (overview), Activity (movement patterns), Tracking (location), Alerts (notifications), and Devices (device status).',
    category: 'Getting Started',
    keywords: ['navigate', 'menu', 'pages', 'sections'],
  },

  // Dashboard
  {
    id: 'dashboard-overview',
    title: 'Understanding the Dashboard',
    content: 'The Dashboard shows key metrics at a glance: monitored persons, active alerts, average heart rate, and activity level. Select a person from the list to view their specific vital metrics.',
    category: 'Dashboard',
    keywords: ['dashboard', 'overview', 'metrics', 'stats', 'vital signs'],
    relatedPages: ['/dashboard'],
  },
  {
    id: 'selecting-person',
    title: 'Selecting a Person to Monitor',
    content: 'Click on any person in the "Monitored Persons" list to view their specific data. Their vital metrics, medications, and environmental sensors will update automatically.',
    category: 'Dashboard',
    keywords: ['select', 'person', 'elderly', 'switch', 'choose'],
    relatedPages: ['/dashboard'],
  },
  {
    id: 'vital-metrics',
    title: 'Viewing Vital Metrics',
    content: 'Vital metrics show real-time health data including heart rate, blood pressure, oxygen levels, temperature, and more. Click "View Charts" to see historical trends.',
    category: 'Dashboard',
    keywords: ['vital', 'health', 'heart rate', 'blood pressure', 'metrics'],
    relatedPages: ['/dashboard'],
  },

  // Activity Monitoring
  {
    id: 'activity-dashboard',
    title: 'Activity Dashboard Overview',
    content: 'Track movement patterns, dwell times, and activity deviations. Use the date range selector to analyze different time periods. View summary stats, dwell time analysis, and create ideal profiles.',
    category: 'Activity Monitoring',
    keywords: ['activity', 'movement', 'steps', 'tracking', 'patterns'],
    relatedPages: ['/movement-dashboard'],
  },
  {
    id: 'dwell-time',
    title: 'Understanding Dwell Time',
    content: 'Dwell time is the amount of time spent in each location. Green bars indicate normal range, yellow shows 10-20% deviation, and red indicates significant deviation (>20%) or outside acceptable range.',
    category: 'Activity Monitoring',
    keywords: ['dwell', 'time', 'location', 'zone', 'stay'],
    relatedPages: ['/movement-dashboard'],
  },
  {
    id: 'ideal-profiles',
    title: 'Creating Ideal Profiles',
    content: 'Ideal profiles establish baseline activity patterns. Click "New Profile", use "Use Current as Baseline" to capture typical activity, adjust min/max thresholds, then activate. The system will alert you when patterns deviate significantly.',
    category: 'Activity Monitoring',
    keywords: ['ideal', 'profile', 'baseline', 'pattern', 'normal'],
    relatedPages: ['/movement-dashboard'],
  },

  // Alerts
  {
    id: 'alert-management',
    title: 'Managing Alerts',
    content: 'View all system alerts with filtering by severity, type, status, and date range. Use search to find specific alerts. Click "Acknowledge" to mark alerts as reviewed.',
    category: 'Alerts',
    keywords: ['alert', 'notification', 'warning', 'emergency'],
    relatedPages: ['/alerts'],
  },
  {
    id: 'alert-severity',
    title: 'Alert Severity Levels',
    content: 'Critical (red): Immediate action required (panic button, severe vital anomaly). High (orange): Urgent attention needed. Medium (yellow): Should be reviewed soon. Low (gray): Informational.',
    category: 'Alerts',
    keywords: ['severity', 'critical', 'high', 'medium', 'low', 'priority'],
    relatedPages: ['/alerts'],
  },
  {
    id: 'alert-types',
    title: 'Types of Alerts',
    content: 'Vital Signs: Health metric anomalies. Panic/SOS: Emergency button activation. Device Offline: Device connection lost. Geofence: Location boundary violation. Inactivity: Prolonged inactivity detected. Dwell Time: Unusual time spent in locations.',
    category: 'Alerts',
    keywords: ['type', 'vital signs', 'panic', 'sos', 'geofence', 'device', 'inactivity'],
    relatedPages: ['/alerts'],
  },
  {
    id: 'acknowledging-alerts',
    title: 'Acknowledging Alerts',
    content: 'Click the "Acknowledge" button on active alerts to mark them as reviewed. This tracks response times and shows accountability. Acknowledged alerts move to acknowledged status.',
    category: 'Alerts',
    keywords: ['acknowledge', 'confirm', 'review', 'response'],
    relatedPages: ['/alerts'],
  },

  // Devices
  {
    id: 'device-monitoring',
    title: 'Monitoring Devices',
    content: 'View all connected devices for each person. Online (green): Connected and transmitting. Offline (yellow): No recent data. Check battery levels and last data received timestamps.',
    category: 'Devices',
    keywords: ['device', 'monitor', 'status', 'online', 'offline', 'battery'],
    relatedPages: ['/device-status'],
  },
  {
    id: 'device-types',
    title: 'Understanding Device Types',
    content: 'Common device types include: Wearables (fitness trackers, smartwatches), Health Monitors (blood pressure, glucose meters), Environmental Sensors (temperature, motion detectors), GPS Trackers, and Panic Buttons.',
    category: 'Devices',
    keywords: ['type', 'wearable', 'sensor', 'tracker', 'monitor'],
    relatedPages: ['/device-status'],
  },

  // Tracking
  {
    id: 'indoor-tracking',
    title: 'Indoor Tracking with Floor Plans',
    content: 'View real-time location on uploaded floor plans. Create zones to define areas like bedroom, kitchen, bathroom. Track movement paths and dwell times in each zone.',
    category: 'Tracking',
    keywords: ['indoor', 'floor plan', 'zone', 'location', 'position'],
    relatedPages: ['/tracking', '/indoor-tracking'],
  },
  {
    id: 'outdoor-tracking',
    title: 'Outdoor GPS Tracking',
    content: 'Monitor outdoor location with GPS tracking. Set up geofences to receive alerts when the person enters or exits designated areas. View location history on the map.',
    category: 'Tracking',
    keywords: ['outdoor', 'gps', 'geofence', 'map', 'location'],
    relatedPages: ['/tracking'],
  },
  {
    id: 'geofences',
    title: 'Setting Up Geofences',
    content: 'Geofences are virtual boundaries. Click "Add Geofence" on the map, draw the boundary, set a name and radius. Choose alert triggers (entry, exit, or both). Receive notifications when boundaries are crossed.',
    category: 'Tracking',
    keywords: ['geofence', 'boundary', 'zone', 'area', 'perimeter'],
    relatedPages: ['/tracking'],
  },

  // Data Sharing
  {
    id: 'sharing-data',
    title: 'Sharing Data with Family',
    content: 'Share monitoring data with family members or other caregivers. Use the Data Sharing page to manage who has access to which person\'s data. Set permissions and expiration dates.',
    category: 'Data Sharing',
    keywords: ['share', 'family', 'access', 'permission', 'invite'],
    relatedPages: ['/data-sharing'],
  },

  // Troubleshooting
  {
    id: 'device-offline',
    title: 'Device Showing Offline',
    content: 'If a device shows offline: 1) Check if the device is powered on. 2) Ensure it\'s within range of the network. 3) Check battery level. 4) Try restarting the device. 5) Contact support if issue persists.',
    category: 'Troubleshooting',
    keywords: ['offline', 'not working', 'connection', 'problem', 'issue'],
  },
  {
    id: 'no-data',
    title: 'Missing Data or No Data Shown',
    content: 'If you see no data: 1) Verify the correct person is selected. 2) Check the date range. 3) Ensure devices are connected and transmitting. 4) Refresh the page. 5) Verify you have access permissions.',
    category: 'Troubleshooting',
    keywords: ['no data', 'missing', 'empty', 'blank', 'not showing'],
  },
  {
    id: 'alerts-not-showing',
    title: 'Alerts Not Appearing',
    content: 'If expected alerts aren\'t showing: 1) Check alert filters (severity, type, status, date range). 2) Clear search terms. 3) Verify alert settings are configured. 4) Check if alerts were already acknowledged.',
    category: 'Troubleshooting',
    keywords: ['alert', 'notification', 'missing', 'not showing'],
  },
];

export const quickLinks: QuickLink[] = [
  {
    title: 'View Dashboard',
    description: 'See overview of all monitored persons',
    path: '/dashboard',
    icon: 'LayoutDashboard',
  },
  {
    title: 'Check Active Alerts',
    description: 'Review alerts requiring attention',
    path: '/alerts',
    icon: 'AlertTriangle',
  },
  {
    title: 'Monitor Activity',
    description: 'Track movement and dwell times',
    path: '/movement-dashboard',
    icon: 'Activity',
  },
  {
    title: 'View Device Status',
    description: 'Check all connected devices',
    path: '/device-status',
    icon: 'Wifi',
  },
  {
    title: 'Track Location',
    description: 'View indoor and outdoor tracking',
    path: '/tracking',
    icon: 'MapPin',
  },
  {
    title: 'Restart Onboarding Tour',
    description: 'Take the guided tour again',
    path: 'restart-tour',
    icon: 'HelpCircle',
  },
];

export const categorizeTopics = (topics: HelpTopic[]) => {
  const categories: Record<string, HelpTopic[]> = {};
  
  topics.forEach(topic => {
    if (!categories[topic.category]) {
      categories[topic.category] = [];
    }
    categories[topic.category].push(topic);
  });
  
  return categories;
};

export const searchHelpTopics = (query: string, topics: HelpTopic[]): HelpTopic[] => {
  if (!query.trim()) return topics;
  
  const lowerQuery = query.toLowerCase();
  
  return topics.filter(topic => {
    // Search in title, content, and keywords
    const titleMatch = topic.title.toLowerCase().includes(lowerQuery);
    const contentMatch = topic.content.toLowerCase().includes(lowerQuery);
    const keywordMatch = topic.keywords.some(keyword => 
      keyword.toLowerCase().includes(lowerQuery)
    );
    
    return titleMatch || contentMatch || keywordMatch;
  });
};
