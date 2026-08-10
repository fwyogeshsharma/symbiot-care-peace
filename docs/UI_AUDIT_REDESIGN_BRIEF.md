# SymBIoT — UI Audit & Redesign Brief

A working map of every screen in the SymBIoT elder-care platform — what each page is for, how it's built, and where the current UI works against itself. Written as a starting point for a redesign, not a verdict on the product.

**Scope:** 32 routed pages, React 18 + Vite + Tailwind + shadcn/ui, web + Capacitor (iOS/Android), 5 user roles. Compiled by reading every routed page under `src/pages/` on the `main` branch. Scope is UI structure and interaction patterns, not visual design opinion — the goal is a shared starting map before redesign work begins.

## Contents

1. [Concept & roles](#concept--roles)
2. [Design system today](#design-system-today)
3. [Navigation model](#navigation-model)
4. [Page catalog](#page-catalog)
   - [Public & marketing](#public--marketing) (6)
   - [Legal](#legal) (4)
   - [Auth](#auth) (1)
   - [Core app home](#core-app-home) (4)
   - [Monitoring & insight](#monitoring--insight) (6)
   - [Devices, places & care](#devices-places--care) (5)
   - [Admin & operations](#admin--operations) (6)
5. [Redesign opportunities](#redesign-opportunities)
6. [Route appendix](#route-appendix)

---

## Concept & roles

SymBIoT is a remote elder-care monitoring platform. A caregiver, family member, or the elderly person themself connects sensors and devices around a living space — health wearables, bed/toilet activity pads, indoor positioning, GPS, environmental sensors, cameras — and the app turns that stream into something a non-technical family member can read: vitals, movement patterns, medication adherence, and a single composite wellbeing number called the **ILQ Score**. Almost every screen pivots around one question: *how is this specific person doing right now, and is anything worth worrying about?*

### Core objects the UI is built from

- **Elderly Person** — The monitored individual. Almost every page starts by picking one via the recurring `ElderlyList` picker — it appears on 7+ different pages as the de facto "context switcher" for the whole app.
- **ILQ Score (Independent Living Quotient)** — A single 0–100 composite blended from vitals (30%), physical activity (25%), cognitive function (15%), environmental safety (15%), emergency response (10%) and social engagement (5%). It's the app's one number that's meant to answer "how are they doing" at a glance, and it appears on the Dashboard, Health, Movement, and a dedicated Analytics page.
- **Devices & pairing** — Wearables and home sensors that sync data in; a person's own devices sync automatically, while a caregiver's view shows a pairing-approval flow instead.
- **Floor plans & zones** — A drawn map of the home used to translate raw indoor-positioning data into "time spent in kitchen / bedroom / bathroom," dwell-time-vs-baseline comparisons, and movement heatmaps.
- **Alerts & SOS** — Threshold breaches (falls, panic button, dwell-time anomalies, missed medication) surfaced as a live toast/dialog and collected into a searchable alert log.
- **Data sharing** — Permission control over who — which relative, which caregiver — can see a given person's data. Deliberately withheld from the caregiver role itself.

### Who uses it

| Role | Description |
|---|---|
| **Elderly** | Self-monitoring |
| **Caregiver** | Professional/assigned carer |
| **Relative** | Family member, remote |
| **Admin** | Platform operator |
| **Super admin** | Account & access control |
| **Public** | Pre-signup visitor |

Role shapes what a page shows more than it shapes navigation: the same header and route set is reachable by nearly everyone, and pages self-gate content in the render body (e.g. caregivers are redirected out of Data Sharing; only super_admin sees User Management). That's worth deciding explicitly in a redesign — today, "can I get here" and "will I see anything useful once I do" are answered in two different, inconsistent places per page.

---

## Design system today

Tokens live in `src/index.css` as HSL custom properties, consumed through Tailwind (`tailwind.config.ts`) and shadcn/ui's Radix-based components. It's a real token system with light/dark themes — the issue in practice (see the catalog below) is that a large minority of pages bypass it with one-off hex values instead of reaching for these variables.

### Color tokens (product palette, light / dark)

| Token | Light (HSL) | Dark (HSL) | Used for |
|---|---|---|---|
| `--background` | 210 20% 98% | 215 30% 12% | Page canvas |
| `--primary` | 200 95% 45% | 200 95% 55% | "Calming healthcare blue" — nav, primary buttons, active states |
| `--secondary` | 150 60% 50% | 150 60% 45% | "Wellness green" — positive/secondary emphasis |
| `--accent` | 35 100% 55% | 35 100% 50% | Warm amber — notifications, highlights |
| `--success` | 150 60% 50% | 150 60% 45% | Same value as secondary — no distinct success hue |
| `--warning` | 35 100% 55% | 35 100% 50% | Same value as accent — no distinct warning hue |
| `--destructive` | 0 85% 60% | 0 85% 55% | Errors, delete/block actions |
| `--muted` | 210 20% 95% | 215 25% 20% | Subtle fills, disabled states |
| `--border` | 210 20% 88% | 215 25% 24% | Card/input borders |

> `success` and `warning` alias directly onto `secondary` and `accent` — there's no color in the token set reserved purely for status semantics, which is part of why status meaning gets re-invented ad hoc per page (see [Redesign opportunities](#redesign-opportunities)).

### Type & shape

- **Body face:** Inter, system-ui — all body copy, labels, buttons
- **Headings:** same Inter family, semibold — no distinct display face
- **Radius:** `--radius: 0.75rem` (cards −2px, inputs −4px)
- **Shadow:** `shadow-sm/md/lg`, tinted with the primary hue at 8–16% opacity

**Component layer:** shadcn/ui over Radix primitives (dialog, dropdown, tabs, accordion, etc.), Recharts for all charting, react-hook-form + zod for forms, Tailwind utility classes throughout. This gives the app a coherent baseline component kit — the fragmentation documented below is almost entirely at the *page-composition* level, not the component-primitive level.

---

## Navigation model

One persistent header (`src/components/layout/Header.tsx`) drives the entire authenticated app: a flat item plus three grouped dropdowns on desktop, flattened into a single scrollable sheet menu on mobile/tablet (below the `lg` breakpoint). Marketing and legal pages mostly opt out and build their own nav bar instead (flagged below).

```
Dashboard

Vital ▾
 ├─ Health          /health
 └─ Movement        /movement-dashboard

Insights ▾
 ├─ Mobility        /tracking
 ├─ Reports         /reports
 └─ Alerts          /alerts

Settings ▾
 ├─ Devices         /device-status
 └─ Data Sharing    /data-sharing   (hidden for caregivers)

Help (F1)
Profile / avatar
```

**Not in the header at all:** Customize Dashboard, Medication, ILQ Analytics, Floor Plan Management, Platform Metrics, and the full Admin section — each is reached only from buttons buried inside other pages (Dashboard, Profile, Device Status). That's a real gap for a redesign to close: several frequently-used destinations have no persistent entry point.

---

## Page catalog

### Public & marketing

Pre-signup pages. Notably, five of these six build their own header/nav instead of reusing the shared `Header` — the first fork in the app's chrome consistency.

#### Landing page — `/`
**Purpose:** First impression and sign-up funnel: hero, six feature cards, closing CTA band.
**Layout:** Own nav → full-bleed image hero with gradient overlay → 6-card feature grid (1/2/3 col) → gradient CTA band → Footer.
**Key elements:** Logo icon that plays an audio clip on hover; feature cards each in a differently-colored icon badge (healthcare gradient, wellness gradient, accent, primary, secondary, warning).
**Actions:** Log in, get started / go to dashboard, scroll to features, switch language.
**Mobile:** Hero type scales 3xl→6xl; tagline and CTA label hidden below `sm` unless logged in.
**Worth flagging:**
- First feature card has different padding/icon-size breakpoints than the other five — visible copy-paste drift.
- Hover-triggered logo audio is undiscoverable and meaningless on touch devices.
- Six unrelated color treatments for six peer feature cards, with no evident system behind the choice.

#### Pricing — `/pricing`
**Purpose:** Compare subscription tiers and start a trial.
**Layout:** Own sticky nav → hero with monthly/yearly toggle → 3-card tier grid (center card scaled up) → "all plans include" strip → static FAQ blocks → Footer.
**Key elements:** Hand-rolled toggle switch (not the shadcn Switch), checkmarked feature lists per tier, 4 "includes" tiles that all reuse the same icon.
**Actions:** Toggle billing period, start trial / get started, go home.
**Mobile:** Grid `sm:2-col → lg:3-col`; type scales at `sm`/`lg`.
**Worth flagging:**
- Bespoke nav bar and a bespoke toggle switch, both re-implementing components the design system already has.
- Static FAQ text here duplicates the dedicated (accordion-based) FAQ page in a different format for the same content type.

#### Investor info — `/investor-info`
**Purpose:** Pitch-deck-style page arguing market problem, solution, tech, ROI and business model.
**Layout:** Own nav → ~10 stacked sections (Problem → Current limitations → Our solution → Tech enablers → ROI → Market → Why now → Business model → closing CTA) → Footer.
**Key elements:** ~24 distinct icons, pill "section badges," gradient rounded-3xl wrappers; each section carries its own accent color (red/orange/green/blue/purple/emerald).
**Actions:** `mailto:` links for demo/investment inquiry, anchor-scroll to Problem, nav to Pricing/Home/Auth.
**Mobile:** Grids collapse `md:2-col / lg:3–4-col`; text scales at `md`.
**Worth flagging:**
- Six hardcoded accent colors across ten sections read as a stitched-together slide deck rather than one page with a point of view.
- Colors are literal Tailwind utilities (`bg-red-600`, `bg-emerald-600`…), not design tokens — this page will actively resist any re-theme.
- The same "pill + heading + card grid" rhythm repeats ~8 times with only the color swapped.
- Primary CTAs are raw `mailto:` links — no trackable form.

#### FAQ — `/faq`
**Purpose:** Self-serve support via categorized, expandable Q&A.
**Layout:** Sticky header + back → 10 category sections, each an accordion pulled from i18n content → closing "still have questions" CTA box → Footer.
**Key elements:** 10 independent accordion groups, category headings, bordered CTA panel.
**Actions:** Expand/collapse questions, email support, go to dashboard.
**Mobile:** Content capped `max-w-5xl`; no other explicit handling.
**Worth flagging:**
- Ships a `<Link to="/dashboard">` without importing `Link` — a real render bug, not just a styling note.
- No search across 10 categories / dozens of questions — pure scroll-and-scan.
- Its "need help" CTA box is duplicated verbatim on Supported Devices — a clear shared-component candidate.

#### Supported devices — `/supported-devices`
**Purpose:** Lists integrated hardware manufacturers, category, price range and purchase link.
**Layout:** Sticky header + back → error/loading states → single Table (logo, company, device type, price, link) → "need help" CTA box → Footer.
**Key elements:** Skeleton loaders, company logo images with icon fallback, external website links.
**Actions:** Visit manufacturer site, contact support, go to dashboard.
**Mobile:** Content capped `max-w-7xl`; table has no explicit horizontal-scroll wrapper.
**Worth flagging:**
- Company names, prices and website URLs are hardcoded in the component instead of read from the device records already fetched — new hardware silently won't appear until code changes.
- A dense admin-style Table for what's otherwise a product-showcase page; no device imagery or card layout.

#### 404 — `*`
**Purpose:** Catch-all for unknown URLs.
**Layout:** Full-height centered block — "404," message, two buttons — Footer below.
**Actions:** Go home, go back.
**Worth flagging:**
- Uses hardcoded `bg-gray-100 dark:bg-gray-900` instead of the theme's own background token — the one page that visibly breaks from the palette.
- No illustration or brand personality; a missed, low-cost opportunity for warmth given the audience.

### Legal

Four routes sharing one unwritten template — worth treating as a single reusable shell in any redesign rather than four separate builds. All share the same shell: sticky header with a back button and title, a `max-w-4xl` "prose" column of numbered sections, and a muted contact box at the end.

| Page | Route | Sections | Distinct feature |
|---|---|---|---|
| Privacy Policy | `/privacy-policy` | 9 | Plain text only, no callouts |
| Terms of Service | `/terms-of-service` | 13 | One hardcoded yellow "medical disclaimer" callout |
| Cookie Policy | `/cookie-policy` | 8 | Per-browser instructions as bolded plain-text lines |
| Liability Disclaimer | `/liability-disclaimer` | 14 | Densest page in the app: 4+ differently-styled callouts (red/yellow/blue), a numbered emergency protocol, an acknowledgment banner |

**Worth flagging:**
- No shared "LegalPageLayout" component exists — the identical shell is copy-pasted four times.
- Each page invents its own callout styling ad hoc (`bg-yellow-50`, `bg-red-50`, `bg-blue-50`, each with a different border treatment) rather than one severity component reused everywhere.
- All four are long, un-navigable walls of text — no table of contents or anchors across 8–14 sections each.
- Genuinely important safety content ("this is not a medical device," "call emergency services directly") is buried on the Liability page rather than surfaced anywhere more visible in the product.

### Auth

The single gate everyone passes through, carrying disproportionate weight for a one-file page.

#### Login / signup — `/auth`
**Purpose:** One page handling login, signup, forgot-password and reset-password.
**Layout:** Centered card on a gradient background; mode-dependent form; Google SSO divider; mode-toggle link; a separate confirmation dialog for role selection.
**Key elements:** 11-field signup form (email, password ×2, name, phone, year of birth, address, city, state, zone, country) plus a role Select (caregiver/elderly/relative); "self-monitoring" confirmation dialog; Google SSO button.
**Actions:** Sign in/up, forgot/reset password, toggle mode, toggle password visibility (4 independent fields), Google OAuth, confirm role.
**Mobile:** Dialog footer stacks `flex-col sm:flex-row`; otherwise one fixed-width card.
**Worth flagging:**
- An 11-field signup form as one unbroken scroll, with no step/wizard structure — heavy for a platform whose own users skew elderly.
- Four near-identical booleans exist purely to toggle password visibility on four fields — should be one reusable control.
- A silent third-party geocoding call fires on submit with no loading feedback.
- The role-confirmation dialog fires for elderly/relative but not caregiver, with no visible reason why.

### Core app home

The screens a logged-in user lands on and returns to most. Dashboard and Health currently overlap enough to raise a real information-architecture question.

#### Dashboard — `/dashboard`
**Purpose:** Primary home screen — a user-customizable roll-up of a selected person's key widgets.
**Layout:** Heading row → person picker → 2/3 + 1/3 grid: left = vitals, full metrics, charts, three movement views, dwell-time; right = ILQ widget, medication, environment, panic/SOS, alerts — each individually toggleable, empty-state card if none enabled.
**Key elements:** Up to 11 optional widgets, config-driven visibility, expandable health-charts dialog.
**Actions:** Select person, open charts dialog, go to Customize Dashboard.
**Mobile:** Grid collapses to one column below `lg`; the "Customize Dashboard" button is hidden below `sm` (fixed today so it stops crowding the page heading).
**Worth flagging:**
- Fully config-driven length with no internal anchors — a fully-loaded dashboard is a very long, unstructured scroll.
- One widget (full health metrics) renders unconditionally while every sibling is gated by the customization system — breaks the page's own "customizable" premise.
- Leftover debug `console.log`s live in the layout-selection logic.

#### Health — `/health`
**Purpose:** A second home-style overview: KPI strip, vitals, and the same right-column widgets as Dashboard, plus toilet-health insights.
**Layout:** 4-tile KPI row (monitored persons / active alerts / avg heart rate / activity level) → 2/3 + 1/3 grid: left = person picker, vitals, toilet-health insights; right = medication, environment, panic/SOS, alerts.
**Key elements:** 4 tooltipped KPI cards, real-time alert popup wired to a live subscription, toast for emergency SOS.
**Actions:** Select person, acknowledge an incoming alert, read KPI tooltips.
**Mobile:** KPI grid 2-col mobile / 4-col desktop.
**Worth flagging:**
- Nearly duplicates Dashboard's entire right column verbatim — the distinction between "Dashboard" and "Health" as separate destinations isn't legible from the UI itself.
- "Avg heart rate" and "activity level" KPIs quietly compute from only the last 10 readings / 24 hours, with no caveat shown.

#### Profile — `/profile`
**Purpose:** Edit personal details and act as the catch-all settings hub.
**Layout:** Bespoke local header (not the shared one) → profile card (avatar, name, role badge, editable fields) → settings card (language, customize dashboard, restart tour, user management for super_admin, sign out) separated by a divider.
**Key elements:** Avatar upload, color-coded role badge, disabled inputs for immutable fields, a flat list of full-width buttons.
**Actions:** Edit/save/cancel, upload avatar, switch language, jump to Customize Dashboard or User Management, restart onboarding tour, sign out.
**Mobile:** Header button labels collapse; avatar/name row stacks.
**Worth flagging:**
- Builds its own header instead of the shared `Header` used on every other authenticated page — the most visible chrome inconsistency in the app.
- The elderly role badge hardcodes `#228B22` inline while every other role uses class-based tokens — a direct token violation sitting right next to correct usage.
- Account edits, dashboard config, help, admin tools and destructive sign-out sit in one flat list with no grouping or "danger zone" treatment.

#### Customize dashboard — `/customize-dashboard`
**Purpose:** Choose which of 11 widgets appear on the Dashboard.
**Layout:** Preview/Edit toggle → 4/12 sticky "available components" list + 8/12 "dashboard preview" of enabled components (full width in Preview mode) → sticky Save/Reset bar.
**Key elements:** 11 predefined component definitions (icon, name, category), compact rows for unadded items, larger placeholder cards for enabled items.
**Actions:** Add/remove components, toggle preview mode, save, reset to default.
**Mobile:** Grid collapses to one column; sticky panels may behave awkwardly at small sizes.
**Worth flagging:**
- The "preview" is a generic gray placeholder box per widget, not the real component — undercutting the page's core promise before a user even saves.
- Available vs. enabled components use two visually different card styles for what is conceptually a single on/off toggle.
- A `category` field is modeled on every component but never used for grouping or filtering anywhere in the UI.

### Monitoring & insight

The analytical depth of the app — and where the most duplication and density accumulate.

#### Movement dashboard — `/movement-dashboard`
**Purpose:** Deep dive into activity patterns: dwell time vs. an "ideal" baseline, bed/toilet sensor activity, timeline and heatmap.
**Layout:** Date-range select → person picker → ILQ widget → hub-device cards → movement summary → dwell-time-vs-baseline → ideal-profile manager → timeline + heatmap → bed-pad and toilet-seat sections. Supports hash-anchor deep links.
**Key elements:** 8+ stacked sections, two device cards, ideal-profile manager, multiple charts.
**Actions:** Pick person, change date range, manage ideal profile, follow hash-anchored links.
**Worth flagging:**
- One of the longest pages in the app — 8+ vertically stacked sections with no tabs or sub-nav, relying entirely on scroll plus hash anchors.
- Real-time deviation-checking logic runs as a side effect inside the page component rather than a hook — a code-health note that also means the page's behavior is hard to reason about from the UI alone.
- Substantially overlaps the Indoor tab of Tracking (same summary/timeline/heatmap/dwell-time for the same person) under a different page name.

#### Tracking — `/tracking`
**Purpose:** Unified location page combining indoor positioning, outdoor GPS/geofencing, and cameras.
**Layout:** Person picker → three tabs. Indoor: floor-plan grid + list + playback, movement metrics, zone-visit table. Outdoor: GPS map with geofence circles/trail, geofence timeline and manager. Cameras: camera grid.
**Key elements:** Tab switcher, mini-map with trail, playback scrubber, zone table, GPS map, camera grid, several empty/skeleton states.
**Actions:** Switch tabs, pick person, change date range, edit/delete floor plan, scrub playback, manage geofences.
**Worth flagging:**
- Bundles three conceptually different feature sets — sensor-based indoor tracking, GPS/maps, and live video — under one generic "Tracking" label.
- Its Indoor tab duplicates `IndoorTracking.tsx` almost line for line (see below).

#### Indoor tracking — *unrouted, dead code*
**Purpose (as authored):** A standalone indoor-tracking view: floor plan, playback, zone history for one person.
**Status:** No `<Route>` exists for this file in `App.tsx` and nothing imports it — it is dead code, functionally superseded by the Indoor tab inside Tracking.
**Worth flagging:**
- Unreachable in the live app yet duplicates ~80% of Tracking's Indoor tab — flagging so no redesign effort gets spent on a screen no user can open. Recommend deleting outright rather than carrying it forward.

#### Alerts — `/alerts`
**Purpose:** Central alert triage and analytics — browse, filter, acknowledge, and trend across every monitored person.
**Layout:** 4-card KPI row → filter card (search + 4 selects) → 2×2 chart grid (trend line, type pie, severity bar, recipients) → scrollable timeline of individual alerts with acknowledge action.
**Key elements:** Search, 4 filter selects, three Recharts visualizations, a 600px-tall scrollable timeline.
**Actions:** Search/filter, acknowledge an active alert.
**Worth flagging:**
- Meaningful text-cleanup logic (normalizing alert types, rounding embedded numbers, translating device names) lives directly in the page — a sign the underlying alert data isn't clean at the source and the UI is quietly patching it.
- The type-breakdown pie chart uses a single 7-shade red palette for every alert *type*, so nothing is visually differentiated by meaning — everything reads as "danger."
- KPIs, filters, three charts, a recipients list and a full timeline all compete on one screen with no separation between "analyze" and "triage."

#### Reports — `/reports`
**Purpose:** Generate, preview and export reports; manage recurring email subscriptions.
**Layout:** Filter card (person, date range, quick presets) → 8-tab category switcher (Daily/Health/Activity/Sleep/Medication/Alerts/Wellness/Comparative) → ~20 uniform report cards per set of tabs → report-viewer dialog → subscription manager.
**Key elements:** 8 tabs, ~20 individual report cards, calendar popover, generate/export actions per card.
**Actions:** Filter, pick a date preset, switch category, generate/preview/export a report, export a whole category, manage subscriptions.
**Worth flagging:**
- ~20 report "products" across 8 categories are all rendered as uniform small cards with no visual priority — flat and repetitive; a list or table view would likely scan faster.
- "Export all" is implemented with hardcoded sleep timers (2.5s render wait, 1.5s per export, 1s between exports) to work around async chart rendering — invisible to the user beyond sequential toasts, no real progress indicator.
- A single hidden dialog is reused and reopened for every generate/export action, meaning PDF export depends on that dialog fully rendering before capture — a fragile pattern worth solving properly rather than restyling.

#### ILQ analytics — `/ilq-analytics`
**Purpose:** Deep analytics for the ILQ composite score — trends, component breakdown, related alert history.
**Layout:** Person select + 4 actions → 3 summary cards (ILQ widget, 7-day trend, active alerts) → 3 tabs: Historical Trends (multi-line chart), Component Breakdown (radar chart + detail list), Alerts History.
**Key elements:** Line chart, radar chart, colored component blocks, auto-refresh toggle, download/share report.
**Actions:** Pick person, compute current ILQ, backfill historical scores, toggle 10-second auto-refresh, download/share report, switch tabs/range.
**Worth flagging:**
- Four top-level actions (Compute / Calculate Historical / Auto-refresh / Download) sit in one wrapped row with no grouping — "Compute" and "Calculate Historical" read as near-duplicates to a first-time user.
- Auto-refresh silently polls a backend function every 10 seconds with no "last updated" indicator.
- The same component scores are shown three separate times on one screen — the widget, the radar chart, and the detail list — a redundant presentation of identical numbers.

### Devices, places & care

The operational layer: pairing hardware, mapping the home, and running medication schedules.

#### Device status — `/device-status`
**Purpose:** Connectivity and pairing status for a selected person's devices.
**Layout:** Status legend tooltip + admin shortcuts → person picker → one of two mutually exclusive panels (own-device sync, or caregiver pairing-approval) → device status grid.
**Actions:** Select person, sync own devices or approve pairing requests, (admin) jump to platform metrics/device types.
**Worth flagging:**
- Swaps between two entirely different panels (own profile vs. caregiver view) with no visible label telling the user which mode they're in.
- Admin-only navigation shortcuts are inlined into an otherwise regular monitoring page.

#### Data sharing — `/data-sharing`
**Purpose:** Manage who can see a person's health data. (Elderly / relative / admin only.)
**Layout:** Thin wrapper around a `DataSharing` feature component; caregivers are redirected to Dashboard with an "access denied" fallback card if they land here anyway.
**Worth flagging:**
- The caregiver role-gate is implemented twice — a redirect effect plus a duplicate render-time check — for one restriction.

#### Floor plan management — `/floor-plan-management`
**Purpose:** Create, edit metadata for, and delete floor plans per person.
**Layout:** 1/4 person list + 3/4 content: create button, 2-col card grid of floor plans (name, dimensions, grid size, zone count, 3 actions).
**Actions:** Create, edit metadata (dialog), open zone editor, delete (with confirmation).
**Worth flagging:**
- Each card carries three visually similar small buttons (labeled "Edit Zones," icon-only "Edit," icon-only "Delete") — easy to misclick given how similar they look.
- "Edit Zones" (a full page navigation) and "Edit" (an inline dialog) use nearly the same verb for very different flows.

#### Floor plan editor — `/floor-plan-editor/:elderlyPersonId/:floorPlanId`
**Purpose:** Full-screen canvas for drawing zones/furniture and setting a background reference image.
**Layout:** Thin toolbar (back, name, dimensions) → full-height zone-editing canvas.
**Worth flagging:**
- Nearly the entire design surface lives inside the canvas component itself — a real redesign needs that editor reviewed directly, not just this shell.
- The only tracking-related page without an onboarding tour — inconsistent first-time-user coverage.

#### Medication config — `/medication-config`
**Purpose:** Configure medication schedules and review adherence history; manages native reminder notifications on the mobile app.
**Layout:** Person select + actions (native-only reminder toggle, add medication) → 2 tabs (Schedules / Adherence Log) → add/edit dialog.
**Actions:** Select person, toggle native reminders, add/edit medication, switch tabs.
**Worth flagging:**
- Nontrivial scheduling logic (looping over times, "already past today → tomorrow" date math, full cancel-and-reschedule) lives directly in the page rather than a hook or service.
- The reminders toggle is entirely invisible on web with no explanation shown — reads as a missing feature rather than an intentional native-only capability.

### Admin & operations

Staff-facing tooling. Access control is inconsistent across this section — worth resolving alongside, not after, any visual redesign.

#### Admin dashboard — `/admin/dashboard` *(admin · super admin)*
**Purpose:** Top-level operational summary of platform usage, subscribers, sensors and performance.
**Layout:** KPI strip → 2-col grid of 4 chart cards (users/subscribers/profiles/sensors) → 3-col grid of 3 more (platform/sensor/performance metrics).
**Worth flagging:**
- Two differently-shaped grids stacked under a mid-page subheading read as two dashboards glued together rather than one designed layout.
- No filtering, date range, or tabs despite spanning very different KPI domains in one long scroll.

#### Platform metrics — `/platform-metrics` *(admin, not enforced in code)*
**Purpose:** Live snapshot of system-wide health — devices, throughput, alerts, users, uptime.
**Layout:** 5-card stat grid → 2 tabs (System Overview / Device Health, the latter a plain list, not a table).
**Actions:** Trigger metric recomputation, switch tabs.
**Worth flagging:**
- 5 cards in a 3-column grid leaves an orphaned, uneven last row.
- Device health is hand-built with flex divs while every other admin page uses the Table component — an inconsistent pattern for the same kind of data.

#### Device types — `/admin/device-types` *(admin, no role check in code)*
**Purpose:** CRUD for device type categories that models and data configs attach to.
**Layout:** Add-type dialog → table (icon, name, code, category, frequency, status, 3 icon-only actions).
**Worth flagging:**
- No page-level role gate — any authenticated user can reach this and its two child pages by URL alone, unlike Admin Dashboard and User Management.
- The form field is labeled "Icon (Emoji)" but the rendering logic actually resolves it as a Lucide icon *name* — the input and the display logic disagree on what's expected.
- Three icon-only, tooltip-only action buttons per row are hard to discover, especially on touch.

#### Device type data configs — `/admin/device-types/:deviceTypeId/configs` *(admin, no role check in code)*
**Purpose:** Defines the data fields a device type reports and how sample data is generated for it.
**Layout:** Table (order, type, display name, unit, value type, sample-config preview, actions) → add/edit dialog.
**Worth flagging:**
- Admins must hand-write raw JSON in a plain textarea to configure sample data — a developer-facing interaction that should be a structured form.
- The table renders truncated raw JSON inline, which becomes unreadable once configs get non-trivial.

#### Device models — `/admin/device-types/:deviceTypeId/models` *(admin, no role check in code)*
**Purpose:** Manages purchasable device products under a device type, including manufacturer and supported data types.
**Layout:** Table → a 9-field add/edit dialog that includes a nested "add company" dialog and a raw-JSON specifications field.
**Worth flagging:**
- Longest single form in the app: a dialog-within-a-dialog pattern (add model → add company) is easy to lose context in.
- Device image is a raw URL text field — no upload control or live thumbnail preview.
- Same raw-JSON-textarea pattern for specifications as the data-configs page — a duplicated developer-facing interaction.

#### User management — `/admin/user-management` *(super admin only)*
**Purpose:** View all platform users; block, delete, wipe data, or reset passwords.
**Layout:** Table (name, email, phone, role, status, joined, up to 4 actions) → confirmation dialog → password-reset dialog.
**Actions:** Block/unblock, delete account, wipe device/health data, reset password (auto-generate or type, then copy).
**Worth flagging:**
- The password-reset field is an unmasked `type="text"` input — a plaintext credential visible on screen, a concern beyond styling.
- Up to four destructive/irreversible actions (block, delete data, delete account, reset password) carry nearly equal visual weight — only color subtly signals severity.
- No search, filter, or pagination — the table lists every user in the system at once.
- Uses the bare default header while every sibling admin page passes a title/back button — inconsistent chrome within the same section.

---

## Redesign opportunities

Pulled from the patterns above and grouped by theme. These are the things worth deciding once, at the system level, rather than re-solving per page during a visual redesign.

### 1. Unify page chrome
- **Index, Pricing, Investor Info, all 4 legal pages, FAQ, Supported Devices** — each builds its own header/nav bar instead of the shared `Header` used everywhere else.
- **Profile** — the one authenticated page with a fully bespoke local header.
- **User Management** — the one admin page not passing a title/back button to the shared header, unlike its four siblings.

### 2. Give status meaning its own color, separate from decoration
- `--success` and `--warning` currently alias directly onto `--secondary` and `--accent` in the token file — there's no color reserved purely for status.
- **Profile** hardcodes `#228B22` inline for one role badge next to correctly-tokenized role colors.
- **Investor Info** hardcodes six literal Tailwind colors across ten sections.
- **Legal pages** each invent their own callout coloring (yellow/red/blue) instead of one severity component.
- **Alerts** uses a single red palette for every alert *type*, so nothing is differentiated by meaning.
- **Device Types, Platform Metrics** — status/category badge colors are hardcoded JS lookups rather than token-driven.

### 3. Retire duplicate and dead surfaces before redesigning them
- **Indoor Tracking** is unrouted dead code that duplicates ~80% of Tracking's Indoor tab — delete, don't redesign.
- **Movement Dashboard vs. Tracking's Indoor tab** — largely the same summary/timeline/heatmap/dwell-time content under two different destinations.
- **Dashboard vs. Health** — the entire right-column widget stack (medication, environment, panic/SOS, alerts) is duplicated verbatim between the two most-visited pages in the app.

### 4. Break up long, single-scroll pages
- **Movement Dashboard** — 8+ stacked sections, navigable only by scroll and hash anchors.
- **Alerts** — KPIs, filters, three charts, a recipients list and a full timeline compete on one screen.
- **Reports** — ~20 uniform cards across 8 tabs with no visual priority.
- **Legal pages** — 8 to 14 sections each with no table of contents.
- **Investor Info** — ~10 heavy sections with no in-page navigation.

### 5. Make previews and automation actually show their work
- **Customize Dashboard** — the "preview" is a generic gray box per widget, not the real component.
- **Reports** — "export all" relies on hardcoded sleep timers with no real progress indicator.
- **ILQ Analytics** — a 10-second auto-refresh polls silently with no "last updated" signal.

### 6. Move developer-facing controls out of admin UI
- **Device Type Data Configs, Device Models** — admins hand-write raw JSON in plain textareas for sample data and specifications; both should be structured forms.
- **Device Types** — an "Icon (Emoji)" field that's actually parsed as a Lucide component name.

### 7. Resolve access control alongside the redesign, not after it
- **Device Types, Device Type Data Configs, Device Models** — reachable by any logged-in user via direct URL; no role gate exists in code, unlike Admin Dashboard and User Management.
- **User Management** — the password-reset dialog displays the new password in an unmasked text field.

### 8. Componentize what already repeats
- The `ElderlyList` person-picker appears on 7+ pages as the app's de facto context switcher — worth promoting to a first-class, consistently-placed pattern.
- The loading-spinner markup, the "need help" CTA box (FAQ + Supported Devices), and the admin table/dialog/alert-dialog scaffold (all three device-admin pages) are each hand-repeated rather than shared.

> **In-progress note:** `src/components/dashboard/DiseaseRiskInsights.tsx` exists in the repo but isn't yet wired into Dashboard or Health — worth deciding where it lands in the widget system above before it's plugged in, rather than bolting it onto the current layout.

---

## Route appendix

| Route | Page | Access |
|---|---|---|
| `/` | Index | Public |
| `/auth` | Auth | Public |
| `/dashboard` | Dashboard | Protected |
| `/health` | Health | Protected |
| `/profile` | Profile | Protected |
| `/device-status` | DeviceStatusPage | Protected |
| `/data-sharing` | DataSharingPage | Protected (not caregiver) |
| `/movement-dashboard` | MovementDashboard | Protected |
| `/alerts` | Alerts | Protected |
| `/tracking` | Tracking | Protected |
| *(unrouted)* | IndoorTracking | Dead code |
| `/admin/device-types` | DeviceTypesManagement | Protected (no role check) |
| `/admin/device-types/:id/configs` | DeviceTypeDataConfigs | Protected (no role check) |
| `/admin/device-types/:id/models` | DeviceModelsManagement | Protected (no role check) |
| `/admin/user-management` | UserManagement | super_admin only |
| `/admin/dashboard` | AdminDashboard | admin / super_admin |
| `/floor-plan-management` | FloorPlanManagement | Protected |
| `/floor-plan-editor/:elderlyPersonId/:floorPlanId` | FloorPlanEditor | Protected |
| `/platform-metrics` | PlatformMetrics | Protected (no role check) |
| `/pricing` | Pricing | Public |
| `/investor-info` | InvestorInfo | Public |
| `/ilq-analytics` | ILQAnalytics | Protected |
| `/medication-config` | MedicationConfig | Protected |
| `/reports` | Reports | Protected |
| `/customize-dashboard` | CustomizeDashboard | Protected |
| `/privacy-policy` | PrivacyPolicy | Public |
| `/terms-of-service` | TermsOfService | Public |
| `/liability-disclaimer` | LiabilityDisclaimer | Public |
| `/cookie-policy` | CookiePolicy | Public |
| `/faq` | FAQ | Public |
| `/supported-devices` | SupportedDevices | Public |
| `*` | NotFound | Public |
