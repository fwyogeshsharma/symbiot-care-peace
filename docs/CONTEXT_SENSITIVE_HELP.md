# SymBIoT Platform - Context-Sensitive Help System

**Version:** 1.0.0
**Last Updated:** 2025-01-12
**Document Type:** User Assistance Documentation

---

## Table of Contents

1. [Overview](#overview)
2. [Help System Architecture](#help-system-architecture)
3. [Help Components](#help-components)
   - [Help Panel](#help-panel)
   - [Help Tooltips](#help-tooltips)
   - [Onboarding Tours](#onboarding-tours)
4. [Help Content Catalog](#help-content-catalog)
5. [Implementation Guide](#implementation-guide)
6. [User Guide](#user-guide)
7. [Maintenance and Updates](#maintenance-and-updates)
8. [Accessibility](#accessibility)

---

## Overview

### Purpose

The SymBIoT platform includes a comprehensive context-sensitive help system designed to provide users with immediate, relevant assistance without leaving the current page or workflow. This system reduces the learning curve, improves user experience, and increases user confidence when navigating the platform.

### Key Features

- **Context-Aware Help**: Automatically surfaces relevant help topics based on the current page
- **Interactive Guided Tours**: Step-by-step walkthroughs for first-time users
- **Inline Tooltips**: Quick explanations for specific UI elements and features
- **Searchable Help Database**: Full-text search across all help topics
- **Quick Action Links**: One-click access to common tasks
- **Multi-Level Help**: Ranges from brief tooltips to detailed explanations
- **Non-Intrusive**: Help is available but doesn't interrupt workflow

### Design Principles

1. **Contextual**: Help is relevant to the current task or page
2. **Progressive Disclosure**: Information is revealed in layers (tooltip → panel → external docs)
3. **Discoverable**: Help icons and panels are easy to find
4. **Non-Blocking**: Users can dismiss or ignore help without consequence
5. **Persistent**: Tour progress and preferences are saved
6. **Accessible**: Help works with screen readers and keyboard navigation

---

## Help System Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    SymBIoT Help System                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Help Panel   │  │ Help Tooltip │  │ Onboarding   │    │
│  │ Component    │  │ Component    │  │ Tour         │    │
│  │              │  │              │  │ Component    │    │
│  │ - Search     │  │ - Inline     │  │ - Joyride    │    │
│  │ - Topics     │  │ - Icon       │  │ - Steps      │    │
│  │ - Quick Links│  │ - Popover    │  │ - Progress   │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                  │                  │            │
│         └──────────┬───────┴──────────────────┘            │
│                    │                                        │
│         ┌──────────▼──────────┐                            │
│         │  Help Content Data  │                            │
│         │                     │                            │
│         │  - help-content.ts  │                            │
│         │  - tour-steps.tsx   │                            │
│         └─────────────────────┘                            │
│                                                             │
│  Used Throughout Application:                              │
│  - Dashboard                                               │
│  - Activity Monitoring                                     │
│  - Alerts Management                                       │
│  - Device Management                                       │
│  - Location Tracking                                       │
│  - Data Sharing                                            │
│  - Floor Plan Management                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|----------|
| **Help Panel** | React + Shadcn UI | Slide-out help panel with search |
| **Tooltips** | Radix UI Tooltip | Accessible tooltip popovers |
| **Tours** | React Joyride | Interactive guided tours |
| **Icons** | Lucide React | Help icons (HelpCircle) |
| **State** | LocalStorage | Tour progress persistence |
| **Navigation** | React Router | Page-aware help content |

### File Structure

```
src/
├── components/
│   └── help/
│       ├── HelpPanel.tsx           # Main help side panel
│       ├── HelpTooltip.tsx         # Inline tooltip component
│       ├── HelpTopicCard.tsx       # Help topic display card
│       ├── OnboardingTour.tsx      # Guided tour component
│       └── EmptyState.tsx          # Empty state helper
├── data/
│   ├── help-content.ts             # Help topics database
│   └── tour-steps.tsx              # Guided tour definitions
└── pages/
    └── [various].tsx               # Pages using help features
```

---

## Help Components

### Help Panel

#### Overview

The Help Panel is a comprehensive slide-out panel that provides context-aware help topics, search functionality, and quick action links. It automatically detects the current page and surfaces relevant help content.

#### Location

**File**: `src/components/help/HelpPanel.tsx`

#### Features

1. **Context-Aware Topics**
   - Automatically shows help topics relevant to the current page
   - Badge showing number of relevant topics
   - Highlighted display for current-page topics

2. **Search Functionality**
   - Full-text search across all help topics
   - Searches titles, content, and keywords
   - Clear button to reset search
   - Shows result count

3. **Quick Action Links**
   - 6 predefined quick links to common pages
   - Icons and descriptions for each link
   - Special "Restart Tour" action
   - Grid layout for easy access

4. **Categorized Topics**
   - Topics organized by category
   - Accordion UI for browsing
   - Badge showing topic count per category
   - Expandable/collapsible sections

5. **Help Topic Cards**
   - Compact or expanded view modes
   - Title, content preview, and category badge
   - Optional navigation actions
   - Highlighting for relevant topics

6. **Contact Support**
   - Footer section with support email link
   - Always visible at bottom of panel
   - Opens default email client

#### Usage Example

```tsx
import { HelpPanel } from '@/components/help/HelpPanel';
import { useState } from 'react';

function MyComponent() {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
      <button onClick={() => setHelpOpen(true)}>
        Help
      </button>

      <HelpPanel
        open={helpOpen}
        onOpenChange={setHelpOpen}
      />
    </>
  );
}
```

#### Triggering the Help Panel

The Help Panel is typically triggered from the Header component:

- **Desktop**: Help icon button in top-right corner
- **Mobile**: Help icon in navigation menu
- **Keyboard**: Accessible via tab navigation

#### Context Detection

The panel uses React Router's `useLocation` hook to detect the current page:

```typescript
const location = useLocation();
const contextTopics = helpTopics.filter(topic =>
  topic.relatedPages?.includes(location.pathname)
);
```

Supported pages for context-aware help:
- `/dashboard` - Dashboard help
- `/movement-dashboard` - Activity Monitoring help
- `/alerts` - Alerts Management help
- `/device-status` - Device Monitoring help
- `/tracking` - Location Tracking help
- `/indoor-tracking` - Indoor Tracking help
- `/data-sharing` - Data Sharing help

---

### Help Tooltips

#### Overview

Help Tooltips provide inline, contextual help for specific UI elements, form fields, and features. They appear as a small HelpCircle icon that displays a popover with helpful information when hovered or clicked.

#### Location

**File**: `src/components/help/HelpTooltip.tsx`

#### Features

1. **Accessibility**
   - ARIA labels for screen readers
   - Keyboard accessible (focus + Enter/Space)
   - Proper ARIA roles and attributes

2. **Customization**
   - Optional title for the tooltip
   - Main content area (text or React nodes)
   - Optional "Learn more" link to external resources
   - Custom CSS classes

3. **Smart Positioning**
   - Defaults to top placement
   - Automatically adjusts if constrained
   - Max width of 384px (24rem)

4. **Visual Design**
   - Muted HelpCircle icon (4×4 size)
   - Hover effect (color transition)
   - Clean popover design with padding
   - Proper spacing and typography

#### Props Interface

```typescript
interface HelpTooltipProps {
  content: string | React.ReactNode;  // Main help text
  title?: string;                     // Optional title
  learnMoreUrl?: string;              // Optional external link
  className?: string;                 // Custom CSS classes
}
```

#### Usage Examples

**Basic Tooltip:**

```tsx
<HelpTooltip
  content="This is the person you're currently monitoring. Select a different person to view their data."
/>
```

**With Title:**

```tsx
<HelpTooltip
  title="Ideal Profiles"
  content="Create baseline activity patterns to detect deviations from normal behavior. The system will alert you when patterns change significantly."
/>
```

**With Learn More Link:**

```tsx
<HelpTooltip
  title="Dwell Time Analysis"
  content="Dwell time shows how long someone stays in each location. Use this to identify unusual patterns or potential issues."
  learnMoreUrl="https://docs.symbiot.care/dwell-time"
/>
```

**Inline with Label:**

```tsx
<div className="flex items-center gap-2">
  <Label>Profile Name</Label>
  <HelpTooltip content="Give this profile a descriptive name like 'Weekday Baseline' or 'Weekend Pattern'." />
</div>
```

#### Common Use Cases

1. **Form Field Help**
   ```tsx
   <FormField>
     <FormLabel className="flex items-center gap-2">
       Grid Size
       <HelpTooltip content="Size of each grid cell in meters. Smaller values provide finer precision." />
     </FormLabel>
     <FormControl>
       <Input type="number" />
     </FormControl>
   </FormField>
   ```

2. **Feature Explanation**
   ```tsx
   <Card>
     <CardHeader>
       <CardTitle className="flex items-center gap-2">
         Dwell Time Analysis
         <HelpTooltip
           title="What is Dwell Time?"
           content="Dwell time is the amount of time spent in each location or zone during the selected time period."
         />
       </CardTitle>
     </CardHeader>
     {/* ... */}
   </Card>
   ```

3. **Status Indicator Help**
   ```tsx
   <Badge variant={status === 'online' ? 'success' : 'warning'}>
     {status}
     <HelpTooltip content={
       status === 'online'
         ? "Device is connected and transmitting data."
         : "Device hasn't sent data in the last 15 minutes."
     } />
   </Badge>
   ```

#### Best Practices

1. **Be Concise**: Keep tooltip content brief (1-3 sentences)
2. **Focus on Why**: Explain the purpose or benefit, not just the mechanics
3. **Use Consistently**: Place tooltips in similar locations across the app
4. **Don't Overuse**: Only add tooltips for non-obvious features
5. **Test Accessibility**: Ensure tooltips work with keyboard and screen readers

---

### Onboarding Tours

#### Overview

The Onboarding Tours provide interactive, step-by-step guided walkthroughs of the SymBIoT platform. Using React Joyride, the tours highlight key UI elements and explain their purpose, helping new users get started quickly.

#### Location

**File**: `src/components/help/OnboardingTour.tsx`
**Tour Definitions**: `src/data/tour-steps.tsx`

#### Features

1. **Multiple Tour Types**
   - Navigation Tour (first-time users)
   - Dashboard Tour
   - Activity Monitoring Tour
   - Alerts Management Tour
   - Device Management Tour
   - Location Tracking Tour
   - Data Sharing Tour

2. **Persistent State**
   - Tour completion tracked in localStorage
   - Skip state preserved
   - Automatic first-time detection
   - Restart capability

3. **Smart Routing**
   - Different tours for different pages
   - Automatic tour selection based on route
   - Navigation tour shown first
   - Page-specific tours follow

4. **User Controls**
   - Progress indicator
   - Skip button (persistent)
   - Next/Back navigation
   - Close/Finish options
   - Spotlight on target elements

5. **Customization**
   - Custom styling matching SymBIoT theme
   - Responsive design
   - Overlay dimming
   - Smooth animations

#### Tour Types

##### 1. Navigation Tour

**When Shown**: First-time users on any page
**Steps**: 6 steps
**Focus**: Main navigation elements

Steps:
1. Dashboard navigation link
2. Activity navigation link
3. Tracking navigation link
4. Alerts navigation link
5. Devices navigation link
6. User menu

##### 2. Dashboard Tour

**When Shown**: First visit to Dashboard, or manual restart
**Steps**: 5 steps
**Focus**: Dashboard overview and key metrics

Steps:
1. Welcome message
2. Quick stats overview (4 metric cards)
3. Monitored persons list
4. Vital metrics panel
5. Active alerts list

**Data Tour Attributes**:
- `[data-tour="stats-overview"]`
- `[data-tour="elderly-list"]`
- `[data-tour="vital-metrics"]`
- `[data-tour="alerts-list"]`

##### 3. Activity Monitoring Tour

**When Shown**: First visit to Activity Dashboard
**Steps**: 5 steps
**Focus**: Movement tracking and dwell time analysis

Steps:
1. Activity dashboard introduction
2. Date range selector
3. Movement summary stats
4. Dwell time analysis chart
5. Ideal profile manager

**Data Tour Attributes**:
- `[data-tour="date-range-selector"]`
- `[data-tour="movement-summary"]`
- `[data-tour="dwell-time-analysis"]`
- `[data-tour="ideal-profile-manager"]`

##### 4. Alerts Management Tour

**When Shown**: First visit to Alerts page
**Steps**: 5 steps
**Focus**: Alert filtering and response

Steps:
1. Alert management introduction
2. Alert statistics overview
3. Filter and search controls
4. Analytics and trends charts
5. Alert timeline

**Data Tour Attributes**:
- `[data-tour="alert-stats"]`
- `[data-tour="alert-filters"]`
- `[data-tour="alert-charts"]`
- `[data-tour="alert-timeline"]`

##### 5. Device Management Tour

**When Shown**: First visit to Device Status page
**Steps**: 3 steps
**Focus**: Device monitoring and status

Steps:
1. Device management introduction
2. Person selector
3. Device status cards

**Data Tour Attributes**:
- `[data-tour="device-person-list"]`
- `[data-tour="device-status-cards"]`

##### 6. Location Tracking Tour

**When Shown**: First visit to Tracking page
**Steps**: 8 steps
**Focus**: Indoor and outdoor tracking features

Steps:
1. Movement tracking introduction
2. Indoor/Outdoor tabs
3. Date range selection
4. Floor plan manager
5. Indoor floor plan view
6. Movement playback controls
7. GPS map view
8. Geofence manager

**Data Tour Attributes**:
- `[data-tour="tracking-tabs"]`
- `[data-tour="tracking-date-range"]`
- `[data-tour="floor-plan-manager"]`
- `[data-tour="tracking-floor-plan"]`
- `[data-tour="tracking-playback"]`
- `[data-tour="tracking-map"]`
- `[data-tour="tracking-geofence"]`

##### 7. Data Sharing Tour

**When Shown**: First visit to Data Sharing page
**Steps**: 4 steps
**Focus**: Sharing data with family and caregivers

Steps:
1. Data sharing introduction
2. Grant access form
3. Shared users list
4. Manage individual access

**Data Tour Attributes**:
- `[data-tour="data-sharing-form"]`
- `[data-tour="data-sharing-list"]`
- `[data-tour="data-sharing-actions"]`

#### Usage in Components

**Basic Setup:**

```tsx
import { OnboardingTour, useShouldShowTour } from '@/components/help/OnboardingTour';

function MyPage() {
  const shouldShowTour = useShouldShowTour();

  return (
    <div>
      {/* Add data-tour attributes to elements */}
      <div data-tour="my-element">
        Content
      </div>

      {/* Include tour component */}
      <OnboardingTour />
    </div>
  );
}
```

**Manual Restart:**

```tsx
import { restartTour } from '@/components/help/OnboardingTour';

function ProfileSettings() {
  return (
    <Button onClick={restartTour}>
      Restart Onboarding Tour
    </Button>
  );
}
```

**Custom Tour Trigger:**

```tsx
import { OnboardingTour } from '@/components/help/OnboardingTour';
import { useState } from 'react';

function MyPage() {
  const [runTour, setRunTour] = useState(false);

  return (
    <>
      <Button onClick={() => setRunTour(true)}>
        Start Tour
      </Button>

      <OnboardingTour
        runTour={runTour}
        onComplete={() => setRunTour(false)}
      />
    </>
  );
}
```

#### Adding Data Tour Attributes

To make an element targetable by a tour:

```tsx
// ✅ Correct
<Card data-tour="my-card">
  <CardHeader>...</CardHeader>
</Card>

// ✅ Also works
<div data-tour="stats-overview" className="grid grid-cols-4 gap-4">
  {/* stat cards */}
</div>

// ❌ Don't add to elements that may not render
<div>
  {showStats && (
    <div data-tour="stats">...</div>  // May cause tour errors
  )}
</div>
```

#### Storage Keys

The tour system uses these localStorage keys:

- `symbiot-tour-completed`: Set to `'true'` when user completes any tour
- `symbiot-tour-skipped`: Set to `'true'` when user skips the tour

#### Customization

Tour styling is defined in `OnboardingTour.tsx`:

```typescript
styles={{
  options: {
    primaryColor: 'hsl(var(--primary))',        // Button color
    textColor: 'hsl(var(--foreground))',        // Text color
    backgroundColor: 'hsl(var(--card))',        // Tooltip background
    arrowColor: 'hsl(var(--card))',            // Arrow color
    overlayColor: 'rgba(0, 0, 0, 0.5)',        // Dimming overlay
    zIndex: 10000,                              // Always on top
  },
  tooltip: {
    borderRadius: '0.5rem',
    padding: '1rem',
  },
  // ... more styling
}}
```

---

## Help Content Catalog

### Overview

All help content is centralized in `src/data/help-content.ts`, making it easy to maintain, update, and translate. The content is structured as an array of help topics with associated metadata.

### Data Structure

```typescript
export interface HelpTopic {
  id: string;                    // Unique identifier
  title: string;                 // Display title
  content: string;               // Help text content
  category: string;              // Category for organization
  keywords: string[];            // Search keywords
  relatedPages?: string[];       // Associated routes
  mediaUrl?: string;             // Optional video/GIF URL
  mediaType?: 'video' | 'gif';   // Media type
}
```

### Current Help Topics

#### By Category

| Category | Topics | Description |
|----------|--------|-------------|
| **Getting Started** | 2 | Platform introduction and navigation |
| **Dashboard** | 3 | Dashboard overview and vital metrics |
| **Activity Monitoring** | 3 | Movement tracking and dwell time |
| **Alerts** | 4 | Alert management and severity levels |
| **Devices** | 2 | Device monitoring and types |
| **Tracking** | 3 | Indoor/outdoor tracking and geofences |
| **Data Sharing** | 1 | Sharing data with family |
| **Troubleshooting** | 3 | Common issues and solutions |

**Total Topics**: 21

#### Complete Topic List

##### Getting Started (2 topics)

1. **Getting Started with SymBIoT** (`getting-started`)
   - Introduction to the platform
   - Overview of main features
   - Where to start

2. **Navigating the Platform** (`navigation`)
   - Using the navigation menu
   - Understanding different sections
   - Keyboard shortcuts

##### Dashboard (3 topics)

3. **Understanding the Dashboard** (`dashboard-overview`)
   - Key metrics explanation
   - Dashboard layout
   - Related to: `/dashboard`

4. **Selecting a Person to Monitor** (`selecting-person`)
   - How to switch between persons
   - What happens when selecting
   - Related to: `/dashboard`

5. **Viewing Vital Metrics** (`vital-metrics`)
   - Understanding health data
   - Accessing historical charts
   - Related to: `/dashboard`

##### Activity Monitoring (3 topics)

6. **Activity Dashboard Overview** (`activity-dashboard`)
   - Movement patterns
   - Date range selection
   - Summary statistics
   - Related to: `/movement-dashboard`

7. **Understanding Dwell Time** (`dwell-time`)
   - What is dwell time
   - Color coding (green/yellow/red)
   - Deviation thresholds
   - Related to: `/movement-dashboard`

8. **Creating Ideal Profiles** (`ideal-profiles`)
   - Setting baseline patterns
   - Using current data as baseline
   - Deviation alerts
   - Related to: `/movement-dashboard`

##### Alerts (4 topics)

9. **Managing Alerts** (`alert-management`)
   - Viewing alerts
   - Filtering and search
   - Acknowledging alerts
   - Related to: `/alerts`

10. **Alert Severity Levels** (`alert-severity`)
    - Critical (red) - immediate action
    - High (orange) - urgent
    - Medium (yellow) - review soon
    - Low (gray) - informational
    - Related to: `/alerts`

11. **Types of Alerts** (`alert-types`)
    - Vital Signs alerts
    - Panic/SOS alerts
    - Device Offline alerts
    - Geofence alerts
    - Inactivity alerts
    - Dwell Time alerts
    - Related to: `/alerts`

12. **Acknowledging Alerts** (`acknowledging-alerts`)
    - How to acknowledge
    - Response time tracking
    - Status changes
    - Related to: `/alerts`

##### Devices (2 topics)

13. **Monitoring Devices** (`device-monitoring`)
    - Device status indicators
    - Online vs offline
    - Battery levels
    - Related to: `/device-status`

14. **Understanding Device Types** (`device-types`)
    - Wearables
    - Health monitors
    - Environmental sensors
    - GPS trackers
    - Panic buttons
    - Related to: `/device-status`

##### Tracking (3 topics)

15. **Indoor Tracking with Floor Plans** (`indoor-tracking`)
    - Floor plan viewing
    - Zone creation
    - Movement paths
    - Related to: `/tracking`, `/indoor-tracking`

16. **Outdoor GPS Tracking** (`outdoor-tracking`)
    - GPS location monitoring
    - Location history
    - Map view
    - Related to: `/tracking`

17. **Setting Up Geofences** (`geofences`)
    - Creating boundaries
    - Alert triggers (entry/exit)
    - Radius configuration
    - Related to: `/tracking`

##### Data Sharing (1 topic)

18. **Sharing Data with Family** (`sharing-data`)
    - Granting access
    - Setting permissions
    - Expiration dates
    - Related to: `/data-sharing`

##### Troubleshooting (3 topics)

19. **Device Showing Offline** (`device-offline`)
    - Troubleshooting steps
    - Common causes
    - When to contact support

20. **Missing Data or No Data Shown** (`no-data`)
    - Verification steps
    - Common reasons
    - How to resolve

21. **Alerts Not Appearing** (`alerts-not-showing`)
    - Filter checking
    - Alert configuration
    - Acknowledgment status

### Quick Links

Quick action links in the Help Panel:

| Title | Description | Path | Icon |
|-------|-------------|------|------|
| View Dashboard | See overview of all monitored persons | `/dashboard` | LayoutDashboard |
| Check Active Alerts | Review alerts requiring attention | `/alerts` | AlertTriangle |
| Monitor Activity | Track movement and dwell times | `/movement-dashboard` | Activity |
| View Device Status | Check all connected devices | `/device-status` | Wifi |
| Track Location | View indoor and outdoor tracking | `/tracking` | MapPin |
| Restart Onboarding Tour | Take the guided tour again | `restart-tour` | HelpCircle |

### Search Functionality

The help content supports full-text search across:
- Topic titles
- Content text
- Keywords array

**Search Implementation** (`searchHelpTopics` function):

```typescript
export const searchHelpTopics = (
  query: string,
  topics: HelpTopic[]
): HelpTopic[] => {
  if (!query.trim()) return topics;

  const lowerQuery = query.toLowerCase();

  return topics.filter(topic => {
    const titleMatch = topic.title.toLowerCase().includes(lowerQuery);
    const contentMatch = topic.content.toLowerCase().includes(lowerQuery);
    const keywordMatch = topic.keywords.some(keyword =>
      keyword.toLowerCase().includes(lowerQuery)
    );

    return titleMatch || contentMatch || keywordMatch;
  });
};
```

**Example Searches**:
- "alert" → Returns all alert-related topics (9 results)
- "offline" → Returns device offline troubleshooting (2 results)
- "geofence" → Returns geofence and outdoor tracking topics (2 results)
- "dwell" → Returns dwell time topics (2 results)

---

## Implementation Guide

### For Developers

#### Adding a New Help Topic

**Step 1**: Add topic to `src/data/help-content.ts`

```typescript
export const helpTopics: HelpTopic[] = [
  // ... existing topics
  {
    id: 'my-new-topic',
    title: 'My New Feature',
    content: 'Detailed explanation of the new feature and how to use it effectively.',
    category: 'New Features',  // Or existing category
    keywords: ['feature', 'new', 'functionality', 'guide'],
    relatedPages: ['/my-new-page'],  // Optional
    mediaUrl: 'https://...', // Optional
    mediaType: 'video',      // Optional
  },
];
```

**Step 2**: Test search functionality

```bash
# Start dev server
npm run dev

# Navigate to any page
# Click Help icon
# Search for your new topic
# Verify it appears in results
```

#### Adding a New Onboarding Tour

**Step 1**: Create tour steps in `src/data/tour-steps.tsx`

```tsx
export const myNewPageTourSteps: Step[] = [
  {
    target: 'body',
    content: (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Welcome! 👋</h3>
        <p>Introduction to this page.</p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="my-element"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">Element Title</h4>
        <p>Explanation of this element.</p>
      </div>
    ),
    placement: 'bottom',
  },
  // ... more steps
];
```

**Step 2**: Add tour to `OnboardingTour.tsx`

```typescript
import { myNewPageTourSteps } from '@/data/tour-steps.tsx';

// In the useEffect where tours are selected:
useEffect(() => {
  const path = location.pathname;
  let tourSteps: Step[] = [];

  // ... existing conditions

  // Add your new tour
  if (path === '/my-new-page') {
    tourSteps = myNewPageTourSteps;
  }

  // ... rest of logic
}, [location.pathname, runTour, hasShownWelcome]);
```

**Step 3**: Add data-tour attributes to page components

```tsx
function MyNewPage() {
  return (
    <div>
      <div data-tour="my-element">
        <h1>Important Element</h1>
        {/* Content */}
      </div>

      <div data-tour="another-element">
        {/* More content */}
      </div>

      {/* Include tour component */}
      <OnboardingTour />
    </div>
  );
}
```

#### Adding Help Tooltips

**Basic Tooltip:**

```tsx
import { HelpTooltip } from '@/components/help/HelpTooltip';

function MyComponent() {
  return (
    <div className="flex items-center gap-2">
      <Label>My Field</Label>
      <HelpTooltip content="Explanation of this field." />
    </div>
  );
}
```

**Advanced Tooltip with Title and Link:**

```tsx
<HelpTooltip
  title="Feature Name"
  content={
    <div>
      <p>Detailed explanation with formatting.</p>
      <ul>
        <li>Point 1</li>
        <li>Point 2</li>
      </ul>
    </div>
  }
  learnMoreUrl="https://docs.symbiot.care/feature"
/>
```

#### Integrating Help Panel

The Help Panel is already integrated in the Header component. To add it to a custom page:

```tsx
import { HelpPanel } from '@/components/help/HelpPanel';
import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

function CustomPage() {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div>
      {/* Trigger button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setHelpOpen(true)}
      >
        <HelpCircle className="h-5 w-5" />
      </Button>

      {/* Help panel */}
      <HelpPanel open={helpOpen} onOpenChange={setHelpOpen} />

      {/* Page content */}
      <main>
        {/* ... */}
      </main>
    </div>
  );
}
```

### Best Practices

#### Writing Help Content

1. **Use Clear Language**
   - Avoid jargon
   - Write at 8th-grade reading level
   - Use active voice
   - Be concise

2. **Structure Content**
   - Start with the "what"
   - Follow with the "why"
   - End with the "how"
   - Use lists for steps

3. **Include Keywords**
   - Think about search terms
   - Include synonyms
   - Add common misspellings
   - Use natural language

4. **Keep Current**
   - Update when features change
   - Remove obsolete topics
   - Add version notes if needed
   - Test links regularly

#### Creating Tour Steps

1. **Logical Flow**
   - Start with overview
   - Move left-to-right, top-to-bottom
   - End with next steps
   - Keep under 10 steps

2. **Clear Targeting**
   - Use specific data-tour attributes
   - Avoid targeting dynamic elements
   - Test on different screen sizes
   - Ensure elements are visible

3. **Helpful Content**
   - Explain purpose, not just location
   - Include visual indicators
   - Mention keyboard shortcuts
   - Add tips and tricks

4. **User Control**
   - Always allow skipping
   - Show progress
   - Provide back button
   - Save state

#### Adding Tooltips

1. **Placement Strategy**
   - Tooltips next to labels
   - Avoid blocking content
   - Consistent positioning
   - Test on mobile

2. **Content Guidelines**
   - 1-3 sentences max
   - Focus on benefits
   - Avoid repeating label text
   - Include examples if helpful

3. **Visual Design**
   - Maintain consistent styling
   - Use proper icons
   - Ensure readability
   - Test color contrast

---

## User Guide

### Accessing Help

#### Desktop

1. **Help Panel**
   - Click the Help icon (❓) in the top-right corner of any page
   - The help panel slides in from the right
   - Browse topics or use search

2. **Tooltips**
   - Look for small help icons (❓) next to labels and features
   - Hover over the icon to see the tooltip
   - Click for longer descriptions

3. **Onboarding Tour**
   - Automatically shown on first visit to each page
   - Restart from Profile → Settings → "Restart Tour"
   - Or from Help Panel → "Restart Onboarding Tour"

#### Mobile

1. **Help Panel**
   - Tap the menu icon (≡) in the top-left
   - Select "Help" from the navigation menu
   - Full-screen help panel opens

2. **Tooltips**
   - Tap help icons to show tooltips
   - Tap outside tooltip to dismiss

3. **Tours**
   - Same as desktop, but optimized for touch
   - Larger touch targets
   - Adjusted positioning

### Using the Help Panel

#### Search

1. Click in the search box at the top
2. Type your question or keywords
3. Results appear instantly
4. Click any result to read more or navigate

**Search Tips**:
- Use simple terms ("alerts", "device offline")
- Try synonyms if no results
- Check spelling
- Be specific for better results

#### Browse by Category

1. Scroll down to "Browse by Topic"
2. Click a category to expand
3. View topics in that category
4. Click a topic to read details

**Categories**:
- Getting Started
- Dashboard
- Activity Monitoring
- Alerts
- Devices
- Tracking
- Data Sharing
- Troubleshooting

#### Quick Actions

Six commonly used actions are available as quick links:
- **View Dashboard**: Jump to main dashboard
- **Check Active Alerts**: See alerts requiring attention
- **Monitor Activity**: Open activity monitoring
- **View Device Status**: Check device connections
- **Track Location**: View location tracking
- **Restart Tour**: Replay onboarding walkthrough

#### Context-Aware Help

When you open the Help Panel, it automatically shows topics relevant to the current page:
- On Dashboard → Dashboard help topics
- On Alerts → Alert management topics
- On Devices → Device monitoring topics
- And so on...

### Using Tooltips

#### Desktop

1. **Hover**: Move mouse over help icon (❓)
2. **Read**: Tooltip appears after brief delay
3. **Dismiss**: Move mouse away

#### Mobile

1. **Tap**: Touch help icon
2. **Read**: Tooltip appears
3. **Dismiss**: Tap outside tooltip or tap icon again

### Using the Onboarding Tour

#### First-Time Experience

When you first use SymBIoT:

1. **Navigation Tour**: Shown immediately
   - Introduces main navigation
   - Points out key areas
   - 6 quick steps

2. **Page Tours**: Shown on first visit to each page
   - Dashboard Tour
   - Activity Tour
   - Alerts Tour
   - Devices Tour
   - Tracking Tour
   - Data Sharing Tour

#### Tour Controls

During any tour:
- **Next**: Continue to next step
- **Back**: Return to previous step
- **Skip Tour**: Exit and don't show again
- **Close** (X): Exit current tour

#### Tour Progress

- Progress indicator shows current step (e.g., "3 of 5")
- Completed tours won't show again automatically
- Skipped tours can be restarted anytime

#### Restarting Tours

To replay a tour:

**Method 1 - From Profile**:
1. Click your name in top-right corner
2. Select "Profile"
3. Find "Restart Onboarding Tour" button
4. Click to restart
5. Page reloads and tour begins

**Method 2 - From Help Panel**:
1. Open Help Panel (help icon)
2. Find "Quick Actions" section
3. Click "Restart Onboarding Tour"
4. Page reloads and tour begins

### Getting Additional Help

If you can't find the answer in the help system:

1. **Contact Support**
   - Open Help Panel
   - Scroll to bottom
   - Click "Contact Support"
   - Email opens pre-addressed

2. **Support Channels**
   - Email: support@symbiot.care
   - Phone: +1-800-SYMBIOT
   - Documentation: https://docs.symbiot.care

---

## Maintenance and Updates

### Content Review Schedule

| Frequency | Task | Responsible |
|-----------|------|-------------|
| **Weekly** | Review user feedback | Support Team |
| **Monthly** | Update outdated content | Documentation Team |
| **Quarterly** | Add new feature help | Product + Docs |
| **Per Release** | Update tour steps | QA + Docs |
| **Annually** | Full content audit | Documentation Team |

### Update Process

#### Updating Help Topics

1. **Identify Need**
   - User feedback
   - Feature changes
   - Broken links
   - Outdated screenshots

2. **Edit Content**
   - Open `src/data/help-content.ts`
   - Find topic by ID
   - Update relevant fields
   - Test search still works

3. **Review Changes**
   - Verify accuracy
   - Check grammar/spelling
   - Test on multiple pages
   - Confirm search results

4. **Deploy**
   - Commit changes
   - Create PR
   - Get review
   - Merge and deploy

#### Updating Tour Steps

1. **Identify Changes**
   - UI layout changes
   - New features
   - Removed features
   - Different flow

2. **Edit Tour**
   - Open `src/data/tour-steps.tsx`
   - Update affected steps
   - Update data-tour attributes in components
   - Adjust content and placement

3. **Test Tour**
   - Clear localStorage
   - Test on actual page
   - Verify all targets exist
   - Check on mobile

4. **Deploy**
   - Same process as help topics

#### Adding New Content

**For New Features**:
1. Add help topic to `help-content.ts`
2. Add keywords for search
3. Link to relevant pages
4. Create tour steps if needed
5. Add tooltips to UI
6. Test end-to-end

**For New Pages**:
1. Add page-specific help topics
2. Create full tour for page
3. Add data-tour attributes
4. Include OnboardingTour component
5. Update navigation tour if needed

### Version Control

Help content is versioned with the application:
- Help content changes → minor version bump
- Major tour changes → minor version bump
- Tooltip additions → patch version bump

### Localization

**Current Status**: English only

**Future Plans**:
- Extract all help text to i18n files
- Support for multiple languages
- RTL layout support
- Cultural adaptations

**Preparation**:
- All help text in data files (not hardcoded)
- Separated from UI components
- Easy to extract and translate

---

## Accessibility

### WCAG Compliance

The help system is designed to meet WCAG 2.1 Level AA standards.

#### Keyboard Navigation

| Action | Keyboard Shortcut |
|--------|-------------------|
| Open Help Panel | Tab to help icon, then Enter |
| Navigate tooltips | Tab to help icon, then Enter/Space |
| Dismiss tooltip | Escape |
| Navigate tour | Tab through buttons, Enter to activate |
| Skip tour | Tab to Skip button, Enter |
| Close help panel | Escape |

#### Screen Reader Support

**Help Panel**:
- Proper ARIA labels
- Role: `dialog`
- Focus management
- Announcement of help content

**Tooltips**:
- ARIA label: "Help information"
- Role: `tooltip`
- Associated with trigger button
- Descriptive content

**Tours**:
- ARIA live regions for step changes
- Focus on tooltip when step changes
- Button labels announced
- Progress announced

#### Visual Accessibility

**Color Contrast**:
- Help text: 4.5:1 minimum
- Icons: 3:1 minimum
- Tour highlights: High contrast overlay

**Text Sizing**:
- Respects browser zoom
- Minimum 16px font size
- Scalable with rem units

**Focus Indicators**:
- Visible focus ring
- High contrast outline
- 2px minimum width

### Testing

**Keyboard Only**:
```
✓ Can open help panel with keyboard
✓ Can navigate all help topics
✓ Can search with keyboard only
✓ Can access all tooltips
✓ Can control tours with keyboard
✓ Can close/dismiss all help elements
```

**Screen Reader**:
```
✓ Help icons are announced
✓ Tooltip content is read aloud
✓ Tour steps are announced
✓ Progress is communicated
✓ Search results are announced
✓ No silent UI updates
```

**Visual**:
```
✓ All text meets contrast ratios
✓ Focus indicators are visible
✓ Tooltips are readable at 200% zoom
✓ No information by color alone
✓ Clear visual hierarchy
```

---

## Appendix

### Component APIs

#### HelpPanel Component

```typescript
interface HelpPanelProps {
  open: boolean;                    // Control open state
  onOpenChange: (open: boolean) => void;  // State change handler
}
```

#### HelpTooltip Component

```typescript
interface HelpTooltipProps {
  content: string | React.ReactNode;  // Main content
  title?: string;                     // Optional title
  learnMoreUrl?: string;              // Optional external link
  className?: string;                 // Custom CSS classes
}
```

#### OnboardingTour Component

```typescript
interface OnboardingTourProps {
  runTour?: boolean;                 // Manual trigger
  onComplete?: () => void;           // Completion callback
}

// Hook for conditional rendering
export const useShouldShowTour = (): boolean;

// Function to restart tour
export const restartTour = (): void;
```

### Data-Tour Attributes Reference

All available data-tour attributes used in the application:

**Global Navigation:**
- `data-tour="nav-dashboard"`
- `data-tour="nav-activity"`
- `data-tour="nav-tracking"`
- `data-tour="nav-alerts"`
- `data-tour="nav-devices"`
- `data-tour="user-menu"`

**Dashboard:**
- `data-tour="stats-overview"`
- `data-tour="elderly-list"`
- `data-tour="vital-metrics"`
- `data-tour="alerts-list"`

**Activity Monitoring:**
- `data-tour="date-range-selector"`
- `data-tour="movement-summary"`
- `data-tour="dwell-time-analysis"`
- `data-tour="ideal-profile-manager"`

**Alerts:**
- `data-tour="alert-stats"`
- `data-tour="alert-filters"`
- `data-tour="alert-charts"`
- `data-tour="alert-timeline"`

**Devices:**
- `data-tour="device-person-list"`
- `data-tour="device-status-cards"`

**Tracking:**
- `data-tour="tracking-tabs"`
- `data-tour="tracking-date-range"`
- `data-tour="floor-plan-manager"`
- `data-tour="tracking-floor-plan"`
- `data-tour="tracking-playback"`
- `data-tour="tracking-map"`
- `data-tour="tracking-geofence"`

**Data Sharing:**
- `data-tour="data-sharing-form"`
- `data-tour="data-sharing-list"`
- `data-tour="data-sharing-actions"`

### LocalStorage Keys

| Key | Purpose | Values |
|-----|---------|--------|
| `symbiot-tour-completed` | Track tour completion | `'true'` or absent |
| `symbiot-tour-skipped` | Track tour skip action | `'true'` or absent |

### Help Content Statistics

| Metric | Count |
|--------|-------|
| Total Help Topics | 21 |
| Categories | 8 |
| Quick Links | 6 |
| Tour Types | 7 |
| Total Tour Steps | 36 |
| Pages with Context Help | 7 |
| Average Keywords per Topic | 5.2 |
| Average Content Length | 127 characters |

### Related Documentation

- [Video User Guide](./guides/VIDEO_USER_GUIDE.md) - Comprehensive video scripts
- [Technical Architecture](./architecture/TECHNICAL_ARCHITECTURE.md) - System architecture
- [Test Plan](./testing/TEST_PLAN.md) - Testing documentation
- [Supported Sensors](./SUPPORTED_SENSORS.md) - Device catalog

---

## Changelog

### Version 1.0.0 (2025-01-12)

**Initial Release**:
- Complete context-sensitive help system documentation
- 21 help topics across 8 categories
- 7 guided tour types with 36 total steps
- Help Panel with search and context awareness
- Inline help tooltips throughout application
- Accessibility features and WCAG compliance
- Implementation guide for developers
- User guide for end users
- Maintenance procedures

---

## Contact

**Documentation Feedback**:
- Email: docs@symbiot.care
- Create an issue in the documentation repository

**Technical Support**:
- Email: support@symbiot.care
- Phone: +1-800-SYMBIOT

**Feature Requests**:
- Email: product@symbiot.care
- Submit via Help Panel feedback

---

*Last Updated: 2025-01-12*
*Documentation Version: 1.0.0*
*Platform Version: Compatible with SymBIoT 1.0.x*

---

**Thank you for helping users succeed with SymBIoT! 💙**
